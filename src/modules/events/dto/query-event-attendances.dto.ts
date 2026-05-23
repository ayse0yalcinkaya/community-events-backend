import { AttendanceStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class QueryEventAttendancesDto {
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;
}
