// Libraries
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Services
import { FilesService } from './services/files.service';
import { S3Service } from './services/s3.service';

// Modules
import { PrismaModule } from '../../database/prisma.module';

// Guards/Decorators
import { PermissionsModule } from '../permissions/permissions.module';
import { FilesController } from './controllers/files.controller';

@Module({
  imports: [
    ConfigModule, // Import ConfigModule to access aws.config.ts
    PrismaModule, // Import PrismaModule for database access
    PermissionsModule, // Import PermissionsModule for AuthorizationService (used by PermissionsGuard)
  ],
  providers: [S3Service, FilesService],
  controllers: [FilesController],
  exports: [S3Service, FilesService], // Export services for use in other modules
})
export class FilesModule {}
