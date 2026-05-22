import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDate } from 'class-validator';

class EventSessionInputDto {
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
