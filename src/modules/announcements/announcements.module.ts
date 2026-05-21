import { Module } from '@nestjs/common';
import { AnnouncementsService } from './services/announcements.service';
import { AnnouncementsController } from './controllers/announcements.controller';
import { PrismaModule } from '@/database/prisma.module';
import { PermissionsModule } from '@/modules/permissions/permissions.module';
import { FilesModule } from '@/modules/files/files.module';

@Module({
  imports: [PrismaModule, PermissionsModule, FilesModule],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
