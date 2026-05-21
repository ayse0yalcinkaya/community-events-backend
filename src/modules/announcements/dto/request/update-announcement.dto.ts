import { PartialType } from '@nestjs/mapped-types';
import { AnnouncementReqDto } from './announcement.dto';

export class UpdateAnnouncementDto extends PartialType(AnnouncementReqDto) {}
