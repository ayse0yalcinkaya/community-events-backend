// Libraries
import { Body, Controller, HttpCode, HttpStatus, Logger, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

// DTOs
import { RegisterDeviceTokenDto } from '../dto/register-device-token.dto';
import { DeviceTokenResDto } from '../dto/device-token-res.dto';

// Services
import { DeviceTokenService } from '../services/device-token.service';

// Guards/Decorators
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiEndpoint } from '@/common/decorators';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

// Interfaces/Types
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard)
export class DeviceTokenController {
  private readonly logger = new Logger(DeviceTokenController.name);

  constructor(private readonly deviceTokenService: DeviceTokenService) {}

  /**
   * POST /users/me/device-tokens
   * Register device token for push notifications
   * User can only register tokens for themselves (userID from JWT)
   *
   * @param user Current authenticated user from JWT
   * @param registerDeviceTokenDto Device token data (token, platform)
   * @returns Registered device token entity
   */
  @ApiEndpoint('Cihaz token kaydet', {
    body: { type: RegisterDeviceTokenDto },
  })
  @Post('users/me/device-tokens')
  @HttpCode(HttpStatus.CREATED)
  async registerDeviceToken(
    @CurrentUser() user: JwtPayload,
    @Body() registerDeviceTokenDto: RegisterDeviceTokenDto,
  ): Promise<DeviceTokenResDto> {
    this.logger.log(`Registering device token for user: ${user.sub} (platform: ${registerDeviceTokenDto.platform})`);

    const deviceToken = await this.deviceTokenService.registerToken(
      user.sub,
      registerDeviceTokenDto.token,
      registerDeviceTokenDto.platform,
    );

    // Transform to response DTO
    return plainToInstance(DeviceTokenResDto, deviceToken, {
      excludeExtraneousValues: true,
    });
  }
}
