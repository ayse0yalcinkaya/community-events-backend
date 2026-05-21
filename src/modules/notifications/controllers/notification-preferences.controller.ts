// Libraries
import { Body, Controller, Get, Logger, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

// DTOs
import { UpdateNotificationPreferenceDto } from '../dto/update-notification-preference.dto';
import { NotificationPreferenceResDto } from '../dto/notification-preference-res.dto';

// Services
import { NotificationPreferencesService } from '../services/notification-preferences.service';

// Guards/Decorators
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiGetOne, ApiUpdate } from '@/common/decorators';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

// Interfaces/Types
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@ApiTags('Notification Preferences')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class NotificationPreferencesController {
  private readonly logger = new Logger(NotificationPreferencesController.name);

  constructor(private readonly notificationPreferencesService: NotificationPreferencesService) {}

  /**
   * GET /users/me/notification-preferences
   * Get current authenticated user's notification preferences
   * Creates default preferences if not exist (all channels enabled)
   * @param user Current authenticated user from JWT (inherited from class-level guard)
   * @returns Array of NotificationPreferenceResDto
   */
  @ApiGetOne(NotificationPreferenceResDto, {
    summary: 'Bildirim tercihlerini getir',
  })
  @Get('me/notification-preferences')
  async getPreferences(@CurrentUser() user: JwtPayload): Promise<NotificationPreferenceResDto[]> {
    this.logger.log(`Getting preferences for user: ${user.sub}`);

    // Get preferences (creates default if not exist)
    const preferences = await this.notificationPreferencesService.getPreferences(user.sub);

    // Transform to DTO array
    const preferencesDto = preferences.map((pref) =>
      plainToInstance(NotificationPreferenceResDto, pref, {
        excludeExtraneousValues: true,
      }),
    );

    return preferencesDto;
  }

  /**
   * PATCH /users/me/notification-preferences
   * Update current authenticated user's notification preferences (bulk update)
   * @param user Current authenticated user from JWT (inherited from class-level guard)
   * @param preferences Array of preference updates
   * @returns Updated NotificationPreferenceResDto array
   */
  @ApiUpdate(NotificationPreferenceResDto, {
    summary: 'Bildirim tercihlerini güncelle',
  })
  @Patch('me/notification-preferences')
  async updatePreferences(
    @CurrentUser() user: JwtPayload,
    @Body() preferences: UpdateNotificationPreferenceDto[],
  ): Promise<NotificationPreferenceResDto[]> {
    this.logger.log(`Updating preferences for user: ${user.sub} (${preferences.length} preferences)`);

    // Update preferences (bulk update with upsert)
    const updatedPreferences = await this.notificationPreferencesService.updatePreferences(user.sub, preferences);

    // Transform to DTO array
    const preferencesDto = updatedPreferences.map((pref) =>
      plainToInstance(NotificationPreferenceResDto, pref, {
        excludeExtraneousValues: true,
      }),
    );

    return preferencesDto;
  }
}
