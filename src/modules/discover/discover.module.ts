// Libraries
import { Module } from '@nestjs/common';

// Services
import { DiscoverService } from './services/discover.service';
import { TrendingService } from './services/trending.service';

// Controllers
import { DiscoverController } from './controllers/discover.controller';
@Module({
  controllers: [DiscoverController],
  providers: [DiscoverService, TrendingService],
  exports: [DiscoverService, TrendingService],
})
export class DiscoverModule {}
