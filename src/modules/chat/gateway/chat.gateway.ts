// Libraries
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

// DTOs
import { ChatMessageResponseDto } from '../dto/response/chat-message.response.dto';
import { ChatGroupResponseDto } from '../dto/response/chat-group.response.dto';

// Interfaces
import { JwtPayload } from '@/modules/auth/interfaces/jwt-payload.interface';

// Enums
import { ChatParticipantTypeEnum } from '@/common/enums';

// Constants
import {
  CHAT_CONVERSATION_DELETED_EVENT,
  CHAT_GROUP_CREATED_EVENT,
  CHAT_GROUP_DELETED_EVENT,
  CHAT_GROUP_MESSAGE_CREATED_EVENT,
  CHAT_GROUP_MESSAGE_DELETED_EVENT,
  CHAT_GROUP_MESSAGE_EDITED_EVENT,
  CHAT_GROUP_OWNER_TRANSFERRED_EVENT,
  CHAT_GROUP_MEMBERSHIP_UPDATED_EVENT,
  CHAT_MESSAGE_CREATED_EVENT,
  CHAT_MESSAGE_DELETED_EVENT,
  CHAT_MESSAGE_EDITED_EVENT,
  CHAT_MESSAGE_READ_EVENT,
} from '../constants/events';

// Services
import { AuthorizationService } from '@/modules/permissions/services/authorization.service';

@WebSocketGateway({ namespace: 'chat', cors: { origin: true, credentials: true } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly io!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly connections = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const user = await this.authenticate(client);
      await this.ensurePermission(user, 'VIEW');
      const participantType = this.normalizeType(user.userType);
      client.data.user = user;
      const room = this.buildRoom(participantType, user.sub);
      client.join(room);
      this.track(room, client.id);
      client.emit('connection:ack', { user });
      this.logger.debug(`Socket ${client.id} joined room ${room}`);
    } catch (error) {
      this.logger.warn(`Socket connection rejected: ${(error as Error).message}`);
      client.emit('connection:error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const user: JwtPayload | undefined = client.data.user;
    if (!user) return;
    const room = this.buildRoom(this.normalizeType(user.userType), user.sub);
    this.untrack(room, client.id);
    this.logger.debug(`Socket ${client.id} left room ${room}`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong');
  }

  @OnEvent(CHAT_MESSAGE_CREATED_EVENT)
  handleMessageCreated(payload: { message: ChatMessageResponseDto }): void {
    const { message } = payload;
    const receiverRoom = this.buildRoom(message.receiverType, message.receiverID);
    const senderRoom = this.buildRoom(message.senderType, message.senderID);

    this.io.to(receiverRoom).emit('message:new', message);
    this.io.to(senderRoom).emit('message:new', message);
  }

  @OnEvent(CHAT_GROUP_MESSAGE_CREATED_EVENT)
  handleGroupMessageCreated(payload: { groupID: string; memberIDs: string[]; message: ChatMessageResponseDto }): void {
    const groupRoom = this.buildGroupRoom(payload.groupID);
    this.io.to(groupRoom).emit('group:message', payload.message);
    this.io.to(groupRoom).emit('message:new', payload.message);

    payload.memberIDs.forEach((memberID) => {
      const memberRoom = this.buildRoom(ChatParticipantTypeEnum.USER, memberID);
      this.io.to(memberRoom).emit('group:message', payload.message);
      this.io.to(memberRoom).emit('message:new', payload.message);
    });
  }

  @OnEvent(CHAT_MESSAGE_READ_EVENT)
  handleMessageRead(payload: {
    receiverID: string;
    receiverType: ChatParticipantTypeEnum;
    messages: ChatMessageResponseDto[];
  }): void {
    const receiverRoom = this.buildRoom(payload.receiverType, payload.receiverID);
    this.io.to(receiverRoom).emit('message:read', { messages: payload.messages });
  }

  @OnEvent(CHAT_MESSAGE_EDITED_EVENT)
  handleMessageEdited(payload: { messageId: string; message: ChatMessageResponseDto }): void {
    const message = payload.message;
    const receiverRoom = this.buildRoom(message.receiverType, message.receiverID);
    const senderRoom = this.buildRoom(message.senderType, message.senderID);

    this.io.to(receiverRoom).emit('message:edited', message);
    this.io.to(senderRoom).emit('message:edited', message);
  }

  @OnEvent(CHAT_MESSAGE_DELETED_EVENT)
  handleMessageDeleted(payload: {
    messageId: string;
    senderID: string;
    senderType: ChatParticipantTypeEnum;
    receiverID: string;
    receiverType: ChatParticipantTypeEnum;
  }): void {
    const receiverRoom = this.buildRoom(payload.receiverType, payload.receiverID);
    const senderRoom = this.buildRoom(payload.senderType, payload.senderID);
    const deleteEvent = { messageId: payload.messageId, deletedAt: new Date() };

    this.io.to(receiverRoom).emit('message:deleted', deleteEvent);
    this.io.to(senderRoom).emit('message:deleted', deleteEvent);
  }

  @OnEvent(CHAT_CONVERSATION_DELETED_EVENT)
  handleConversationDeleted(payload: {
    userID: string;
    userType: ChatParticipantTypeEnum;
    counterpartID: string;
    counterpartType: ChatParticipantTypeEnum;
  }): void {
    const room = this.buildRoom(payload.userType, payload.userID);
    this.io.to(room).emit('conversation:deleted', {
      counterpartID: payload.counterpartID,
      counterpartType: payload.counterpartType,
      deletedAt: new Date(),
    });
  }

  @OnEvent(CHAT_GROUP_OWNER_TRANSFERRED_EVENT)
  handleGroupOwnerTransferred(payload: {
    groupID: string;
    fromUserID: string;
    toUserID: string;
    memberIDs: string[];
  }): void {
    const groupRoom = this.buildGroupRoom(payload.groupID);
    this.io.to(groupRoom).emit('group:owner_transferred', payload);
    payload.memberIDs.forEach((memberID) => {
      const memberRoom = this.buildRoom(ChatParticipantTypeEnum.USER, memberID);
      this.io.to(memberRoom).emit('group:owner_transferred', payload);
    });
  }

  @OnEvent(CHAT_GROUP_MEMBERSHIP_UPDATED_EVENT)
  handleGroupMembershipUpdated(payload: {
    groupID: string;
    actorID: string;
    action: 'added' | 'removed' | 'left' | 'renamed' | 'photo_updated';
    memberIDs: string[];
    name?: string;
    photoUrl?: string | null;
  }): void {
    const body = {
      groupID: payload.groupID,
      actorID: payload.actorID,
      action: payload.action,
      memberIDs: payload.memberIDs,
      name: payload.name,
      photoUrl: payload.photoUrl,
    };
    const groupRoom = this.buildGroupRoom(payload.groupID);
    this.io.to(groupRoom).emit('group:membership_updated', body);
    payload.memberIDs.forEach((memberID) => {
      const memberRoom = this.buildRoom(ChatParticipantTypeEnum.USER, memberID);
      this.io.to(memberRoom).emit('group:membership_updated', body);
    });
  }

  @OnEvent(CHAT_GROUP_CREATED_EVENT)
  handleGroupCreated(payload: { group: ChatGroupResponseDto }): void {
    const { group } = payload;
    const members = group.members ?? [];

    const eventData = {
      groupID: group.id,
      groupName: group.name,
      groupPhotoUrl: group.photoUrl ?? null,
      createdBy: group.createdBy,
      memberIDs: members.map((m) => m.userID),
      created_at: group.created_at,
    };

    members.forEach((member) => {
      const memberRoom = this.buildRoom(ChatParticipantTypeEnum.USER, member.userID);
      this.io.to(memberRoom).emit('group:created', eventData);
    });
  }

  @OnEvent(CHAT_GROUP_MESSAGE_DELETED_EVENT)
  handleGroupMessageDeleted(payload: {
    messageId: string;
    groupID: string;
    senderID: string;
    senderType: ChatParticipantTypeEnum;
    memberIDs: string[];
    timestamp: Date;
  }): void {
    const groupRoom = this.buildGroupRoom(payload.groupID);
    const deleteEvent = {
      messageId: payload.messageId,
      groupID: payload.groupID,
      deletedAt: payload.timestamp,
    };

    this.io.to(groupRoom).emit('message:deleted', deleteEvent);

    payload.memberIDs.forEach((memberID) => {
      const memberRoom = this.buildRoom(ChatParticipantTypeEnum.USER, memberID);
      this.io.to(memberRoom).emit('message:deleted', deleteEvent);
    });
  }

  @OnEvent(CHAT_GROUP_DELETED_EVENT)
  handleGroupDeleted(payload: { groupID: string; deletedBy: string; timestamp: string }): void {
    const groupRoom = this.buildGroupRoom(payload.groupID);
    this.io.to(groupRoom).emit('group:deleted', {
      groupID: payload.groupID,
      deletedBy: payload.deletedBy,
      deletedAt: payload.timestamp,
    });
  }

  @OnEvent(CHAT_GROUP_MESSAGE_EDITED_EVENT)
  handleGroupMessageEdited(payload: {
    groupID: string;
    messageId: string;
    memberIDs: string[];
    message: ChatMessageResponseDto;
  }): void {
    const groupRoom = this.buildGroupRoom(payload.groupID);

    this.io.to(groupRoom).emit('message:edited', payload.message);

    payload.memberIDs.forEach((memberID) => {
      const memberRoom = this.buildRoom(ChatParticipantTypeEnum.USER, memberID);
      this.io.to(memberRoom).emit('message:edited', payload.message);
    });
  }

  // Helpers -----------------------------------------------------------------
  private async authenticate(client: Socket): Promise<JwtPayload> {
    const token =
      client.handshake.auth?.token ||
      client.handshake.query?.token ||
      (client.handshake.headers.authorization ?? '').replace('Bearer ', '');

    if (!token) {
      throw new WsException('Missing auth token');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify<JwtPayload>(token as string, { secret });
      return payload;
    } catch (error) {
      throw new WsException('Invalid token');
    }
  }

  private async ensurePermission(user: JwtPayload, action: 'VIEW' | 'CREATE' = 'VIEW') {
    const hasPermission = await this.authorizationService.hasPermission(user.sub, `CHAT.${action}`);
    console.log(hasPermission);
    if (!hasPermission) throw new WsException('Forbidden');
  }

  private track(room: string, socketId: string): void {
    const set = this.connections.get(room) ?? new Set<string>();
    set.add(socketId);
    this.connections.set(room, set);
  }

  private untrack(room: string, socketId: string): void {
    const set = this.connections.get(room);
    if (!set) return;
    set.delete(socketId);
    if (!set.size) this.connections.delete(room);
  }

  private buildRoom(type: ChatParticipantTypeEnum, id: string): string {
    return `${type}:${id}`;
  }

  private buildGroupRoom(groupID: string): string {
    return `group:${groupID}`;
  }

  private normalizeType(userType: string | undefined): ChatParticipantTypeEnum {
    return ChatParticipantTypeEnum.USER;
  }
}
