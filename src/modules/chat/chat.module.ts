import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Modules
import { PrismaModule } from '@/database/prisma.module';
import { FilesModule } from '@/modules/files/files.module';
import { PermissionsModule } from '@/modules/permissions/permissions.module';
import { AuthModule } from '@/modules/auth/auth.module';

// Controllers
import { ChatController } from './controllers/chat.controller';

// Services
import { ChatService } from './services/chat.service';
import { ChatRepository } from './repositories/chat.repository';
import { ChatGateway } from './gateway/chat.gateway';

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
})
export class ChatModule {}
