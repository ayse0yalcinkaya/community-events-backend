import { Module } from '@nestjs/common';

import { PermissionsModule } from '../permissions/permissions.module';
import { InterestsController } from './controllers/interests.controller';
import { UserInterestsController } from './controllers/user-interests.controller';
import { InterestsService } from './services/interests.service';

@Module({
  imports: [PermissionsModule],
  controllers: [InterestsController, UserInterestsController],
  providers: [InterestsService],
  exports: [InterestsService],
})
export class InterestsModule {}
