import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDate, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

class EventSessionInputDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID('4')
  speakerID?: string;

  @Type(() => Date)
  @IsDate()
  startAt!: Date;

  @Type(() => Date)
  @IsDate()
  endAt!: Date;
}

export class UpdateEventScheduleDto {
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => EventSessionInputDto)
  sessions!: EventSessionInputDto[];
}
