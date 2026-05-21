// Libraries
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

// Modules
import { FilesModule } from '../modules/files/files.module';

// Guards/Decorators
import { HealthController } from './health.controller';

@Module({
  imports: [
    TerminusModule,
    FilesModule, // Import FilesModule to access S3Service
  ],
  controllers: [HealthController],
})
export class HealthModule {}
