import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ModuleResDto {
  @ApiProperty({ description: 'Module ID' })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Translated module name' })
  @Expose()
  name!: string;

  @ApiProperty({ description: 'Translated module description' })
  @Expose()
  description!: string;
}
