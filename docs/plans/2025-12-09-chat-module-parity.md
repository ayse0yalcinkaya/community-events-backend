# Chat Module Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reproduce the hrsync chat module (REST + Gateway + groups) in this project, keeping identical endpoints and behaviors while adapting to a single `users` table (no staff table, no domain scoping) and Prisma.

**Architecture:** NestJS module under `src/modules/chat` with Prisma-backed repository, Socket.IO gateway, JSONB attachment metadata, AES-style content encryption helpers, and permission-guarded controllers. Participant columns become `senderUserId`/`receiverUserId` (both FK → users). All domain filters removed; participant type defaults to `USER` but enums are preserved for API shape.

**Tech Stack:** NestJS v11, Prisma, class-validator/transformer, Socket.IO gateway, @nestjs/event-emitter, Files module for uploads, i18n translations, Jest for unit tests.

### Task 1: Align Prisma schema to chat tables
**Files:**
- Modify: `prisma/schema/chat.prisma`
- Modify: `prisma/schema/user.prisma`
- Modify: `prisma/schema/file.prisma` (drop unused relations to removed chat attachment join table)
- New migration: `prisma/schema/migrations/<timestamp>_chat_module_parity`

**Step 1: Rewrite `ChatMessage`, `ChatGroup`, `ChatGroupMember`, `ChatGroupMessage`, `ChatDeletedConversation` models with JSONB attachment/metadata, status smallint, `senderUserId`/`receiverUserId` FKs to `User`, and snake_case table names.**

```prisma
model ChatMessage {
  id             String   @id @default(uuid()) @db.Uuid
  senderUserId   String   @db.Uuid
  receiverUserId String   @db.Uuid
  senderType     ChatParticipantType @default(USER)
  receiverType   ChatParticipantType @default(USER)
  content        String
  attachment     Json?
  metadata       Json?
  status         ChatMessageStatus @default(PENDING)
  isEdited       Boolean @default(false)
  editedAt       DateTime?
  deletedAt      DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  sender User @relation("ChatSender", fields: [senderUserId], references: [id])
  receiver User @relation("ChatReceiver", fields: [receiverUserId], references: [id])
  @@index([senderUserId, receiverUserId, createdAt])
  @@index([receiverUserId, status])
  @@map("chats")
}
```

**Step 2: Remove unused conversation/read-receipt/attachment models from `chat.prisma`; adjust `User` relations (sentMessages, receivedMessages, group memberships/messages) and `File` relations to match JSON metadata approach.**

**Step 3: Add Prisma enums `ChatParticipantType`, `ChatMessageStatus`, `ChatGroupRole` matching hrsync values; set defaults to USER/PENDING/MEMBER as needed.**

**Step 4: Run schema formatting and create migration scaffold.**
- Run: `npx prisma format --schema prisma/schema/schema.prisma`
- Run: `npm run prisma:migrate:raw -- --name chat_module_parity`
- Expected: Migration files generated without errors.

### Task 2: Add shared enums/constants for chat
**Files:**
- Add: `src/common/enums/chat-message-status.enum.ts`
- Add: `src/common/enums/chat-participant-type.enum.ts`
- Add: `src/common/enums/chat-group-role.enum.ts`
- Add: `src/common/enums/chat-conversation-type.enum.ts`
- Modify: `src/common/enums/index.ts`

**Step 1: Define enums mirroring hrsync values (`PENDING=0`, `READED=1`, `SENT_PUSH=2`; participant types USER/STAFF; group roles OWNER/ADMIN/MEMBER; conversation type DIRECT/GROUP).**

**Step 2: Export from `index.ts` for module-wide imports.**

### Task 3: Scaffold chat module structure and DTOs
**Files:**
- Create: `src/modules/chat/chat.module.ts`
- Create dirs/files under `src/modules/chat/{controllers,dto/{request,response},interfaces,constants,gateway,services,repositories}` mirroring hrsync names
- Add: `src/modules/chat/constants/events.ts`
- Add: `src/modules/chat/interfaces/chat-repository.interface.ts`
- Add DTOs: `create-chat-message.dto.ts`, `edit-chat-message.dto.ts`, `get-chat-messages.dto.ts`, `get-chat-conversations.dto.ts`, `get-chat-participants.dto.ts`, `mark-chat-messages-read.dto.ts`, `create-chat-group.dto.ts`, `add-group-members.dto.ts`, `rename-group.dto.ts`
- Add response DTOs: `chat-message.response.dto.ts`, `chat-group.response.dto.ts`, `chat-participant.response.dto.ts`, `mark-read.response.dto.ts`

**Step 1: Copy hrsync DTO shapes but drop domain/userType/staff-specific validation; keep metadata/attachment schemas and conversationType default DIRECT.**

**Step 2: Wire DTO decorators (`@ApiProperty`, validation rules) and response transformers to keep API parity with hrsync payloads.**

### Task 4: Implement Prisma-backed repository and service logic
**Files:**
- Add: `src/modules/chat/repositories/chat.repository.ts`
- Add: `src/modules/chat/services/chat.service.ts`
- Add: `src/modules/chat/services/chat-notification.service.ts` (if hrsync emits notifications)

**Step 1: Implement repository using `PrismaService` to perform CRUD on new chat tables; remove domain filters; always use `senderUserId`/`receiverUserId`; ensure pagination and unread counts match hrsync queries.**

**Step 2: Port `ChatService` logic from hrsync, adapting helpers:**
- `resolveParticipantType` returns USER; `resolveReceiver` checks `prisma.user` existence only.
- Attachment upload uses existing `FilesService`; validate audio mimetypes/size as hrsync.
- Encryption utilities: reuse `encrypt/decrypt` helpers from `src/common/utils` (or add if missing).
- Group flows (`createGroup`, `addGroupMembers`, `leaveGroup`, `renameGroup`, `sendGroupMessage`, `listGroupMessages`, `listConversations`, `deleteConversation`) updated for Prisma queries and new schema.
- Metadata handling (quoted messages, forwarded, clientMessageId) preserved.

**Step 3: Add `ChatNotificationService` only if hrsync listens for events; otherwise stub/not register.**

### Task 5: Controllers, gateway, and module wiring
**Files:**
- Add: `src/modules/chat/controllers/chat.controller.ts`
- Add: `src/modules/chat/gateway/chat.gateway.ts`
- Modify: `src/app.module.ts` (ensure ChatModule import points to new module)
- Modify: `package.json` (add `@nestjs/event-emitter` dependency)
- Modify: `src/common/guards/permissions.guard.ts` usage already global
- Modify: `src/modules/permissions/constants/permissions.constant.ts` and permission sync data to include CHAT {CREATE, VIEW, UPDATE, DELETE}
- Add: translations `src/modules/i18n/translations/{en,tr}/chat.json` keys for new error messages (`MESSAGE_BODY_REQUIRED`, `RECEIVER_NOT_FOUND`, etc.)

**Step 1: Implement controller mirroring hrsync routes (`/chat/messages`, `/chat/messages/read`, `/chat/messages/:id`, `/chat/conversations`, `/chat/participants`, group routes) using `CurrentUser`/`JwtAuthGuard`/`PermissionsGuard` + `@Permission('CHAT', ActionEnum.<...>)`.**

**Step 2: Gateway mirrors hrsync events but removes domain scoping in room names (room key = `${type}:${userId}`) and uses `JwtStrategy`/`AuthorizationService` to authorize connections; emit events on message create/read/edit/delete/group updates.**

**Step 3: Register providers in `chat.module.ts` (ChatService, ChatRepository, Gateway, FilesModule, PrismaModule, PermissionsModule, EventEmitterModule.forRoot if not already global).**

**Step 4: Update permissions seed data and constants; extend `permission-sync` seed definitions with CHAT module actions.**

### Task 6: Testing and validation
**Files:**
- Add unit tests under `src/modules/chat/__tests__/` mirroring hrsync coverage (service, repository mock, controller, gateway).
- Update jest config if path mapping needed.

**Step 1: Write failing tests for core flows: send direct message (requires receiver exists), list conversations returns unread counts, mark as read updates status, group membership guard, gateway broadcasts on message create.**

**Step 2: Run tests to confirm failures, then implement fixes until green.**
- Run: `npm test -- chat` (or specific `jest src/modules/chat/__tests__/chat.service.spec.ts`) expected FAIL then PASS.

### Task 7: Verification and cleanup
**Step 1: Run format/lint/type-check.**
- `npm run format`
- `npm run lint`
- `npm run type-check`

**Step 2: Summarize migration and new env dependencies (none new besides event-emitter) for PR text.**

Plan complete and saved to `docs/plans/2025-12-09-chat-module-parity.md`. Ready to set up execution using superpowers:executing-plans. Two options:
1) Subagent-driven in this session (use superpowers:subagent-driven-development).
2) Parallel session running executing-plans.
Which approach do you prefer?
