// Libraries
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

// Response Classes
import { createApiResponseClass, createPaginatedApiResponseClass, ErrorApiResponseClass } from '@/common/swagger';

// DTOs
import { CreateChatMessageDto } from '../dto/request/create-chat-message.dto';
import { EditChatMessageDto } from '../dto/request/edit-chat-message.dto';
import { GetChatConversationsDto } from '../dto/request/get-chat-conversations.dto';
import { GetChatMessagesDto } from '../dto/request/get-chat-messages.dto';
import { GetChatParticipantsDto } from '../dto/request/get-chat-participants.dto';
import { MarkChatMessagesReadDto } from '../dto/request/mark-chat-messages-read.dto';
import { CreateChatGroupDto } from '../dto/request/create-chat-group.dto';
import { AddGroupMembersDto } from '../dto/request/add-group-members.dto';
import { RenameGroupDto } from '../dto/request/rename-group.dto';
import { DeleteChatMessageDto } from '../dto/request/delete-chat-message.dto';
import { ChatConversationSummaryDto, ChatMessageResponseDto } from '../dto/response/chat-message.response.dto';
import { MarkReadResponseDto } from '../dto/response/mark-read.response.dto';
import { ChatParticipantResponseDto } from '../dto/response/chat-participant.response.dto';
import { ChatGroupMemberResponseDto, ChatGroupResponseDto } from '../dto/response/chat-group.response.dto';

// Interfaces
import type { JwtPayload } from '@/modules/auth/interfaces/jwt-payload.interface';

// Enums
import { ActionEnum } from '@/common/enums/action.enum';

// Decorators
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permission } from '@/common/decorators/permission.decorator';

// Guards
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';

// Services
import { ChatService } from '../services/chat.service';

@ApiTags('Chat')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  @ApiOperation({ summary: 'Create a new chat message between participants.' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Chat message created successfully',
    type: createApiResponseClass(ChatMessageResponseDto),
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Chat message payload with optional attachments.',
    type: CreateChatMessageDto,
  })
  @UseInterceptors(AnyFilesInterceptor())
  @Permission('CHAT', ActionEnum.CREATE)
  async sendMessage(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: CreateChatMessageDto,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<ChatMessageResponseDto> {
    return this.chatService.sendMessage(currentUser, dto, files);
  }

  @Post('groups')
  @ApiOperation({ summary: 'Create a new chat group.' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Chat group created successfully',
    type: createApiResponseClass(ChatGroupResponseDto),
  })
  @Permission('CHAT', ActionEnum.CREATE)
  async createGroup(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: CreateChatGroupDto,
  ): Promise<ChatGroupResponseDto> {
    return this.chatService.createGroup(currentUser, dto);
  }

  @Post('groups/:groupId/members')
  @ApiOperation({ summary: 'Add members to a chat group.' })
  @ApiParam({ name: 'groupId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Members added',
    type: createApiResponseClass(ChatGroupMemberResponseDto),
  })
  @Permission('CHAT', ActionEnum.CREATE)
  async addGroupMembers(
    @CurrentUser() currentUser: JwtPayload,
    @Param('groupId') groupId: string,
    @Body() dto: AddGroupMembersDto,
  ): Promise<ChatGroupMemberResponseDto[]> {
    return this.chatService.addGroupMembers(currentUser, groupId, dto);
  }

  @Delete('groups/:groupId/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from a chat group.' })
  @ApiParam({ name: 'groupId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'memberId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Member removed',
    type: ErrorApiResponseClass,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permission('CHAT', ActionEnum.UPDATE)
  async removeGroupMember(
    @CurrentUser() currentUser: JwtPayload,
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
  ): Promise<void> {
    await this.chatService.removeGroupMember(currentUser, groupId, memberId);
  }

  @Post('groups/:groupId/leave')
  @ApiOperation({ summary: 'Leave a chat group.' })
  @ApiParam({ name: 'groupId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Left group successfully',
    type: ErrorApiResponseClass,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permission('CHAT', ActionEnum.UPDATE)
  async leaveGroup(@CurrentUser() currentUser: JwtPayload, @Param('groupId') groupId: string): Promise<void> {
    await this.chatService.leaveGroup(currentUser, groupId);
  }

  @Patch('groups/:groupId')
  @ApiOperation({ summary: 'Rename a chat group.' })
  @ApiParam({ name: 'groupId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Group renamed',
    type: ErrorApiResponseClass,
  })
  @Permission('CHAT', ActionEnum.UPDATE)
  async renameGroup(
    @CurrentUser() currentUser: JwtPayload,
    @Param('groupId') groupId: string,
    @Body() dto: RenameGroupDto,
  ): Promise<void> {
    await this.chatService.renameGroup(currentUser, groupId, dto.name);
  }

  @Patch('groups/:groupId/photo')
  @ApiOperation({ summary: 'Update group photo. Only group owner can update.' })
  @ApiParam({ name: 'groupId', type: 'string', format: 'uuid' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Group photo upload. Send empty to remove photo.',
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Photo file (JPEG, PNG). Max 5MB.',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Group photo updated',
    type: createApiResponseClass(ChatGroupResponseDto),
  })
  @ApiForbiddenResponse({
    description: 'User is not group owner',
    type: ErrorApiResponseClass,
  })
  @ApiNotFoundResponse({
    description: 'Group not found',
    type: ErrorApiResponseClass,
  })
  @Permission('CHAT', ActionEnum.UPDATE)
  @UseInterceptors(AnyFilesInterceptor())
  async updateGroupPhoto(
    @CurrentUser() currentUser: JwtPayload,
    @Param('groupId') groupId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<ChatGroupResponseDto> {
    const file = files?.find((f) => f.fieldname === 'photo');
    return this.chatService.updateGroupPhoto(currentUser, groupId, file);
  }

  @Get('groups/:groupId/members')
  @ApiOperation({ summary: 'List members of a chat group.' })
  @ApiParam({ name: 'groupId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Group members retrieved successfully',
    type: createPaginatedApiResponseClass(ChatGroupMemberResponseDto),
  })
  @ApiForbiddenResponse({
    description: 'User is not a member of the group',
    type: ErrorApiResponseClass,
  })
  @ApiNotFoundResponse({
    description: 'Group not found',
    type: ErrorApiResponseClass,
  })
  @Permission('CHAT', ActionEnum.VIEW)
  async listGroupMembers(
    @CurrentUser() currentUser: JwtPayload,
    @Param('groupId') groupId: string,
  ): Promise<ChatGroupMemberResponseDto[]> {
    return this.chatService.getGroupMembers(currentUser, groupId);
  }

  @Get('messages')
  @ApiOperation({ summary: 'Fetch chat messages between the current user and a counterpart.' })
  @ApiQuery({
    name: 'conversationType',
    required: false,
    enum: ['DIRECT', 'GROUP'],
    description: 'Conversation type; when GROUP, receiverID should be the groupID.',
  })
  @ApiQuery({
    name: 'receiverID',
    required: false,
    description: 'Alias for counterpartID; use for GROUP with groupID.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chat messages retrieved successfully',
    type: createPaginatedApiResponseClass(ChatMessageResponseDto),
  })
  @Permission('CHAT', ActionEnum.VIEW)
  async getConversation(
    @CurrentUser() currentUser: JwtPayload,
    @Query() query: GetChatMessagesDto,
  ): Promise<ChatMessageResponseDto[]> {
    return this.chatService.getConversationMessages(currentUser, query);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List conversations with latest message and unread counts.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversation list retrieved successfully',
    type: createPaginatedApiResponseClass(ChatConversationSummaryDto),
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max conversations to return (default 20, max 100).',
    example: 20,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-indexed, default 1).',
    example: 1,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Filter by counterpart first or last name.',
  })
  @Permission('CHAT', ActionEnum.VIEW)
  async listConversations(
    @CurrentUser() currentUser: JwtPayload,
    @Query() query: GetChatConversationsDto,
  ): Promise<{ items: ChatConversationSummaryDto[]; count: number }> {
    return this.chatService.listConversations(currentUser, query);
  }

  @Get('participants')
  @ApiOperation({ summary: 'List available chat participants.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chat participants retrieved successfully',
    type: createPaginatedApiResponseClass(ChatParticipantResponseDto),
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Filter by participant first or last name (case-insensitive).',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max participants to return (default 20, max 100).',
    example: 20,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-indexed, default 1).',
    example: 1,
  })
  @Permission('CHAT', ActionEnum.VIEW)
  async listParticipants(
    @CurrentUser() currentUser: JwtPayload,
    @Query() query: GetChatParticipantsDto,
  ): Promise<{ items: ChatParticipantResponseDto[]; count: number }> {
    return this.chatService.listChatParticipants(currentUser, query);
  }

  @Patch('messages/read')
  @ApiOperation({ summary: 'Mark messages as read for the current user.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Messages marked as read successfully',
    type: createApiResponseClass(MarkReadResponseDto),
  })
  @Permission('CHAT', ActionEnum.UPDATE)
  async markAsRead(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: MarkChatMessagesReadDto,
  ): Promise<MarkReadResponseDto> {
    return this.chatService.markMessagesAsRead(currentUser, dto);
  }

  @Patch('messages/:messageId')
  @ApiOperation({ summary: 'Edit an existing chat message.' })
  @ApiParam({ name: 'messageId', description: 'UUID of the message to edit' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Message edited successfully',
    type: createApiResponseClass(ChatMessageResponseDto),
  })
  @ApiNotFoundResponse({
    description: 'Message not found',
    type: ErrorApiResponseClass,
  })
  @Permission('CHAT', ActionEnum.UPDATE)
  async editMessage(
    @CurrentUser() currentUser: JwtPayload,
    @Param('messageId') messageId: string,
    @Body() dto: EditChatMessageDto,
  ): Promise<ChatMessageResponseDto> {
    return this.chatService.editMessage(currentUser, messageId, dto);
  }

  @Delete('messages/:messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a chat message (soft delete).',
    description: 'Delete a message. For group messages, set conversationType to GROUP and provide groupID.',
  })
  @ApiParam({ name: 'messageId', description: 'UUID of the message to delete' })
  @ApiQuery({
    name: 'conversationType',
    required: false,
    enum: ['DIRECT', 'GROUP'],
    description: 'Conversation type. Defaults to DIRECT.',
  })
  @ApiQuery({
    name: 'groupID',
    required: false,
    description: 'Group ID. Required when conversationType is GROUP.',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Message deleted successfully',
  })
  @ApiNotFoundResponse({
    description: 'Message not found',
    type: ErrorApiResponseClass,
  })
  @ApiForbiddenResponse({
    description: 'User is not the message sender or not a group member',
    type: ErrorApiResponseClass,
  })
  @ApiBadRequestResponse({
    description: 'Group ID required for GROUP conversation type',
    type: ErrorApiResponseClass,
  })
  @Permission('CHAT', ActionEnum.DELETE)
  async deleteMessage(
    @CurrentUser() currentUser: JwtPayload,
    @Param('messageId') messageId: string,
    @Query() query: DeleteChatMessageDto,
  ): Promise<void> {
    return this.chatService.deleteMessage(currentUser, messageId, query.conversationType, query.groupID);
  }

  @Delete('groups/:groupId/conversation')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete group conversation for current user (hide all messages in group).',
    description:
      'Clears the group conversation for the current user only. ' +
      'Other group members still see all messages. If new messages are sent after deletion, ' +
      'the conversation will reappear.',
  })
  @ApiParam({ name: 'groupId', description: 'UUID of the group whose conversation to delete' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Group conversation deleted successfully for the current user',
  })
  @ApiForbiddenResponse({
    description: 'User is not a member of the group',
    type: ErrorApiResponseClass,
  })
  @Permission('CHAT', ActionEnum.DELETE)
  async deleteGroupConversation(
    @CurrentUser() currentUser: JwtPayload,
    @Param('groupId') groupId: string,
  ): Promise<void> {
    return this.chatService.deleteGroupConversation(currentUser, groupId);
  }

  @Delete('conversations/:counterpartID')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete conversation for current user (hide all messages with counterpart).',
    description:
      'Clears the conversation with the specified counterpart for the current user only. ' +
      'The counterpart still sees all messages. If new messages are sent after deletion, ' +
      'the conversation will reappear.',
  })
  @ApiParam({ name: 'counterpartID', description: 'UUID of the counterpart whose conversation to delete' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Conversation deleted successfully for the current user',
  })
  @ApiNotFoundResponse({
    description: 'Counterpart not found',
    type: ErrorApiResponseClass,
  })
  @Permission('CHAT', ActionEnum.DELETE)
  async deleteConversation(
    @CurrentUser() currentUser: JwtPayload,
    @Param('counterpartID') counterpartID: string,
  ): Promise<void> {
    return this.chatService.deleteConversation(currentUser, counterpartID);
  }
}
