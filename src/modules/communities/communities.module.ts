// Libraries
import { Module } from '@nestjs/common';

// Services
import { CommunitiesService } from './services/communities.service';

// Controllers
import { CommunitiesController } from './controllers/communities.controller';

// Modules
import { AnnouncementsModule } from '../announcements/announcements.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FilesModule } from '../files/files.module';
import { PermissionsModule } from '../permissions/permissions.module';
@Module({
  imports: [AnnouncementsModule, FilesModule, PermissionsModule, NotificationsModule],
  controllers: [CommunitiesController],
  providers: [CommunitiesService],
  exports: [CommunitiesService],
})
export class CommunitiesModule {}
