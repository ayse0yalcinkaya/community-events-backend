// Libraries
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

// DTOs
import { SetUserInterestsDto } from '../dto/set-user-interests.dto';

// Interfaces
import type { JwtPayload } from '@/modules/auth/interfaces/jwt-payload.interface';

// Enums
import { ActionEnum } from '@/common/enums/action.enum';

// Guards
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';

// Decorators
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permission } from '@/common/decorators/permission.decorator';

// Services
import { InterestsService } from '../services/interests.service';
@ApiTags('User Interests')
@Controller('users/me/interests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserInterestsController {
  constructor(private readonly interestsService: InterestsService) {}

  @Get()
  @Permission('INTERESTS', ActionEnum.VIEW)
  getMyInterests(@CurrentUser() user: JwtPayload) {
    return this.interestsService.getUserInterests(user.sub);
  }

  @Get('onboarding')
  @Permission('INTERESTS', ActionEnum.VIEW)
  getOnboardingStatus(@CurrentUser() user: JwtPayload) {
    return this.interestsService.getOnboardingStatus(user.sub);
  }

  @Post()
  @Permission('INTERESTS', ActionEnum.UPDATE)
  setMyInterests(@CurrentUser() user: JwtPayload, @Body() dto: SetUserInterestsDto) {
    return this.interestsService.setUserInterests(user.sub, dto.interestIds);
  }
}
