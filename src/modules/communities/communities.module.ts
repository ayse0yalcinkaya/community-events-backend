import { Module } from '@nestjs/common';

import { CommunitiesController } from './controllers/communities.controller';
import { CommunitiesService } from './services/communities.service';

@Module({
  controllers: [CommunitiesController],
  providers: [CommunitiesService],
  exports: [CommunitiesService],
})
export class CommunitiesModule {}
