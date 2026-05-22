import { IsEnum } from 'class-validator';

import { AttendanceVisibility } from '@prisma/client';

export class UpdateAttendanceDto {
  @IsEnum(AttendanceVisibility)
  visibility!: AttendanceVisibility;
}
