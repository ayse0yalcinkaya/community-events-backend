import { Module } from '@nestjs/common';

import { FilesModule } from '../files/files.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { CommunitiesController } from './controllers/communities.controller';
import { CommunitiesService } from './services/communities.service';

@Module({
  imports: [FilesModule, PermissionsModule],
  controllers: [CommunitiesController],
  providers: [CommunitiesService],
  exports: [CommunitiesService],
})
export class CommunitiesModule {}
