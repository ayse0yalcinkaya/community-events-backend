// Libraries
import { Module } from '@nestjs/common';

// Services
import { UsersService } from './services/users.service';

// Modules
import { PrismaModule } from '../../database/prisma.module';

// Guards/Decorators
import { AuthModule } from '../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ProfileController } from './controllers/profile.controller';
import { UsersController } from './controllers/users.controller';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    PrismaModule, // For database access via PrismaService
    AuthModule, // For JwtAuthGuard, @CurrentUser decorator, and OtpService
    PermissionsModule, // For PermissionsGuard and AuthorizationService
    FilesModule, // For profile image upload
  ],
  controllers: [ProfileController, UsersController],
  providers: [UsersService],
  exports: [UsersService], // Export for use by other modules
})
export class UsersModule {}
