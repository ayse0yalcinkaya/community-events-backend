// Libraries
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { plainToInstance } from 'class-transformer';

// DTOs
import { CreateChatMessageDto } from '../dto/request/create-chat-message.dto';
import { EditChatMessageDto } from '../dto/request/edit-chat-message.dto';
import { GetChatConversationsDto } from '../dto/request/get-chat-conversations.dto';
import { GetChatMessagesDto } from '../dto/request/get-chat-messages.dto';
import { MarkChatMessagesReadDto } from '../dto/request/mark-chat-messages-read.dto';
import {
  ChatConversationSummaryDto,
  ChatMessageResponseDto,
  CounterpartInfoDto,
} from '../dto/response/chat-message.response.dto';
import { ChatGroupMemberResponseDto, ChatGroupResponseDto } from '../dto/response/chat-group.response.dto';
import { ChatParticipantResponseDto } from '../dto/response/chat-participant.response.dto';
import { MarkReadResponseDto } from '../dto/response/mark-read.response.dto';
import { GetChatParticipantsDto } from '../dto/request/get-chat-participants.dto';

// Enums
import {
  ChatConversationTypeEnum,
  ChatGroupRoleEnum,
  ChatMessageStatusEnum,
  ChatParticipantTypeEnum,
} from '@/common/enums';

// Utilities
import { decrypt, encrypt } from '@/common/utils/crypto.util';

// Auth
import { JwtPayload } from '@/modules/auth/interfaces/jwt-payload.interface';

// Services
import { FilesService } from '@/modules/files/services/files.service';
import { S3Service } from '@/modules/files/services/s3.service';
import { PrismaService } from '@/database/prisma.service';

// Interfaces
import type { ChatAttachmentMetadata, ChatMessageMetadata } from '../interfaces/chat-attachment.interface';
import type {
  CreateChatGroupMemberInput,
  CreateChatGroupMessageInput,
  CreateChatMessageInput,
  FetchConversationMessagesOptions,
  GroupConversationRow,
  IChatRepository,
} from '../interfaces/chat-repository.interface';

// Constants
import {
  CHAT_CONVERSATION_DELETED_EVENT,
  CHAT_GROUP_CONVERSATION_DELETED_EVENT,
  CHAT_GROUP_CREATED_EVENT,
  CHAT_GROUP_DELETED_EVENT,
  CHAT_GROUP_MEMBERSHIP_UPDATED_EVENT,
  CHAT_GROUP_MESSAGE_CREATED_EVENT,
  CHAT_GROUP_MESSAGE_DELETED_EVENT,
  CHAT_GROUP_MESSAGE_EDITED_EVENT,
  CHAT_GROUP_OWNER_TRANSFERRED_EVENT,
  CHAT_MESSAGE_CREATED_EVENT,
  CHAT_MESSAGE_DELETED_EVENT,
  CHAT_MESSAGE_EDITED_EVENT,
  CHAT_MESSAGE_READ_EVENT,
} from '../constants/events';

@Injectable()
export class ChatService {
  constructor(
    @Inject('IChatRepository')
    private readonly chatRepository: IChatRepository,
    private readonly filesService: FilesService,
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async sendMessage(
    currentUser: JwtPayload,
    dto: CreateChatMessageDto,
    files?: Express.Multer.File[],
  ): Promise<ChatMessageResponseDto> {
    if (dto.conversationType === ChatConversationTypeEnum.GROUP) {
      return this.sendGroupMessage(currentUser, dto.receiverID, dto, files);
    }

    const senderType = this.resolveParticipantType();
    const { type: receiverType } = await this.resolveReceiver(dto.receiverID);

    const uploadedAttachments = await this.uploadAttachments(currentUser, files, dto.metadata);
    const existingAttachments = await this.resolveExistingAttachments(dto.existingFileIds ?? [], currentUser);
    const combinedAttachments = [...existingAttachments, ...uploadedAttachments];

    const trimmedContent = dto.content?.trim();
    if (!trimmedContent && !combinedAttachments.length) {
      throw new BadRequestException('chat.MESSAGE_BODY_REQUIRED');
    }

    let quotedMetadata: ChatMessageMetadata['quotedMessage'] | undefined;
    if (dto.quotedMessageId) {
      const quoted = await this.chatRepository.findById(dto.quotedMessageId);
      if (!quoted) throw new NotFoundException('chat.QUOTED_MESSAGE_NOT_FOUND');
      quotedMetadata = {
        id: quoted.id,
        content: this.safeDecrypt(quoted.content),
        senderID: quoted.senderID,
        senderType: quoted.sender_type,
      };
    }

    const metadata: ChatMessageMetadata | undefined = this.composeMetadata(
      dto.metadata,
      dto.clientMessageId,
      dto.forwarded,
      quotedMetadata,
    );

    let encryptedContent: string;
    try {
      encryptedContent = encrypt(trimmedContent ?? '');
    } catch (error) {
      throw new InternalServerErrorException('chat.ENCRYPTION_FAILED');
    }

    const payload: CreateChatMessageInput = {
      senderID: currentUser.sub,
      senderType,
      receiverID: dto.receiverID,
      receiverType,
      content: encryptedContent,
      attachment: combinedAttachments.length ? combinedAttachments : null,
      metadata: metadata ?? null,
      status: ChatMessageStatusEnum.PENDING,
    };

    const message = await this.chatRepository.createMessage(payload);
    const response = await this.toResponseDto(message);

    this.eventEmitter.emit(CHAT_MESSAGE_CREATED_EVENT, {
      message: response,
      attachments: combinedAttachments,
      metadata,
      sender: await this.mapSender(currentUser.sub),
    });

    return response;
  }

  async createGroup(
    currentUser: JwtPayload,
    dto: { name: string; memberIDs?: string[] },
  ): Promise<ChatGroupResponseDto> {
    const trimmedName = dto.name?.trim();
    if (!trimmedName) throw new BadRequestException('chat.GROUP_NAME_REQUIRED');

    const group = await this.chatRepository.createGroup({
      name: trimmedName,
      ownerID: currentUser.sub,
      createdBy: currentUser.sub,
    });

    const members: CreateChatGroupMemberInput[] = [
      {
        groupID: group.id,
        userID: currentUser.sub,
        role: ChatGroupRoleEnum.OWNER,
      },
      ...(dto.memberIDs ?? []).map((userID) => ({
        groupID: group.id,
        userID,
        role: ChatGroupRoleEnum.MEMBER,
      })),
    ];

    const persistedMembers = await this.chatRepository.addGroupMembers(members);

    const response = plainToInstance(
      ChatGroupResponseDto,
      { ...group, members: persistedMembers },
      { excludeExtraneousValues: true },
    );

    this.eventEmitter.emit(CHAT_GROUP_CREATED_EVENT, { group: response });
    this.eventEmitter.emit(CHAT_GROUP_MEMBERSHIP_UPDATED_EVENT, {
      groupID: group.id,
      actorID: currentUser.sub,
      action: 'added',
      memberIDs: persistedMembers.map((m) => m.userID),
      timestamp: new Date().toISOString(),
    });

    return response;
  }

  async addGroupMembers(
    currentUser: JwtPayload,
    groupID: string,
    dto: { memberIDs: string[] },
  ): Promise<ChatGroupMemberResponseDto[]> {
    const membership = await this.ensureGroupMember(currentUser, groupID);
    this.ensureGroupAdmin(membership);

    const members = dto.memberIDs.map<CreateChatGroupMemberInput>((userID) => ({
      groupID,
      userID,
      role: ChatGroupRoleEnum.MEMBER,
    }));

    const persisted = await this.chatRepository.addGroupMembers(members);
    this.eventEmitter.emit(CHAT_GROUP_MEMBERSHIP_UPDATED_EVENT, {
      groupID,
      actorID: currentUser.sub,
      action: 'added',
      memberIDs: dto.memberIDs,
      timestamp: new Date().toISOString(),
    });
    return persisted.map((member) =>
      plainToInstance(ChatGroupMemberResponseDto, member, { excludeExtraneousValues: true }),
    );
  }

  async removeGroupMember(currentUser: JwtPayload, groupID: string, memberID: string): Promise<void> {
    const membership = await this.ensureGroupMember(currentUser, groupID);
    this.ensureGroupAdmin(membership);

    const target = await this.chatRepository.findGroupMember(groupID, memberID);
    if (!target) throw new NotFoundException('chat.GROUP_MEMBER_NOT_FOUND');
    if (target.role === ChatGroupRoleEnum.OWNER) throw new BadRequestException('chat.OWNER_CANNOT_BE_REMOVED');

    await this.chatRepository.removeGroupMember(groupID, memberID);
    this.eventEmitter.emit(CHAT_GROUP_MEMBERSHIP_UPDATED_EVENT, {
      groupID,
      actorID: currentUser.sub,
      action: 'removed',
      memberIDs: [memberID],
      timestamp: new Date().toISOString(),
    });
  }

  async leaveGroup(currentUser: JwtPayload, groupID: string): Promise<void> {
    const membership = await this.ensureGroupMember(currentUser, groupID);
    const members = await this.chatRepository.listGroupMembers(groupID);
    const others = members.filter((m) => m.userID !== currentUser.sub);

    if (membership.role === ChatGroupRoleEnum.OWNER) {
      const nextOwner = others.find((m) => m.role === ChatGroupRoleEnum.ADMIN) ?? others.find(() => true);

      if (!nextOwner) throw new BadRequestException('chat.NO_MEMBER_TO_TRANSFER');

      await this.chatRepository.transferOwner(groupID, nextOwner.userID);
      this.eventEmitter.emit(CHAT_GROUP_OWNER_TRANSFERRED_EVENT, {
        groupID,
        fromUserID: currentUser.sub,
        toUserID: nextOwner.userID,
        memberIDs: members.map((m) => m.userID),
      });
    } else if (!others.length) {
      throw new BadRequestException('chat.NO_MEMBER_TO_TRANSFER');
    }

    await this.chatRepository.leaveGroup(groupID, currentUser.sub);
    this.eventEmitter.emit(CHAT_GROUP_MEMBERSHIP_UPDATED_EVENT, {
      groupID,
      actorID: currentUser.sub,
      action: 'left',
      memberIDs: members.map((m) => m.userID),
      timestamp: new Date().toISOString(),
    });
  }

  async renameGroup(currentUser: JwtPayload, groupID: string, name: string): Promise<void> {
    const membership = await this.ensureGroupMember(currentUser, groupID);
    this.ensureGroupAdmin(membership);

    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException('chat.GROUP_NAME_REQUIRED');

    await this.chatRepository.renameGroup(groupID, trimmed);
    const members = await this.chatRepository.listGroupMembers(groupID);
    this.eventEmitter.emit(CHAT_GROUP_MEMBERSHIP_UPDATED_EVENT, {
      groupID,
      actorID: currentUser.sub,
      action: 'renamed',
      name: trimmed,
      memberIDs: members.map((m) => m.userID),
      timestamp: new Date().toISOString(),
    });
  }

  async updateGroupPhoto(
    currentUser: JwtPayload,
    groupID: string,
    file?: Express.Multer.File,
  ): Promise<ChatGroupResponseDto> {
    const membership = await this.ensureGroupMember(currentUser, groupID);
    this.ensureGroupOwner(membership);

    const group = await this.chatRepository.findGroupById(groupID);
    if (!group) throw new NotFoundException('chat.GROUP_NOT_FOUND');

    let photoFileId: string | null = null;

    if (file) {
      const imageMimeAllowlist = ['image/jpeg', 'image/png', 'image/webp'];
      const maxImageSizeBytes = 5 * 1024 * 1024;

      if (!imageMimeAllowlist.includes(file.mimetype)) {
        throw new BadRequestException('chat.UNSUPPORTED_IMAGE_TYPE');
      }
      if (file.size > maxImageSizeBytes) {
        throw new BadRequestException('chat.IMAGE_TOO_LARGE');
      }

      const [savedFile] = await this.filesService.uploadFiles([file], currentUser.sub);
      photoFileId = savedFile.id;
    }

    await this.chatRepository.updateGroupPhoto(groupID, photoFileId);

    const members = await this.chatRepository.listGroupMembers(groupID);
    this.eventEmitter.emit(CHAT_GROUP_MEMBERSHIP_UPDATED_EVENT, {
      groupID,
      actorID: currentUser.sub,
      action: 'photo_updated',
      memberIDs: members.map((m) => m.userID),
      timestamp: new Date().toISOString(),
    });

    const updatedGroup = await this.chatRepository.findGroupByIdWithPhoto(groupID);
    return plainToInstance(
      ChatGroupResponseDto,
      {
        ...updatedGroup,
        members: members.map((m) => ({
          userID: m.userID,
          role: m.role,
          joined_at: m.joined_at,
        })),
      },
      { excludeExtraneousValues: true },
    );
  }

  async getGroupById(currentUser: JwtPayload, groupID: string): Promise<ChatGroupResponseDto> {
    await this.ensureGroupMember(currentUser, groupID);

    const group = await this.chatRepository.findGroupByIdWithPhoto(groupID);
    if (!group) throw new NotFoundException('chat.GROUP_NOT_FOUND');

    const members = await this.chatRepository.listGroupMembers(groupID);

    return plainToInstance(
      ChatGroupResponseDto,
      {
        ...group,
        members: members.map((m) => ({
          userID: m.userID,
          role: m.role,
          joined_at: m.joined_at,
        })),
      },
      { excludeExtraneousValues: true },
    );
  }

  async getGroupMembers(currentUser: JwtPayload, groupID: string): Promise<ChatGroupMemberResponseDto[]> {
    await this.ensureGroupMember(currentUser, groupID);

    const members = await this.chatRepository.listGroupMembers(groupID);
    const userIds = members.map((m) => m.userID);

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileImage: { select: { s3Key: true } },
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return members.map((member) => {
      const user = userMap.get(member.userID);
      return plainToInstance(
        ChatGroupMemberResponseDto,
        {
          userID: member.userID,
          role: member.role,
          joined_at: member.joined_at,
          firstName: user?.firstName ?? '',
          lastName: user?.lastName ?? '',
          photoUrl: user?.profileImage?.s3Key ?? null,
        },
        { excludeExtraneousValues: true },
      );
    });
  }

  async deleteGroupConversation(currentUser: JwtPayload, groupID: string): Promise<void> {
    await this.ensureGroupMember(currentUser, groupID);

    await this.chatRepository.markGroupConversationDeletedForUser({
      userId: currentUser.sub,
      groupId: groupID,
    });

    this.eventEmitter.emit(CHAT_GROUP_CONVERSATION_DELETED_EVENT, {
      groupID,
      userID: currentUser.sub,
      timestamp: new Date().toISOString(),
    });
  }

  async listGroupMessages(
    currentUser: JwtPayload,
    groupID: string,
    query: Pick<GetChatMessagesDto, 'limit' | 'before'>,
  ): Promise<ChatMessageResponseDto[]> {
    await this.ensureGroupMember(currentUser, groupID);

    const messages = await this.chatRepository.listGroupMessages({
      groupID,
      limit: query.limit,
      before: query.before ? this.parseDate(query.before) : undefined,
    });

    return Promise.all(messages.map((message) => this.toGroupMessageAsChatResponse(message, groupID)));
  }

  async sendGroupMessage(
    currentUser: JwtPayload,
    groupID: string,
    dto: CreateChatMessageDto,
    files?: Express.Multer.File[],
  ): Promise<ChatMessageResponseDto> {
    await this.ensureGroupMember(currentUser, groupID);
    const senderType = this.resolveParticipantType();

    const uploadedAttachments = await this.uploadAttachments(currentUser, files, dto.metadata);
    const existingAttachments = await this.resolveExistingAttachments(dto.existingFileIds ?? [], currentUser);
    const combinedAttachments = [...existingAttachments, ...uploadedAttachments];

    const trimmedContent = dto.content?.trim();
    if (!trimmedContent && !combinedAttachments.length) {
      throw new BadRequestException('chat.MESSAGE_BODY_REQUIRED');
    }

    const metadata = this.composeMetadata(dto.metadata, dto.clientMessageId, dto.forwarded);
    let encryptedContent: string;
    try {
      encryptedContent = encrypt(trimmedContent ?? '');
    } catch (error) {
      throw new InternalServerErrorException('chat.ENCRYPTION_FAILED');
    }

    const payload: CreateChatGroupMessageInput = {
      groupID,
      senderID: currentUser.sub,
      senderType,
      content: encryptedContent,
      attachment: combinedAttachments.length ? combinedAttachments : null,
      metadata: metadata ?? null,
      status: ChatMessageStatusEnum.PENDING,
    };

    const message = await this.chatRepository.createGroupMessage(payload);
    const response = await this.toGroupMessageAsChatResponse(message, groupID);

    const members = await this.chatRepository.listGroupMembers(groupID);
    const memberIDs = members.map((m) => m.userID);

    this.eventEmitter.emit(CHAT_GROUP_MESSAGE_CREATED_EVENT, {
      message: response,
      attachments: combinedAttachments,
      metadata,
      sender: await this.mapSender(currentUser.sub),
      memberIDs,
      groupID,
      timestamp: new Date().toISOString(),
    });

    return response;
  }

  async getConversationMessages(currentUser: JwtPayload, query: GetChatMessagesDto): Promise<ChatMessageResponseDto[]> {
    if (query.conversationType === ChatConversationTypeEnum.GROUP) {
      const groupID = query.counterpartID ?? query.receiverID;
      if (!groupID) throw new BadRequestException('chat.RECEIVER_NOT_FOUND');
      return this.listGroupMessages(currentUser, groupID, {
        limit: query.limit,
        before: query.before,
      });
    }
    const counterpartID = query.counterpartID ?? query.receiverID;
    if (!counterpartID) throw new BadRequestException('chat.RECEIVER_NOT_FOUND');

    const participantType = this.resolveParticipantType();
    const counterpartType = (await this.resolveReceiver(counterpartID)).type;
    const options: FetchConversationMessagesOptions = {
      participantA: { id: currentUser.sub, type: participantType },
      participantB: { id: counterpartID, type: counterpartType },
      limit: query.limit,
      before: query.before ? this.parseDate(query.before) : undefined,
    };

    const deletedConv = await this.chatRepository.findDeletedConversation({
      userID: currentUser.sub,
      userType: participantType,
      counterpartID,
      counterpartType,
    });

    const messages = await this.chatRepository.fetchConversationMessages(options);
    const responseDtos = await Promise.all(messages.map((message) => this.toResponseDto(message)));

    if (deletedConv) {
      const deletionTime = deletedConv.deleted_at;
      return responseDtos.map((message) => {
        const createdAt = message.created_at instanceof Date ? message.created_at : new Date(message.created_at);
        const isDeleted = message.is_deleted || createdAt <= deletionTime;
        return { ...message, is_deleted: isDeleted };
      });
    }

    return responseDtos;
  }

  async listConversations(
    currentUser: JwtPayload,
    query: GetChatConversationsDto,
  ): Promise<{ items: ChatConversationSummaryDto[]; count: number }> {
    const participantType = this.resolveParticipantType();
    const limit = query.limit ?? 20;
    const page = query.page ?? 1;
    const fetchLimit = Math.max(limit * page * 5, 50);

    const rawMessages = await this.chatRepository.fetchInbox({
      participant: { id: currentUser.sub, type: participantType },
      limit: fetchLimit,
    });

    const directSummaries = await this.buildConversationSummaries(currentUser, participantType, rawMessages);

    const deletedConvs = await this.chatRepository.getDeletedConversationsForUser({
      userID: currentUser.sub,
      userType: participantType,
    });

    const deletedMap = this.buildDeletedConversationMap(deletedConvs);
    const afterDeletionFilter = this.filterDeletedConversations(directSummaries, deletedMap);

    const groupConversations = await this.chatRepository.listGroupConversations({
      userID: currentUser.sub,
      limit: fetchLimit,
    });
    const groupSummaries = await this.buildGroupConversationSummaries(groupConversations);

    let combined = [...afterDeletionFilter, ...groupSummaries];
    if (query.type) {
      combined = combined.filter((item) => item.type === query.type);
    }

    const filtered = this.applySearchFilter(combined, query.search);

    const sorted = filtered.sort((a, b) => {
      const aDate = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0;
      const bDate = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0;
      return bDate - aDate;
    });

    const count = sorted.length;
    const start = (page - 1) * limit;
    const data = sorted.slice(start, start + limit);

    return { items: data, count };
  }

  async listChatParticipants(
    currentUser: JwtPayload,
    query: GetChatParticipantsDto,
  ): Promise<{ items: ChatParticipantResponseDto[]; count: number }> {
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        id: { not: currentUser.sub },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileImage: { select: { s3Key: true } },
      },
    });

    const searchTerm = query.search?.trim().toLowerCase();
    const participants = users
      .filter((user) => {
        if (!searchTerm) return true;
        const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.toLowerCase();
        return fullName.includes(searchTerm);
      })
      .map<ChatParticipantResponseDto>((user) => ({
        participantID: user.id,
        participantType: ChatParticipantTypeEnum.USER,
        firstName: user.firstName,
        lastName: user.lastName,
        departmentName: null,
        position: null,
        photoUrl: null,
      }));

    const limit = query.limit ?? 20;
    const page = query.page ?? 1;
    const start = (page - 1) * limit;

    return {
      items: participants.slice(start, start + limit),
      count: participants.length,
    };
  }

  async markMessagesAsRead(currentUser: JwtPayload, dto: MarkChatMessagesReadDto): Promise<MarkReadResponseDto> {
    // Handle group messages
    if (dto.groupID) {
      await this.ensureGroupMember(currentUser, dto.groupID);

      const updatedCount = await this.chatRepository.markGroupMessagesAsRead(
        dto.groupID,
        currentUser.sub,
        dto.messageIds,
      );

      if (updatedCount > 0) {
        const members = await this.chatRepository.listGroupMembers(dto.groupID);
        this.eventEmitter.emit(CHAT_MESSAGE_READ_EVENT, {
          groupID: dto.groupID,
          receiverID: currentUser.sub,
          receiverType: ChatParticipantTypeEnum.USER,
          messageIds: dto.messageIds,
          memberIDs: members.map((m) => m.userID),
        });
      }

      return { updatedCount };
    }

    // Handle direct messages
    const participantType = this.resolveParticipantType();

    const updatedCount = await this.chatRepository.markMessagesAsRead({
      receiverID: currentUser.sub,
      receiverType: participantType,
      messageIds: dto.messageIds,
    });

    if (updatedCount > 0) {
      const messages = await this.chatRepository.findByIds(dto.messageIds);
      const normalized = await Promise.all(messages.map((message) => this.toResponseDto(message)));

      this.eventEmitter.emit(CHAT_MESSAGE_READ_EVENT, {
        receiverID: currentUser.sub,
        receiverType: participantType,
        messages: normalized,
      });
    }

    return { updatedCount };
  }

  async editMessage(
    currentUser: JwtPayload,
    messageId: string,
    dto: EditChatMessageDto,
  ): Promise<ChatMessageResponseDto> {
    // Handle group messages
    if (dto.conversationType === ChatConversationTypeEnum.GROUP && dto.groupID) {
      await this.ensureGroupMember(currentUser, dto.groupID);

      const groupMessage = await this.chatRepository.findGroupMessageById(messageId);
      if (!groupMessage) throw new NotFoundException('chat.MESSAGE_NOT_FOUND');
      if (groupMessage.deleted_at) throw new BadRequestException('chat.CANNOT_EDIT_DELETED');
      if (groupMessage.senderID !== currentUser.sub) throw new ForbiddenException('chat.CANNOT_EDIT_OTHERS');

      const encryptedContent = encrypt(dto.content);
      const updated = await this.chatRepository.updateGroupMessageContent(messageId, currentUser.sub, encryptedContent);

      const response = await this.toGroupMessageAsChatResponse(updated, dto.groupID);
      const members = await this.chatRepository.listGroupMembers(dto.groupID);

      this.eventEmitter.emit(CHAT_GROUP_MESSAGE_EDITED_EVENT, {
        messageId,
        groupID: dto.groupID,
        message: response,
        memberIDs: members.map((m) => m.userID),
        timestamp: new Date().toISOString(),
      });

      return response;
    }

    // Handle direct messages
    const message = await this.chatRepository.findById(messageId);

    if (!message) throw new NotFoundException('chat.MESSAGE_NOT_FOUND');
    if (message.deleted_at) throw new BadRequestException('chat.CANNOT_EDIT_DELETED');
    if (message.senderID !== currentUser.sub) throw new ForbiddenException('chat.CANNOT_EDIT_OTHERS');

    const encryptedContent = encrypt(dto.content);
    const updated = await this.chatRepository.updateMessageContent(messageId, currentUser.sub, encryptedContent);

    const response = await this.toResponseDto(updated);

    this.eventEmitter.emit(CHAT_MESSAGE_EDITED_EVENT, {
      messageId,
      message: response,
    });

    return response;
  }

  async deleteMessage(
    currentUser: JwtPayload,
    messageId: string,
    conversationType?: ChatConversationTypeEnum,
    groupID?: string,
  ): Promise<void> {
    // Handle group messages
    if (conversationType === ChatConversationTypeEnum.GROUP && groupID) {
      await this.ensureGroupMember(currentUser, groupID);

      const groupMessage = await this.chatRepository.findGroupMessageById(messageId);
      if (!groupMessage) throw new NotFoundException('chat.MESSAGE_NOT_FOUND');
      if (groupMessage.senderID !== currentUser.sub) throw new ForbiddenException('chat.CANNOT_DELETE_OTHERS');

      await this.chatRepository.softDeleteGroupMessage(messageId, currentUser.sub);

      const members = await this.chatRepository.listGroupMembers(groupID);
      this.eventEmitter.emit(CHAT_GROUP_MESSAGE_DELETED_EVENT, {
        messageId,
        groupID,
        memberIDs: members.map((m) => m.userID),
        timestamp: new Date().toISOString(),
      });

      return;
    }

    // Handle direct messages
    const message = await this.chatRepository.findById(messageId);

    if (!message) throw new NotFoundException('chat.MESSAGE_NOT_FOUND');
    if (message.senderID !== currentUser.sub) throw new ForbiddenException('chat.CANNOT_DELETE_OTHERS');

    await this.chatRepository.softDeleteMessage(messageId, currentUser.sub);

    this.eventEmitter.emit(CHAT_MESSAGE_DELETED_EVENT, {
      messageId,
      senderID: message.senderID,
      senderType: message.sender_type,
      receiverID: message.receiverID,
      receiverType: message.receiver_type,
    });
  }

  async deleteConversation(currentUser: JwtPayload, counterpartID: string): Promise<void> {
    const participantType = this.resolveParticipantType();
    const { type: counterpartType } = await this.resolveReceiver(counterpartID);

    await this.chatRepository.markConversationDeletedForUser({
      userID: currentUser.sub,
      userType: participantType,
      counterpartID,
      counterpartType,
    });

    this.eventEmitter.emit(CHAT_CONVERSATION_DELETED_EVENT, {
      userID: currentUser.sub,
      userType: participantType,
      counterpartID,
      counterpartType,
    });
  }

  // Helpers -----------------------------------------------------------------
  private resolveParticipantType(): ChatParticipantTypeEnum {
    return ChatParticipantTypeEnum.USER;
  }

  private async resolveReceiver(receiverID: string): Promise<{ type: ChatParticipantTypeEnum }> {
    const user = await this.prisma.user.findUnique({
      where: { id: receiverID },
      select: { id: true, deletedAt: true },
    });
    if (user && !user.deletedAt) {
      return { type: ChatParticipantTypeEnum.USER };
    }

    throw new NotFoundException('chat.RECEIVER_NOT_FOUND');
  }

  private async uploadAttachments(
    user: JwtPayload,
    files?: Express.Multer.File[],
    metadata?: ChatMessageMetadata,
  ): Promise<ChatAttachmentMetadata[]> {
    if (!files?.length) return [];

    const audioMimeAllowlist = [
      'audio/webm',
      'audio/mpeg',
      'audio/mp4',
      'audio/ogg',
      'audio/aac',
      'audio/wav',
      'audio/x-m4a',
    ];
    const maxAudioSizeBytes = 5 * 1024 * 1024;

    const uploads = [];
    for (const file of files) {
      const isAudio = file.mimetype?.startsWith('audio/');
      if (isAudio && !audioMimeAllowlist.includes(file.mimetype)) {
        throw new BadRequestException('chat.UNSUPPORTED_AUDIO_TYPE');
      }
      if (isAudio && file.size > maxAudioSizeBytes) {
        throw new BadRequestException('chat.AUDIO_TOO_LARGE');
      }
      uploads.push(file);
    }

    const savedFiles = await this.filesService.uploadFiles(uploads, user.sub);
    return savedFiles.map((uploaded, index) => {
      const file = files[index];
      const isAudio = file.mimetype?.startsWith('audio/');
      const voiceMeta = metadata?.voice;
      return {
        fileId: uploaded.id,
        name: uploaded.originalName,
        mimeType: file.mimetype,
        size: file.size,
        url: uploaded.s3Key,
        provider: 's3',
        meta: isAudio
          ? {
              type: 'AUDIO',
              durationMs: voiceMeta?.durationMs,
              codec: voiceMeta?.codec ?? file.mimetype?.split('/')[1],
              waveform: voiceMeta?.waveform,
              bitrate: voiceMeta?.bitrate,
              voice: voiceMeta,
            }
          : undefined,
      } as ChatAttachmentMetadata;
    });
  }

  private async resolveExistingAttachments(fileIds: string[], _user: JwtPayload): Promise<ChatAttachmentMetadata[]> {
    if (!fileIds.length) return [];

    const attachments: ChatAttachmentMetadata[] = [];

    for (const fileId of fileIds) {
      const file = await this.prisma.file.findUnique({
        where: { id: fileId, deletedAt: null },
      });
      // Single-tenant: Sahiplik kontrolü yok, tüm kullanıcılar dosyaları kullanabilir (forward için gerekli)
      if (!file) {
        throw new NotFoundException('chat.ATTACHMENT_NOT_FOUND');
      }

      attachments.push({
        fileId: file.id,
        name: file.originalName,
        mimeType: file.mimeType,
        url: file.s3Key,
        provider: 's3',
        meta: {
          category: null,
          type: file.mimeType,
        },
      });
    }

    return attachments;
  }

  private composeMetadata(
    base: ChatMessageMetadata | undefined,
    clientMessageId?: string,
    forwarded?: boolean,
    quotedMessage?: ChatMessageMetadata['quotedMessage'],
  ): ChatMessageMetadata | undefined {
    if (!base && !clientMessageId && !forwarded && !quotedMessage) return undefined;
    return {
      ...(base ?? {}),
      ...(clientMessageId ? { clientMessageId } : {}),
      ...(forwarded ? { forwarded: true } : {}),
      ...(quotedMessage ? { quotedMessage } : {}),
    };
  }

  private async mapSender(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    return {
      id: userId,
      firstName: user?.firstName,
      lastName: user?.lastName,
      userType: ChatParticipantTypeEnum.USER,
    };
  }

  private async toResponseDto(entity: any): Promise<ChatMessageResponseDto> {
    const decrypted = this.safeDecrypt(entity.content);
    const rawAttachments = this.normalizeAttachments(entity.attachment);
    const attachments = await this.generatePresignedUrls(rawAttachments);
    const metadata = entity.metadata ?? undefined;

    return plainToInstance(
      ChatMessageResponseDto,
      {
        id: entity.id,
        senderID: entity.senderID,
        senderType: entity.sender_type ?? entity.senderType,
        receiverID: entity.receiverID,
        receiverType: entity.receiver_type ?? entity.receiverType,
        content: decrypted,
        attachment: attachments,
        metadata,
        status: entity.status,
        forwarded: metadata?.forwarded ?? false,
        quotedMessage: metadata?.quotedMessage ?? null,
        is_edited: entity.is_edited,
        edited_at: entity.edited_at,
        is_deleted: entity.deleted_at !== null,
        created_at: entity.created_at,
        updated_at: entity.updated_at,
      },
      { excludeExtraneousValues: true },
    );
  }

  private async toGroupMessageAsChatResponse(entity: any, groupID: string): Promise<ChatMessageResponseDto> {
    const decrypted = this.safeDecrypt(entity.content);
    const rawAttachments = this.normalizeAttachments(entity.attachment as any);
    const attachments = await this.generatePresignedUrls(rawAttachments);
    const metadata = entity.metadata ?? undefined;

    return plainToInstance(
      ChatMessageResponseDto,
      {
        id: entity.id,
        senderID: entity.senderID,
        senderType: entity.sender_type ?? entity.senderType,
        receiverID: groupID,
        receiverType: ChatParticipantTypeEnum.USER,
        content: decrypted,
        attachment: attachments,
        metadata,
        status: entity.status,
        is_edited: entity.is_edited,
        edited_at: entity.edited_at,
        is_deleted: entity.deleted_at !== null,
        created_at: entity.created_at,
        updated_at: entity.updated_at,
        forwarded: metadata?.forwarded ?? false,
        quotedMessage: metadata?.quotedMessage ?? null,
      },
      { excludeExtraneousValues: true },
    );
  }

  private safeDecrypt(payload: string | null | undefined): string | null {
    if (!payload) return null;
    try {
      return decrypt(payload);
    } catch (error) {
      return null;
    }
  }

  private normalizeAttachments(data: any): ChatAttachmentMetadata[] | null {
    if (!data) return null;
    if (Array.isArray(data)) return data;
    return [data];
  }

  private async generatePresignedUrls(
    attachments: ChatAttachmentMetadata[] | null,
  ): Promise<ChatAttachmentMetadata[] | null> {
    if (!attachments?.length) return null;

    return Promise.all(
      attachments.map(async (attachment) => {
        if (!attachment.url) return attachment;

        try {
          const presignedUrl = await this.s3Service.getPresignedUrl(attachment.url, 900);
          return { ...attachment, url: presignedUrl };
        } catch {
          // S3 hatalarında orijinal s3Key'i koru
          return attachment;
        }
      }),
    );
  }

  private parseDate(value: string): Date {
    const asDate = new Date(value);
    if (Number.isNaN(asDate.getTime())) throw new BadRequestException('chat.INVALID_BEFORE_CURSOR');
    return asDate;
  }

  private async ensureGroupMember(currentUser: JwtPayload, groupID: string) {
    const membership = await this.chatRepository.findGroupMember(groupID, currentUser.sub);
    if (!membership) throw new ForbiddenException('chat.NOT_GROUP_MEMBER');
    return membership;
  }

  private ensureGroupAdmin(membership: { role: ChatGroupRoleEnum }): void {
    if (![ChatGroupRoleEnum.OWNER, ChatGroupRoleEnum.ADMIN].includes(membership.role)) {
      throw new ForbiddenException('chat.NOT_GROUP_ADMIN');
    }
  }

  private ensureGroupOwner(membership: { role: ChatGroupRoleEnum }): void {
    if (membership.role !== ChatGroupRoleEnum.OWNER) {
      throw new ForbiddenException('chat.NOT_GROUP_OWNER');
    }
  }

  private async buildConversationSummaries(
    currentUser: JwtPayload,
    participantType: ChatParticipantTypeEnum,
    messages: any[],
  ): Promise<ChatConversationSummaryDto[]> {
    const map = new Map<string, { message: any; counterpartID: string; counterpartType: ChatParticipantTypeEnum }>();

    for (const message of messages) {
      const isSender = message.senderID === currentUser.sub && message.sender_type === participantType;
      const counterpartID = isSender ? message.receiverID : message.senderID;
      const counterpartType = isSender ? message.receiver_type : message.sender_type;
      const key = `${counterpartType}:${counterpartID}`;

      if (map.has(key)) continue;

      map.set(key, { message, counterpartID, counterpartType });
    }

    const entries = Array.from(map.values());

    // Convert messages to response DTOs with presigned URLs
    const summaries: ChatConversationSummaryDto[] = await Promise.all(
      entries.map(async ({ message, counterpartID, counterpartType }) => ({
        type: ChatConversationTypeEnum.DIRECT,
        counterpartID,
        counterpartType,
        lastMessage: await this.toResponseDto(message),
        unreadCount: 0,
      })),
    );

    const counts = await Promise.all(
      summaries.map((summary) =>
        this.chatRepository.countUnread({
          receiverID: currentUser.sub,
          receiverType: participantType,
          fromSenderId: summary.counterpartID,
          fromSenderType: summary.counterpartType,
        }),
      ),
    );

    const counterpartInfoMap = await this.enrichWithCounterpartInfo(summaries);

    return summaries.map((summary, index) => ({
      ...summary,
      unreadCount: counts[index] ?? 0,
      counterpartInfo: summary.counterpartID ? (counterpartInfoMap.get(summary.counterpartID) ?? null) : null,
    }));
  }

  private async buildGroupConversationSummaries(rows: GroupConversationRow[]): Promise<ChatConversationSummaryDto[]> {
    return Promise.all(
      rows.map(async (row) => ({
        type: ChatConversationTypeEnum.GROUP,
        groupID: row.group.id,
        groupName: row.group.name,
        groupPhotoUrl: row.group.photoUrl ?? null,
        membershipRole: row.membership.role,
        lastMessage: row.lastMessage ? await this.toGroupMessageAsChatResponse(row.lastMessage, row.group.id) : null,
        unreadCount: row.unreadCount,
      })),
    );
  }

  private buildDeletedConversationMap(
    deletedConversations: {
      counterpartID: string;
      counterpartType: ChatParticipantTypeEnum;
      deleted_at: Date;
    }[],
  ): Map<string, Date> {
    const deletedMap = new Map<string, Date>();
    deletedConversations.forEach((dc) => {
      const key = `${dc.counterpartType}:${dc.counterpartID}`;
      deletedMap.set(key, dc.deleted_at);
    });
    return deletedMap;
  }

  private filterDeletedConversations(
    summaries: ChatConversationSummaryDto[],
    deletedMap: Map<string, Date>,
  ): ChatConversationSummaryDto[] {
    return summaries.filter((summary) => {
      if (!summary.counterpartType || !summary.counterpartID) return true;
      const key = `${summary.counterpartType}:${summary.counterpartID}`;
      const deletedAt = deletedMap.get(key);
      if (!deletedAt) return true;
      return summary.lastMessage && summary.lastMessage.created_at > deletedAt;
    });
  }

  private applySearchFilter(summaries: ChatConversationSummaryDto[], search?: string): ChatConversationSummaryDto[] {
    if (!search?.trim()) return summaries;

    const term = search.toLowerCase().trim();
    return summaries.filter((s) => {
      if (s.type === ChatConversationTypeEnum.GROUP) {
        return s.groupName?.toLowerCase().includes(term);
      }
      const info = s.counterpartInfo;
      if (!info) return false;

      const fullName = `${info.firstName ?? ''} ${info.lastName ?? ''}`.toLowerCase();
      return fullName.includes(term);
    });
  }

  private async enrichWithCounterpartInfo(
    summaries: ChatConversationSummaryDto[],
  ): Promise<Map<string, CounterpartInfoDto>> {
    const userIds: string[] = [];
    summaries.forEach((s) => {
      if (!s.counterpartID) return;
      userIds.push(s.counterpartID);
    });

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: { select: { name: true } },
        profileImage: { select: { s3Key: true } },
      },
    });

    const counterpartInfoMap = new Map<string, CounterpartInfoDto>();
    users.forEach((user) => {
      counterpartInfoMap.set(user.id, {
        firstName: user.firstName,
        lastName: user.lastName,
        departmentName: null,
        position: user.role?.name ?? null,
        photoUrl: user.profileImage?.s3Key ?? null,
      });
    });

    return counterpartInfoMap;
  }
}
