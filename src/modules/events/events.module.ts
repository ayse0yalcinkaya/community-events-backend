import { Module } from '@nestjs/common';

import { FilesModule } from '../files/files.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { EventsController } from './controllers/events.controller';
import { EventsService } from './services/events.service';

@Module({
  imports: [FilesModule, PermissionsModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
