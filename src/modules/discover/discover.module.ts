import { Module } from '@nestjs/common';

import { DiscoverController } from './controllers/discover.controller';
import { DiscoverService } from './services/discover.service';

@Module({
  controllers: [DiscoverController],
  providers: [DiscoverService],
  exports: [DiscoverService],
})
export class DiscoverModule {}
