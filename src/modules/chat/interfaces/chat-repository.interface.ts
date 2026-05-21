import { ChatMessageStatusEnum, ChatParticipantTypeEnum, ChatGroupRoleEnum } from '@/common/enums';
import { ChatAttachmentMetadata, ChatMessageMetadata } from './chat-attachment.interface';

export interface CreateChatMessageInput {
  senderID: string;
  senderType: ChatParticipantTypeEnum;
  receiverID: string;
  receiverType: ChatParticipantTypeEnum;
  content: string;
  attachment: ChatAttachmentMetadata[] | ChatAttachmentMetadata | null;
  metadata: ChatMessageMetadata | null;
  status: ChatMessageStatusEnum;
}

export interface CreateChatGroupMessageInput {
  groupID: string;
  senderID: string;
  senderType: ChatParticipantTypeEnum;
  content: string;
  attachment: ChatAttachmentMetadata[] | ChatAttachmentMetadata | null;
  metadata: ChatMessageMetadata | null;
  status: ChatMessageStatusEnum;
}

export interface CreateChatGroupInput {
  name: string;
  ownerID: string;
  createdBy: string;
}

export interface CreateChatGroupMemberInput {
  groupID: string;
  userID: string;
  role: ChatGroupRoleEnum;
}

export interface FetchConversationMessagesOptions {
  participantA: { id: string; type: ChatParticipantTypeEnum };
  participantB: { id: string; type: ChatParticipantTypeEnum };
  limit?: number;
  before?: Date;
}

export interface FetchInboxOptions {
  participant: { id: string; type: ChatParticipantTypeEnum };
  limit?: number;
}

export interface CountUnreadOptions {
  receiverID: string;
  receiverType: ChatParticipantTypeEnum;
  fromSenderId?: string;
  fromSenderType?: ChatParticipantTypeEnum;
}

export interface MarkMessagesAsReadInput {
  receiverID: string;
  receiverType: ChatParticipantTypeEnum;
  messageIds: string[];
}

export interface DeleteConversationForUserInput {
  userID: string;
  userType: ChatParticipantTypeEnum;
  counterpartID: string;
  counterpartType: ChatParticipantTypeEnum;
}

export interface GetDeletedConversationsInput {
  userID: string;
  userType: ChatParticipantTypeEnum;
}

export interface FindDeletedConversationInput {
  userID: string;
  userType: ChatParticipantTypeEnum;
  counterpartID: string;
  counterpartType: ChatParticipantTypeEnum;
}

export interface ListGroupMessagesOptions {
  groupID: string;
  limit?: number;
  before?: Date;
}

export interface CountGroupUnreadOptions {
  groupID: string;
  userID: string;
  since?: Date;
}

export interface ListGroupConversationsOptions {
  userID: string;
  limit: number;
}

export interface GroupConversationRow {
  group: {
    id: string;
    name: string;
    photoUrl?: string | null;
  };
  membership: {
    groupID: string;
    userID: string;
    role: ChatGroupRoleEnum;
    joined_at: Date;
    left_at: Date | null;
  };
  lastMessage: ChatGroupMessage | null;
  unreadCount: number;
}

export interface DeleteGroupConversationForUserInput {
  userId: string;
  groupId: string;
}

export interface ChatGroupDeletedConversation {
  id: string;
  userId: string;
  groupId: string;
  deletedAt: Date;
}

export interface ChatMessage {
  id: string;
  senderID: string;
  sender_type: ChatParticipantTypeEnum;
  receiverID: string;
  receiver_type: ChatParticipantTypeEnum;
  content: string;
  attachment: ChatAttachmentMetadata[] | ChatAttachmentMetadata | null;
  metadata: ChatMessageMetadata | null;
  status: ChatMessageStatusEnum;
  is_edited: boolean;
  edited_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ChatGroup {
  id: string;
  name: string;
  ownerID: string;
  createdBy: string;
  photoFileId: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ChatGroupWithPhoto extends ChatGroup {
  photoUrl?: string | null;
}

export interface ChatGroupMember {
  groupID: string;
  userID: string;
  role: ChatGroupRoleEnum;
  joined_at: Date;
  left_at: Date | null;
}

export interface ChatGroupMessage {
  id: string;
  groupID: string;
  senderID: string;
  sender_type: ChatParticipantTypeEnum;
  content: string;
  attachment: ChatAttachmentMetadata[] | ChatAttachmentMetadata | null;
  metadata: ChatMessageMetadata | null;
  status: ChatMessageStatusEnum;
  is_edited: boolean;
  edited_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ChatDeletedConversation {
  id: string;
  userId: string;
  userType: ChatParticipantTypeEnum;
  counterpartId: string;
  counterpartType: ChatParticipantTypeEnum;
  deletedAt: Date;
}

export interface IChatRepository {
  createMessage(input: CreateChatMessageInput): Promise<ChatMessage>;
  findById(id: string): Promise<ChatMessage | null>;
  findByIds(ids: string[]): Promise<ChatMessage[]>;
  fetchConversationMessages(options: FetchConversationMessagesOptions): Promise<ChatMessage[]>;
  fetchInbox(options: FetchInboxOptions): Promise<ChatMessage[]>;
  markMessagesAsRead(input: MarkMessagesAsReadInput): Promise<number>;
  countUnread(options: CountUnreadOptions): Promise<number>;
  updateMessageContent(id: string, senderID: string, newContent: string): Promise<ChatMessage>;
  softDeleteMessage(id: string, senderID: string): Promise<void>;
  markConversationDeletedForUser(input: DeleteConversationForUserInput): Promise<void>;
  getDeletedConversationsForUser(
    input: GetDeletedConversationsInput,
  ): Promise<{ counterpartID: string; counterpartType: ChatParticipantTypeEnum; deleted_at: Date }[]>;
  findDeletedConversation(input: FindDeletedConversationInput): Promise<{
    counterpartID: string;
    counterpartType: ChatParticipantTypeEnum;
    deleted_at: Date;
  } | null>;

  createGroup(input: CreateChatGroupInput): Promise<ChatGroup>;
  addGroupMembers(members: CreateChatGroupMemberInput[]): Promise<ChatGroupMember[]>;
  removeGroupMember(groupID: string, userID: string): Promise<void>;
  leaveGroup(groupID: string, userID: string): Promise<void>;
  transferOwner(groupID: string, newOwnerID: string): Promise<void>;
  renameGroup(groupID: string, name: string): Promise<void>;
  findGroupById(groupID: string): Promise<ChatGroup | null>;
  findGroupByIdWithPhoto(groupID: string): Promise<ChatGroupWithPhoto | null>;
  updateGroupPhoto(groupID: string, photoFileId: string | null): Promise<void>;
  findGroupMember(groupID: string, userID: string): Promise<ChatGroupMember | null>;
  listGroupMembers(groupID: string): Promise<ChatGroupMember[]>;
  createGroupMessage(input: CreateChatGroupMessageInput): Promise<ChatGroupMessage>;
  listGroupMessages(options: ListGroupMessagesOptions): Promise<ChatGroupMessage[]>;
  findGroupMessageById(messageId: string): Promise<ChatGroupMessage | null>;
  updateGroupMessageContent(id: string, senderID: string, newContent: string): Promise<ChatGroupMessage>;
  softDeleteGroupMessage(id: string, senderID: string): Promise<void>;
  markGroupMessagesAsRead(groupID: string, userID: string, messageIds: string[]): Promise<number>;
  countGroupUnread(options: CountGroupUnreadOptions): Promise<number>;
  listGroupConversations(options: ListGroupConversationsOptions): Promise<GroupConversationRow[]>;
  markGroupConversationDeletedForUser(input: DeleteGroupConversationForUserInput): Promise<void>;
  findDeletedGroupConversation(userId: string, groupId: string): Promise<ChatGroupDeletedConversation | null>;
  getDeletedGroupConversationsForUser(userId: string): Promise<{ groupId: string; deletedAt: Date }[]>;
}
