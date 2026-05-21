# Ticket Contact Preferences Design

**Date:** 2025-12-25
**Status:** Approved

## Overview

Ticket oluşturulurken müşteri nasıl iletişime geçilmesi gerektiğini seçebilecek (EMAIL, SMS, PUSH). Bu tercih ticket üzerinde görünür olacak. Eğer boş bırakılırsa, kullanıcının notification preferences'ından aktif kanallar kopyalanacak.

## Design Decisions

| Karar | Seçim | Gerekçe |
|-------|-------|---------|
| Kanal seçenekleri | EMAIL, SMS, PUSH | NotificationPreference ile uyumlu |
| Çoklu tercih | Evet | Müşteri birden fazla kanal seçebilir |
| Boş bırakılırsa | User preferences kopyalanır | Tüm `enabled: true` kanallar |
| Veri modeli | Junction table | Relational best practice, genişletilebilir |
| Güncelleme davranışı | Snapshot | Tercihler ticket'a kopyalanır, user preferences sonradan değişse bile ticket etkilenmez |

## Data Model

### New Enum
```prisma
enum ContactPreferenceChannel {
  EMAIL
  SMS
  PUSH
}
```

### New Model
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

### Ticket Model Update
```prisma
model Ticket {
  // ... existing fields
  contactPreferences TicketContactPreference[]
}
```

## DTO Changes

### CreateTicketDto
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

### TicketResDto
```typescript
@Expose()
@ApiProperty({ enum: ContactPreferenceChannelEnum, isArray: true })
contactPreferences: ContactPreferenceChannelEnum[];
```

### New Enum File
```typescript
// src/modules/tickets/enums/contact-preference-channel.enum.ts
export enum ContactPreferenceChannelEnum {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
}
```

## Service Logic

### Create Flow
1. Check if `dto.contactPreferences` is provided
2. If empty/null, fetch user's active notification preferences
3. Map NotificationPreference channel (Int) to ContactPreferenceChannelEnum
4. Create ticket with nested `contactPreferences` using `createMany`

### Channel Mapping
```typescript
// NotificationPreference.channel -> ContactPreferenceChannelEnum
0 -> EMAIL
1 -> SMS
2 -> PUSH
```

### Update Flow
- Replace strategy: deleteMany + createMany in transaction
- Atomic update ensures consistency

## Response Mapping

Junction table data is flattened to string array in response:
```typescript
contactPreferences: ticket.contactPreferences.map(cp => cp.channel)
// Result: ['EMAIL', 'SMS']
```

## Files to Modify

1. `prisma/schema/ticket.prisma` - Add enum and model
2. `src/modules/tickets/enums/contact-preference-channel.enum.ts` - New file
3. `src/modules/tickets/dto/request/create-ticket.dto.ts` - Add field
4. `src/modules/tickets/dto/request/update-ticket.dto.ts` - Add field
5. `src/modules/tickets/dto/response/ticket-res.dto.ts` - Add field
6. `src/modules/tickets/services/tickets.service.ts` - Add logic
7. Run migration: `npm run prisma:migrate`
