// Libraries
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiAcceptedResponse } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

// DTOs
import { SendNotificationDto } from '../dto/send-notification.dto';
import { NotificationResDto } from '../dto/notification-res.dto';
import { QueryNotificationDto } from '../dto/query-notification.dto';
import { MarkNotificationsReadDto } from '../dto/mark-notifications-read.dto';
import { MarkReadResponseDto } from '../dto/mark-read-response.dto';

// Services
import { NotificationService } from '../services/notification.service';
// Guards/Decorators
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiEndpoint, ApiGetAll } from '@/common/decorators';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

// Interfaces/Types
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard)
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * POST /notifications/send
   * Send notification to current authenticated user via enabled channels
   * Uses async fire-and-forget pattern (non-blocking)
   * @param user Current authenticated user from JWT
   * @param sendNotificationDto Notification data (type, title, message, data)
   * @returns 202 Accepted (async operation)
   */
  @ApiEndpoint('Bildirim gönder', {
    body: { type: SendNotificationDto },
  })
  @ApiAcceptedResponse({
    description: 'Bildirim gönderimi başlatıldı (async)',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        status: { type: 'number', example: 202 },
        message: { type: 'string', example: 'Bildirim gönderimi başlatıldı' },
      },
    },
  })
  @Post('notifications/send')
  @HttpCode(HttpStatus.ACCEPTED)
  async sendNotification(
    @CurrentUser() user: JwtPayload,
    @Body() sendNotificationDto: SendNotificationDto,
  ): Promise<{ success: boolean; status: number; message: string }> {
    this.logger.log(`Sending notification to user: ${user.sub} (type: ${sendNotificationDto.type})`);

    // Fire-and-forget: Don't await, let it run asynchronously
    this.notificationService
      .send(
        sendNotificationDto.userID,
        sendNotificationDto.type,
        sendNotificationDto.title,
        sendNotificationDto.message,
        sendNotificationDto.data,
      )
      .catch((error) => {
        // Error already logged in NotificationService
        this.logger.error(
          `Unhandled error in notification sending for user ${user.sub}`,
          error instanceof Error ? error.stack : String(error),
        );
      });

    return {
      success: true,
      status: HttpStatus.ACCEPTED,
      message: 'Bildirim gönderimi başlatıldı',
    };
  }

  /**
   * GET /users/me/notifications
   * Get current authenticated user's notification history
   * Supports pagination, filtering, and sorting via QueryNotificationDto
   * @param user Current authenticated user from JWT
   * @param query Query parameters for filtering and pagination
   * @returns Paginated array of NotificationResDto
   */
  @ApiGetAll(NotificationResDto, {
    summary: 'Bildirim geçmişini getir',
  })
  @Get('users/me/notifications')
  async getNotificationHistory(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryNotificationDto,
  ): Promise<{
    items: NotificationResDto[];
    count: number;
    page: number;
    limit: number;
  }> {
    this.logger.log(`Getting notification history for user: ${user.sub}`);

    const result = await this.notificationService.getNotificationHistory(user.sub, query);

    // Transform to DTO array
    const notificationDtos = result.items.map((notification) =>
      plainToInstance(NotificationResDto, notification, {
        excludeExtraneousValues: true,
      }),
    );

    return {
      items: notificationDtos,
      count: result.count,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    };
  }

  /**
   * PATCH /users/me/notifications/:id/read
   * Mark a single notification as read
   * @param user Current authenticated user from JWT
   * @param id Notification UUID
   * @returns Updated notification
   */
  @ApiEndpoint('Bildirimi okundu olarak işaretle', {
    type: NotificationResDto,
  })
  @Patch('users/me/notifications/:id/read')
  async markAsRead(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationResDto> {
    this.logger.log(`Marking notification ${id} as read for user: ${user.sub}`);

    const notification = await this.notificationService.markAsRead(id, user.sub);

    return plainToInstance(NotificationResDto, notification, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * PATCH /users/me/notifications/read
   * Mark multiple notifications as read
   * @param user Current authenticated user from JWT
   * @param dto DTO containing array of notification IDs
   * @returns Object with count of updated notifications
   */
  @ApiEndpoint('Birden fazla bildirimi okundu olarak işaretle', {
    type: MarkReadResponseDto,
    body: { type: MarkNotificationsReadDto },
  })
  @Patch('users/me/notifications/read')
  async markManyAsRead(
    @CurrentUser() user: JwtPayload,
    @Body() dto: MarkNotificationsReadDto,
  ): Promise<MarkReadResponseDto> {
    this.logger.log(`Marking ${dto.ids.length} notifications as read for user: ${user.sub}`);

    const result = await this.notificationService.markManyAsRead(dto.ids, user.sub);

    return plainToInstance(MarkReadResponseDto, result, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * PATCH /users/me/notifications/read-all
   * Mark all notifications as read for current user
   * @param user Current authenticated user from JWT
   * @returns Object with count of updated notifications
   */
  @ApiEndpoint('Tüm bildirimleri okundu olarak işaretle', {
    type: MarkReadResponseDto,
  })
  @Patch('users/me/notifications/read-all')
  async markAllAsRead(@CurrentUser() user: JwtPayload): Promise<MarkReadResponseDto> {
    this.logger.log(`Marking all notifications as read for user: ${user.sub}`);

    const result = await this.notificationService.markAllAsRead(user.sub);

    return plainToInstance(MarkReadResponseDto, result, {
      excludeExtraneousValues: true,
    });
  }
}
