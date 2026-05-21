// Libraries
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

// Enums
import { SmsType } from '../../enums/sms-type.enum';
import { SmsStatus } from '../../enums/sms-status.enum';

/**
 * SMS Response DTO
 * Excludes sensitive fields: domainID, errorMessage (if not failed)
 * Includes SMS tracking information
 */
export class SmsResDto {
  @Expose()
  @ApiProperty({
    description: 'SMS record ID',
    example: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  id!: string;

  @Expose()
  @ApiProperty({
    description: 'Phone number (E.164 format)',
    example: '+905551234567',
  })
  phoneNumber!: string;

  @Expose()
  @ApiProperty({
    description: 'SMS message content',
    example: 'Your OTP code is 123456',
  })
  message!: string;

  @Expose()
  @ApiProperty({
    description: 'SMS type',
    enum: SmsType,
    example: SmsType.OTP,
  })
  type!: SmsType;

  @Expose()
  @ApiProperty({
    description: 'SMS status',
    enum: SmsStatus,
    example: SmsStatus.SENT,
  })
  status!: SmsStatus;

  @Expose()
  @ApiProperty({
    description: 'SMS provider name',
    example: 'FONIVA',
  })
  provider!: string;

  @Expose()
  @ApiProperty({
    description: 'Provider message ID (FONIVA message ID)',
    example: 'msg-123456',
    required: false,
  })
  providerId?: string;

  @Expose()
  @ApiProperty({
    description: 'Number of send attempts',
    example: 1,
  })
  attemptCount!: number;

  @Expose()
  @ApiProperty({
    description: 'Error message (if failed)',
    example: 'Network error',
    required: false,
  })
  errorMessage?: string;

  @Expose()
  @ApiProperty({
    description: 'Timestamp when SMS was sent',
    example: '2025-11-07T10:00:00Z',
    required: false,
  })
  sentAt?: Date;

  @Expose()
  @ApiProperty({
    description: 'Timestamp when SMS was delivered',
    example: '2025-11-07T10:00:05Z',
    required: false,
  })
  deliveredAt?: Date;

  @Expose()
  @ApiProperty({
    description: 'Timestamp when SMS record was created',
    example: '2025-11-07T10:00:00Z',
  })
  createdAt!: Date;

  @Expose()
  @ApiProperty({
    description: 'Timestamp when SMS record was last updated',
    example: '2025-11-07T10:00:05Z',
  })
  updatedAt!: Date;

  // Excluded fields (not exposed):
  // - domainID: Internal multi-tenancy field
}
