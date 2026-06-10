import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class QueryDiscoverPeopleDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  limit?: number = 12;
}
