// Libraries
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

// Enums
import { ChatParticipantTypeEnum } from '@/common/enums';

export class ChatParticipantResponseDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  participantID!: string;

  @ApiProperty({ enum: ChatParticipantTypeEnum })
  @Expose()
  participantType!: ChatParticipantTypeEnum;

  @ApiPropertyOptional()
  @Expose()
  firstName?: string | null;

  @ApiPropertyOptional()
  @Expose()
  lastName?: string | null;

  @ApiPropertyOptional()
  @Expose()
  departmentName?: string | null;

  @ApiPropertyOptional()
  @Expose()
  position?: string | null;

  @ApiPropertyOptional({ description: 'Profile photo URL.' })
  @Expose()
  photoUrl?: string | null;
}
