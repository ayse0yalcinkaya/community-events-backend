import { Module } from '@nestjs/common';

import { InterestsController } from './controllers/interests.controller';
import { UserInterestsController } from './controllers/user-interests.controller';
import { InterestsService } from './services/interests.service';

@Module({
  controllers: [InterestsController, UserInterestsController],
  providers: [InterestsService],
  exports: [InterestsService],
})
export class InterestsModule {}
