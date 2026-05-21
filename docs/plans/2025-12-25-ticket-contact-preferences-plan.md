# Ticket Contact Preferences Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add contact preference selection to tickets with fallback to user notification preferences.

**Architecture:** Junction table `TicketContactPreference` stores multiple channel preferences per ticket. On creation, if empty, system copies user's enabled NotificationPreference channels. Preferences are snapshot at creation time.

**Tech Stack:** NestJS, Prisma, PostgreSQL, class-validator, class-transformer

---

## Task 1: Add Prisma Schema

**Files:**
- Modify: `prisma/schema/ticket.prisma`

**Step 1: Add enum and model to ticket.prisma**

Add after line 35 (before `model Ticket`):

```prisma
enum ContactPreferenceChannel {
  EMAIL
  SMS
  PUSH
}
```

Add after `TicketMessageFile` model (end of file):

```prisma
model TicketContactPreference {
  id        String                   @id @default(uuid()) @db.Uuid
  ticketID  String                   @db.Uuid
  channel   ContactPreferenceChannel
  createdAt DateTime                 @default(now())

  ticket Ticket @relation(fields: [ticketID], references: [id], onDelete: Cascade)

  @@unique([ticketID, channel])
  @@index([ticketID])
  @@map("ticket_contact_preferences")
}
```

**Step 2: Add relation to Ticket model**

Add to Ticket model after `messages` relation:

```prisma
contactPreferences TicketContactPreference[]
```

**Step 3: Generate Prisma client**

Run: `npm run prisma:generate`
Expected: Prisma client generated successfully

**Step 4: Create migration**

Run: `npm run prisma:migrate -- --name add_ticket_contact_preferences`
Expected: Migration created and applied

**Step 5: Commit**

```bash
git add prisma/
git commit -m "feat(tickets): add contact preferences schema"
```

---

## Task 2: Create TypeScript Enum

**Files:**
- Create: `src/modules/tickets/enums/contact-preference-channel.enum.ts`

**Step 1: Create enum file**

```typescript
export enum ContactPreferenceChannelEnum {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
}
```

**Step 2: Commit**

```bash
git add src/modules/tickets/enums/
git commit -m "feat(tickets): add ContactPreferenceChannelEnum"
```

---

## Task 3: Update CreateTicketDto

**Files:**
- Modify: `src/modules/tickets/dto/request/create-ticket.dto.ts`

**Step 1: Add import for new enum**

Add to imports section:

```typescript
import { ContactPreferenceChannelEnum } from '../../enums/contact-preference-channel.enum';
```

Add to class-validator imports:

```typescript
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength, IsArray } from 'class-validator';
```

**Step 2: Add contactPreferences field**

Add after `status` field:

```typescript
@ApiPropertyOptional({
  description: 'Preferred contact channels. If empty, uses user notification preferences.',
  enum: ContactPreferenceChannelEnum,
  isArray: true,
  example: ['EMAIL', 'SMS'],
})
@IsOptional()
@IsArray()
@IsEnum(ContactPreferenceChannelEnum, { each: true })
contactPreferences?: ContactPreferenceChannelEnum[];
```

**Step 3: Run type-check**

Run: `npm run type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add src/modules/tickets/dto/request/
git commit -m "feat(tickets): add contactPreferences to CreateTicketDto"
```

---

## Task 4: Update TicketResDto

**Files:**
- Modify: `src/modules/tickets/dto/response/ticket-res.dto.ts`

**Step 1: Add import**

```typescript
import { ContactPreferenceChannelEnum } from '../../enums/contact-preference-channel.enum';
```

**Step 2: Add contactPreferences field**

Add after `totalSteps` field:

```typescript
@ApiProperty({
  description: 'Preferred contact channels for this ticket',
  enum: ContactPreferenceChannelEnum,
  isArray: true,
  example: ['EMAIL', 'SMS'],
})
@Expose()
@Transform(({ obj }) =>
  Array.isArray(obj.contactPreferences)
    ? obj.contactPreferences.map((cp: { channel: ContactPreferenceChannelEnum }) => cp.channel)
    : [],
)
contactPreferences!: ContactPreferenceChannelEnum[];
```

**Step 3: Run type-check**

Run: `npm run type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add src/modules/tickets/dto/response/
git commit -m "feat(tickets): add contactPreferences to TicketResDto"
```

---

## Task 5: Update TicketsService - Create Method

**Files:**
- Modify: `src/modules/tickets/services/tickets.service.ts`

**Step 1: Add import**

```typescript
import { ContactPreferenceChannelEnum } from '../enums/contact-preference-channel.enum';
```

**Step 2: Add channel mapping helper**

Add after `getNextTicketSequence` method (before closing brace of class):

```typescript
/**
 * Map NotificationPreference channel integer to ContactPreferenceChannelEnum.
 */
private mapNotificationChannelToEnum(channel: number): ContactPreferenceChannelEnum | null {
  const mapping: Record<number, ContactPreferenceChannelEnum> = {
    0: ContactPreferenceChannelEnum.EMAIL,
    1: ContactPreferenceChannelEnum.SMS,
    2: ContactPreferenceChannelEnum.PUSH,
  };
  return mapping[channel] ?? null;
}

/**
 * Resolve contact preferences from DTO or fallback to user's notification preferences.
 */
private async resolveContactPreferences(
  tx: Prisma.TransactionClient,
  userId: string,
  dtoPreferences?: ContactPreferenceChannelEnum[],
): Promise<ContactPreferenceChannelEnum[]> {
  if (dtoPreferences && dtoPreferences.length > 0) {
    return [...new Set(dtoPreferences)]; // Remove duplicates
  }

  const userPrefs = await tx.notificationPreference.findMany({
    where: { userID: userId, enabled: true },
  });

  return userPrefs
    .map((p) => this.mapNotificationChannelToEnum(p.channel))
    .filter((c): c is ContactPreferenceChannelEnum => c !== null);
}
```

**Step 3: Update create method**

In `create` method, after `const ticket = await tx.ticket.create({ data: payload });` (line ~133), add:

```typescript
// Create contact preferences
const contactChannels = await this.resolveContactPreferences(tx, dto.userId, dto.contactPreferences);
if (contactChannels.length > 0) {
  await tx.ticketContactPreference.createMany({
    data: contactChannels.map((channel) => ({
      ticketID: ticket.id,
      channel,
    })),
  });
}
```

**Step 4: Update buildInclude method**

Add to the return object in `buildInclude` method:

```typescript
contactPreferences: {
  select: { channel: true },
},
```

**Step 5: Update buildUserInclude method**

Add to the return object in `buildUserInclude` method:

```typescript
contactPreferences: {
  select: { channel: true },
},
```

**Step 6: Run type-check**

Run: `npm run type-check`
Expected: No errors

**Step 7: Commit**

```bash
git add src/modules/tickets/services/
git commit -m "feat(tickets): implement contact preferences in create flow"
```

---

## Task 6: Update TicketsService - Update Method

**Files:**
- Modify: `src/modules/tickets/services/tickets.service.ts`

**Step 1: Update update method**

In `update` method, inside the transaction (after the `tx.ticket.update` call), add:

```typescript
// Update contact preferences if provided
if (dto.contactPreferences !== undefined) {
  await tx.ticketContactPreference.deleteMany({ where: { ticketID: id } });

  if (dto.contactPreferences.length > 0) {
    const uniqueChannels = [...new Set(dto.contactPreferences)];
    await tx.ticketContactPreference.createMany({
      data: uniqueChannels.map((channel) => ({
        ticketID: id,
        channel,
      })),
    });
  }
}
```

**Step 2: Run type-check**

Run: `npm run type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/modules/tickets/services/
git commit -m "feat(tickets): implement contact preferences update"
```

---

## Task 7: Add Unit Tests

**Files:**
- Modify: `src/modules/tickets/services/tickets.service.spec.ts`

**Step 1: Add test for contact preferences on create**

Add test case:

```typescript
describe('contact preferences', () => {
  it('should create ticket with provided contact preferences', async () => {
    const dto = {
      userId: 'user-id',
      categoryId: 'category-id',
      subject: 'Test ticket',
      description: 'Test description here',
      contactPreferences: [ContactPreferenceChannelEnum.EMAIL, ContactPreferenceChannelEnum.SMS],
    };

    // Mock implementations...

    const result = await service.create(dto);

    expect(result.contactPreferences).toContain(ContactPreferenceChannelEnum.EMAIL);
    expect(result.contactPreferences).toContain(ContactPreferenceChannelEnum.SMS);
  });

  it('should fallback to user notification preferences when contactPreferences is empty', async () => {
    const dto = {
      userId: 'user-id',
      categoryId: 'category-id',
      subject: 'Test ticket',
      description: 'Test description here',
    };

    // Mock notificationPreference.findMany to return enabled preferences

    const result = await service.create(dto);

    // Verify fallback behavior
  });
});
```

**Step 2: Run tests**

Run: `npm test -- --testPathPattern=tickets.service.spec`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/modules/tickets/
git commit -m "test(tickets): add contact preferences unit tests"
```

---

## Task 8: Run Full Test Suite and Lint

**Step 1: Run linter**

Run: `npm run lint`
Expected: No errors

**Step 2: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 3: Run type check**

Run: `npm run type-check`
Expected: No errors

**Step 4: Final commit**

```bash
git add .
git commit -m "chore: finalize ticket contact preferences feature"
```

---

## Verification Checklist

- [ ] Migration applied successfully
- [ ] Ticket creation with explicit preferences works
- [ ] Ticket creation without preferences falls back to user preferences
- [ ] Ticket update can change preferences
- [ ] Response includes contactPreferences array
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No linter errors
