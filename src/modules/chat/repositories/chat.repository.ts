// Libraries
import { Injectable } from '@nestjs/common';
import { ChatGroupRoleEnum, ChatMessageStatusEnum, ChatParticipantTypeEnum } from '@/common/enums';
import { PrismaService } from '@/database/prisma.service';
import {
  Prisma,
  ChatMessage as PrismaChatMessage,
  ChatGroup as PrismaChatGroup,
  ChatGroupMember as PrismaChatGroupMember,
  ChatGroupMessage as PrismaChatGroupMessage,
  ChatMessageStatus as PrismaChatMessageStatus,
} from '@prisma/client';

// Interfaces
import {
  ChatGroup,
  ChatGroupDeletedConversation,
  ChatGroupMember,
  ChatGroupMessage,
  ChatGroupWithPhoto,
  ChatMessage,
  CountGroupUnreadOptions,
  CountUnreadOptions,
  CreateChatGroupInput,
  CreateChatGroupMemberInput,
  CreateChatGroupMessageInput,
  CreateChatMessageInput,
  DeleteConversationForUserInput,
  DeleteGroupConversationForUserInput,
  FetchConversationMessagesOptions,
  FetchInboxOptions,
  FindDeletedConversationInput,
  GetDeletedConversationsInput,
  GroupConversationRow,
  IChatRepository,
  ListGroupConversationsOptions,
  ListGroupMessagesOptions,
  MarkMessagesAsReadInput,
} from '../interfaces/chat-repository.interface';

@Injectable()
export class ChatRepository implements IChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMessage(input: CreateChatMessageInput): Promise<ChatMessage> {
    const record = await this.prisma.chatMessage.create({
      data: {
        senderUserId: input.senderID,
        receiverUserId: input.receiverID,
        senderType: input.senderType as any,
        receiverType: input.receiverType as any,
        content: input.content,
        attachment: this.toJsonValue(input.attachment),
        metadata: this.toJsonValue(input.metadata),
        status: this.mapStatus(input.status),
        isEdited: false,
      },
    });
    return this.mapMessage(record);
  }

  async findById(id: string): Promise<ChatMessage | null> {
    const record = await this.prisma.chatMessage.findUnique({ where: { id } });
    return record ? this.mapMessage(record) : null;
  }

  async findByIds(ids: string[]): Promise<ChatMessage[]> {
    if (!ids.length) return [];
    const records = await this.prisma.chatMessage.findMany({ where: { id: { in: ids } } });
    return records.map((record) => this.mapMessage(record));
  }

  async fetchConversationMessages(options: FetchConversationMessagesOptions): Promise<ChatMessage[]> {
    const { participantA, participantB, limit = 50, before } = options;
    const records = await this.prisma.chatMessage.findMany({
      where: {
        OR: [
          {
            senderUserId: participantA.id,
            senderType: participantA.type as any,
            receiverUserId: participantB.id,
            receiverType: participantB.type as any,
          },
          {
            senderUserId: participantB.id,
            senderType: participantB.type as any,
            receiverUserId: participantA.id,
            receiverType: participantA.type as any,
          },
        ],
        ...(before ? { createdAt: { lt: before } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return records.map((record) => this.mapMessage(record));
  }

  async fetchInbox(options: FetchInboxOptions): Promise<ChatMessage[]> {
    const { participant, limit = 100 } = options;
    const records = await this.prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderUserId: participant.id, senderType: participant.type as any },
          { receiverUserId: participant.id, receiverType: participant.type as any },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return records.map((record) => this.mapMessage(record));
  }

  async markMessagesAsRead(input: MarkMessagesAsReadInput): Promise<number> {
    if (!input.messageIds.length) return 0;
    const result = await this.prisma.chatMessage.updateMany({
      where: {
        id: { in: input.messageIds },
        receiverUserId: input.receiverID,
        receiverType: input.receiverType as any,
        status: { not: this.mapStatus(ChatMessageStatusEnum.READED) },
      },
      data: { status: this.mapStatus(ChatMessageStatusEnum.READED) },
    });
    return result.count;
  }

  async countUnread(options: CountUnreadOptions): Promise<number> {
    const { receiverID, receiverType, fromSenderId, fromSenderType } = options;
    const statusFilter = [ChatMessageStatusEnum.PENDING, ChatMessageStatusEnum.SENT_PUSH].map((s) => this.mapStatus(s));
    return this.prisma.chatMessage.count({
      where: {
        receiverUserId: receiverID,
        receiverType: receiverType as any,
        status: { in: statusFilter },
        ...(fromSenderId && fromSenderType ? { senderUserId: fromSenderId, senderType: fromSenderType as any } : {}),
      },
    });
  }

  async updateMessageContent(id: string, senderID: string, newContent: string): Promise<ChatMessage> {
    await this.prisma.chatMessage.updateMany({
      where: { id, senderUserId: senderID },
      data: { content: newContent, isEdited: true, editedAt: new Date() },
    });
    const record = await this.prisma.chatMessage.findUnique({ where: { id } });
    return this.mapMessage(record as any);
  }

  async softDeleteMessage(id: string, senderID: string): Promise<void> {
    await this.prisma.chatMessage.updateMany({
      where: { id, senderUserId: senderID },
      data: { deletedAt: new Date() },
    });
  }

  async markConversationDeletedForUser(input: DeleteConversationForUserInput): Promise<void> {
    await this.prisma.chatDeletedConversation.upsert({
      where: {
        userId_userType_counterpartId_counterpartType: {
          userId: input.userID,
          userType: input.userType as any,
          counterpartId: input.counterpartID,
          counterpartType: input.counterpartType as any,
        },
      },
      create: {
        userId: input.userID,
        userType: input.userType as any,
        counterpartId: input.counterpartID,
        counterpartType: input.counterpartType as any,
        deletedAt: new Date(),
      },
      update: { deletedAt: new Date() },
    });
  }

  async getDeletedConversationsForUser(
    input: GetDeletedConversationsInput,
  ): Promise<{ counterpartID: string; counterpartType: ChatParticipantTypeEnum; deleted_at: Date }[]> {
    const rows = await this.prisma.chatDeletedConversation.findMany({
      where: { userId: input.userID, userType: input.userType as any },
    });
    return rows.map((row) => ({
      counterpartID: row.counterpartId,
      counterpartType: row.counterpartType as ChatParticipantTypeEnum,
      deleted_at: row.deletedAt,
    }));
  }

  async findDeletedConversation(
    input: FindDeletedConversationInput,
  ): Promise<{ counterpartID: string; counterpartType: ChatParticipantTypeEnum; deleted_at: Date } | null> {
    const row = await this.prisma.chatDeletedConversation.findUnique({
      where: {
        userId_userType_counterpartId_counterpartType: {
          userId: input.userID,
          userType: input.userType as any,
          counterpartId: input.counterpartID,
          counterpartType: input.counterpartType as any,
        },
      },
    });
    return row
      ? {
          counterpartID: row.counterpartId,
          counterpartType: row.counterpartType as ChatParticipantTypeEnum,
          deleted_at: row.deletedAt,
        }
      : null;
  }

  async createGroup(input: CreateChatGroupInput): Promise<ChatGroup> {
    const record = await this.prisma.chatGroup.create({
      data: {
        name: input.name,
        ownerId: input.ownerID,
        createdBy: input.createdBy,
      },
    });
    return this.mapGroup(record);
  }

  async addGroupMembers(members: CreateChatGroupMemberInput[]): Promise<ChatGroupMember[]> {
    if (!members.length) return [];
    await this.prisma.chatGroupMember.createMany({
      data: members.map((member) => ({
        groupId: member.groupID,
        userId: member.userID,
        role: member.role as any,
      })),
      skipDuplicates: true,
    });
    const { groupID } = members[0];
    const persisted = await this.prisma.chatGroupMember.findMany({
      where: { groupId: groupID, leftAt: null },
    });
    return persisted.map((member) => this.mapGroupMember(member));
  }

  async removeGroupMember(groupID: string, userID: string): Promise<void> {
    await this.prisma.chatGroupMember.deleteMany({ where: { groupId: groupID, userId: userID } });
  }

  async leaveGroup(groupID: string, userID: string): Promise<void> {
    await this.prisma.chatGroupMember.updateMany({
      where: { groupId: groupID, userId: userID, leftAt: null },
      data: { leftAt: new Date() },
    });
  }

  async transferOwner(groupID: string, newOwnerID: string): Promise<void> {
    await this.prisma.chatGroup.update({ where: { id: groupID }, data: { ownerId: newOwnerID } });
  }

  async renameGroup(groupID: string, name: string): Promise<void> {
    await this.prisma.chatGroup.update({ where: { id: groupID }, data: { name } });
  }

  async findGroupById(groupID: string): Promise<ChatGroup | null> {
    const record = await this.prisma.chatGroup.findUnique({ where: { id: groupID } });
    return record ? this.mapGroup(record) : null;
  }

  async findGroupByIdWithPhoto(groupID: string): Promise<ChatGroupWithPhoto | null> {
    const record = await this.prisma.chatGroup.findUnique({
      where: { id: groupID },
      include: { photoFile: true },
    });
    if (!record) return null;

    const group = this.mapGroup(record);
    return {
      ...group,
      photoUrl: record.photoFile?.s3Key ? `/files/${record.photoFile.id}` : null,
    };
  }

  async updateGroupPhoto(groupID: string, photoFileId: string | null): Promise<void> {
    await this.prisma.chatGroup.update({
      where: { id: groupID },
      data: { photoFileId },
    });
  }

  async findGroupMember(groupID: string, userID: string): Promise<ChatGroupMember | null> {
    const member = await this.prisma.chatGroupMember.findFirst({
      where: { groupId: groupID, userId: userID, leftAt: null },
    });
    return member ? this.mapGroupMember(member) : null;
  }

  async listGroupMembers(groupID: string): Promise<ChatGroupMember[]> {
    const members = await this.prisma.chatGroupMember.findMany({
      where: { groupId: groupID, leftAt: null },
    });
    return members.map((m) => this.mapGroupMember(m));
  }

  async createGroupMessage(input: CreateChatGroupMessageInput): Promise<ChatGroupMessage> {
    const record = await this.prisma.chatGroupMessage.create({
      data: {
        groupId: input.groupID,
        senderId: input.senderID,
        senderType: input.senderType as any,
        content: input.content,
        attachment: this.toJsonValue(input.attachment),
        metadata: this.toJsonValue(input.metadata),
        status: this.mapStatus(input.status),
        isEdited: false,
      },
    });
    return this.mapGroupMessage(record);
  }

  async listGroupMessages(options: ListGroupMessagesOptions): Promise<ChatGroupMessage[]> {
    const { groupID, limit = 50, before } = options;
    const records = await this.prisma.chatGroupMessage.findMany({
      where: { groupId: groupID, ...(before ? { createdAt: { lt: before } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return records.map((record) => this.mapGroupMessage(record));
  }

  async findGroupMessageById(messageId: string): Promise<ChatGroupMessage | null> {
    const record = await this.prisma.chatGroupMessage.findUnique({ where: { id: messageId } });
    return record ? this.mapGroupMessage(record) : null;
  }

  async updateGroupMessageContent(id: string, senderID: string, newContent: string): Promise<ChatGroupMessage> {
    await this.prisma.chatGroupMessage.updateMany({
      where: { id, senderId: senderID },
      data: { content: newContent, isEdited: true, editedAt: new Date() },
    });
    const record = await this.prisma.chatGroupMessage.findUnique({ where: { id } });
    return this.mapGroupMessage(record as PrismaChatGroupMessage);
  }

  async softDeleteGroupMessage(id: string, senderID: string): Promise<void> {
    await this.prisma.chatGroupMessage.updateMany({
      where: { id, senderId: senderID },
      data: { deletedAt: new Date() },
    });
  }

  async markGroupMessagesAsRead(groupID: string, userID: string, messageIds: string[]): Promise<number> {
    if (!messageIds.length) return 0;
    const result = await this.prisma.chatGroupMessage.updateMany({
      where: {
        id: { in: messageIds },
        groupId: groupID,
        senderId: { not: userID },
        status: { not: this.mapStatus(ChatMessageStatusEnum.READED) },
      },
      data: { status: this.mapStatus(ChatMessageStatusEnum.READED) },
    });
    return result.count;
  }

  async countGroupUnread(options: CountGroupUnreadOptions): Promise<number> {
    const statusFilter = [ChatMessageStatusEnum.PENDING, ChatMessageStatusEnum.SENT_PUSH].map((s) => this.mapStatus(s));
    return this.prisma.chatGroupMessage.count({
      where: {
        groupId: options.groupID,
        senderId: { not: options.userID },
        status: { in: statusFilter },
        ...(options.since ? { createdAt: { gt: options.since } } : {}),
      },
    });
  }

  async listGroupConversations(options: ListGroupConversationsOptions): Promise<GroupConversationRow[]> {
    const memberships = await this.prisma.chatGroupMember.findMany({
      where: { userId: options.userID, leftAt: null },
      include: { group: { include: { photoFile: true } } },
      take: options.limit,
    });

    const rows: GroupConversationRow[] = [];
    for (const membership of memberships) {
      const lastMessage = await this.prisma.chatGroupMessage.findFirst({
        where: { groupId: membership.groupId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      const unreadCount = await this.countGroupUnread({
        groupID: membership.groupId,
        userID: membership.userId,
        since: membership.joinedAt ?? undefined,
      });
      rows.push({
        group: {
          id: membership.group?.id ?? membership.groupId,
          name: membership.group?.name ?? '',
          photoUrl: membership.group?.photoFile?.s3Key ? `/files/${membership.group.photoFile.id}` : null,
        },
        membership: this.mapGroupMember(membership),
        lastMessage: lastMessage ? this.mapGroupMessage(lastMessage) : null,
        unreadCount,
      });
    }

    return rows;
  }

  async markGroupConversationDeletedForUser(input: DeleteGroupConversationForUserInput): Promise<void> {
    await this.prisma.chatGroupDeletedConversation.upsert({
      where: {
        userId_groupId: {
          userId: input.userId,
          groupId: input.groupId,
        },
      },
      create: {
        userId: input.userId,
        groupId: input.groupId,
        deletedAt: new Date(),
      },
      update: { deletedAt: new Date() },
    });
  }

  async findDeletedGroupConversation(userId: string, groupId: string): Promise<ChatGroupDeletedConversation | null> {
    const record = await this.prisma.chatGroupDeletedConversation.findUnique({
      where: {
        userId_groupId: { userId, groupId },
      },
    });
    return record
      ? {
          id: record.id,
          userId: record.userId,
          groupId: record.groupId,
          deletedAt: record.deletedAt,
        }
      : null;
  }

  async getDeletedGroupConversationsForUser(userId: string): Promise<{ groupId: string; deletedAt: Date }[]> {
    const records = await this.prisma.chatGroupDeletedConversation.findMany({
      where: { userId },
    });
    return records.map((r) => ({ groupId: r.groupId, deletedAt: r.deletedAt }));
  }

  // Mapping helpers ---------------------------------------------------------
  private toJsonValue(value: unknown): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
    return value ?? Prisma.DbNull;
  }

  private mapStatus(status: ChatMessageStatusEnum): PrismaChatMessageStatus {
    switch (status) {
      case ChatMessageStatusEnum.READED:
        return 'READED';
      case ChatMessageStatusEnum.SENT_PUSH:
        return 'SENT_PUSH';
      default:
        return 'PENDING';
    }
  }

  private mapMessage(record: PrismaChatMessage): ChatMessage {
    return {
      id: record.id,
      senderID: record.senderUserId,
      sender_type: record.senderType as ChatParticipantTypeEnum,
      receiverID: record.receiverUserId,
      receiver_type: record.receiverType as ChatParticipantTypeEnum,
      content: record.content,
      attachment: (record.attachment as any) ?? null,
      metadata: (record.metadata as any) ?? null,
      status: this.fromStatus(record.status),
      is_edited: record.isEdited,
      edited_at: record.editedAt,
      deleted_at: record.deletedAt,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    };
  }

  private mapGroup(record: PrismaChatGroup): ChatGroup {
    return {
      id: record.id,
      name: record.name,
      ownerID: record.ownerId,
      createdBy: record.createdBy,
      photoFileId: record.photoFileId,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    };
  }

  private mapGroupMember(record: PrismaChatGroupMember): ChatGroupMember {
    return {
      groupID: record.groupId,
      userID: record.userId,
      role: record.role as ChatGroupRoleEnum,
      joined_at: record.joinedAt,
      left_at: record.leftAt,
    };
  }

  private mapGroupMessage(record: PrismaChatGroupMessage): ChatGroupMessage {
    return {
      id: record.id,
      groupID: record.groupId,
      senderID: record.senderId,
      sender_type: record.senderType as ChatParticipantTypeEnum,
      content: record.content,
      attachment: (record.attachment as any) ?? null,
      metadata: (record.metadata as any) ?? null,
      status: this.fromStatus(record.status),
      is_edited: record.isEdited,
      edited_at: record.editedAt,
      deleted_at: record.deletedAt,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    };
  }

  private fromStatus(status: PrismaChatMessageStatus): ChatMessageStatusEnum {
    switch (status) {
      case 'READED':
        return ChatMessageStatusEnum.READED;
      case 'SENT_PUSH':
        return ChatMessageStatusEnum.SENT_PUSH;
      default:
        return ChatMessageStatusEnum.PENDING;
    }
  }
}
