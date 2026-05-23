// Libraries
import { Module } from '@nestjs/common';

// Services
import { ConnectionsService } from './services/connections.service';

// Controllers
import { ConnectionsController } from './controllers/connections.controller';

// Modules
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({
  imports: [NotificationsModule, ChatModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsService],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}
