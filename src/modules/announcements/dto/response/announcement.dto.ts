import { Expose, Type } from 'class-transformer';
import { AnnouncementScope, AnnouncementStatus, AnnouncementType } from '../../enums/announcement.enum';
import { FileResDto } from '@/modules/files/dto/response/file-res.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnnouncementResDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  title!: string;

  @ApiProperty({ enum: AnnouncementType, enumName: 'AnnouncementType' })
  @Expose()
  type!: AnnouncementType;

  @ApiPropertyOptional()
  @Expose()
  content?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @Expose()
  imageFileID?: string | null;

  @ApiPropertyOptional({ type: () => FileResDto })
  @Expose()
  @Type(() => FileResDto)
  imageFile?: FileResDto | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @Expose()
  start_date?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @Expose()
  end_date?: Date | null;

  @ApiProperty({ enum: AnnouncementScope, enumName: 'AnnouncementScope' })
  @Expose()
  scope!: AnnouncementScope;

  @ApiPropertyOptional()
  @Expose()
  createdBy?: string | null;

  @ApiProperty({ enum: AnnouncementStatus, enumName: 'AnnouncementStatus' })
  @Expose()
  status!: AnnouncementStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @Expose()
  updatedAt!: Date;
}
