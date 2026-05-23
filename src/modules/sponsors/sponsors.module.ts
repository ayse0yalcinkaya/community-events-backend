import { Module } from '@nestjs/common';

import { FilesModule } from '../files/files.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { SponsorsController } from './controllers/sponsors.controller';
import { SponsorsService } from './services/sponsors.service';

@Module({
  imports: [FilesModule, PermissionsModule],
  controllers: [SponsorsController],
  providers: [SponsorsService],
  exports: [SponsorsService],
})
export class SponsorsModule {}
