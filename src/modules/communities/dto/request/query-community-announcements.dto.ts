import { Transform } from 'class-transformer';
import { IsOptional, IsPositive } from 'class-validator';

export class QueryCommunityAnnouncementsDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsPositive()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsPositive()
  limit?: number = 10;
}
