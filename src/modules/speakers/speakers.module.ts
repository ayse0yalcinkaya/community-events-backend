import { Module } from '@nestjs/common';

import { FilesModule } from '../files/files.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { SpeakersController } from './controllers/speakers.controller';
import { SpeakersService } from './services/speakers.service';

@Module({
  imports: [FilesModule, PermissionsModule],
  controllers: [SpeakersController],
  providers: [SpeakersService],
  exports: [SpeakersService],
})
export class SpeakersModule {}
