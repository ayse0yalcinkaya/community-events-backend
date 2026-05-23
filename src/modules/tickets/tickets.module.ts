import { Module } from '@nestjs/common';

import { PermissionsModule } from '../permissions/permissions.module';
import { TicketsController } from './controllers/tickets.controller';
import { TicketsService } from './services/tickets.service';

@Module({
  imports: [PermissionsModule],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
