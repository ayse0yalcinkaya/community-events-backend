// Libraries
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ChatGateway } from './gateway/chat.gateway';

// Services
import { ChatService } from './services/chat.service';

// Repositories
import { ChatRepository } from './repositories/chat.repository';

// Controllers
import { ChatController } from './controllers/chat.controller';

// Modules
import { PrismaModule } from '@/database/prisma.module';
import { FilesModule } from '@/modules/files/files.module';
import { PermissionsModule } from '@/modules/permissions/permissions.module';
import { AuthModule } from '@/modules/auth/auth.module';
@Module({
  imports: [PrismaModule, FilesModule, PermissionsModule, AuthModule, EventEmitterModule.forRoot()],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatGateway,
    {
      provide: 'IChatRepository',
      useClass: ChatRepository,
    },
  ],
  exports: [ChatService],
})
export class ChatModule {}
