// Libraries
import { Module } from '@nestjs/common';

// Services
import { DiscoverService } from './services/discover.service';
import { TrendingService } from './services/trending.service';

// Controllers
import { DiscoverController } from './controllers/discover.controller';

// Modules
import { PrismaModule } from '../../database/prisma.module';
@Module({
  imports: [PrismaModule],
  controllers: [DiscoverController],
  providers: [DiscoverService, TrendingService],
  exports: [DiscoverService, TrendingService],
})
export class DiscoverModule {}
