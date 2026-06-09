// Libraries
import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
  Query,
  Headers,
  Logger,
} from '@nestjs/common';

import { ApiTags, ApiHeader } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { plainToInstance } from 'class-transformer';

// DTOs
import { DeliveryCallbackDto } from '../dto/request/delivery-callback.dto';
import { SendSmsDto } from '../dto/request/send-sms.dto';
import { SmsResDto } from '../dto/response/sms-res.dto';

// Services
import { SmsService } from '../services/sms.service';
import { PrismaService } from '../../../database/prisma.service';

// Guards/Decorators
import { ApiEndpoint } from '@/common/decorators';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permission } from '@/common/decorators/permission.decorator';
import { ActionEnum } from '@/common/enums/action.enum';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';

// Enums
import { SmsType } from '../enums/sms-type.enum';

// Interfaces/Types
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@ApiTags('SMS')
@Controller('sms')
export class SmsController {
  private readonly logger = new Logger(SmsController.name);

  constructor(
    private readonly smsService: SmsService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Send SMS
   *
   * @route POST /api/sms/send
   * @access Protected - Requires JWT authentication
   * @permission SMS.SEND (if permission-based access control needed)
   *
   * @param body - SendSmsDto with phoneNumber, message, and type
   * @param user - Authenticated user from JWT
   * @returns SmsResDto with SMS tracking information
   *
   * @throws 400 Bad Request - Invalid phone number or message
   * @throws 401 Unauthorized - No JWT token provided
   * @throws 503 Service Unavailable - FONIVA API error
   */
  @ApiEndpoint('SMS gönder', {
    type: SmsResDto,
    status: 201,
    body: { type: SendSmsDto },
  })
  @Post('send')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async sendSms(@Body() body: SendSmsDto): Promise<SmsResDto> {
    // Send SMS via SmsService
    const sms = await this.smsService.sendSms(body.phoneNumber, body.message, body.type);

    // Transform SMS entity to SmsResDto
    return plainToInstance(SmsResDto, sms, {
      excludeExtraneousValues: true, // Only include @Expose() fields
    });
  }

  /**
   * FONIVA webhook callback for SMS delivery status
   *
   * @route POST /api/sms/callback/delivery
   * @access Public - No authentication required (webhook endpoint)
   * @security Webhook signature verification via FONIVA_API_KEY header
   */
  @Public()
  @ApiEndpoint('FONIVA SMS teslimat durumu webhook', {
    isPublic: true,
    body: { type: DeliveryCallbackDto },
  })
  @ApiHeader({
    name: 'X-API-Key',
    description: 'FONIVA API Key for webhook signature verification',
    required: true,
  })
  @Post('callback/delivery')
  @HttpCode(HttpStatus.OK)
  async handleDeliveryCallback(
    @Body() body: DeliveryCallbackDto,
    @Headers('x-api-key') apiKey?: string,
  ): Promise<{ success: boolean; message: string }> {
    // Verify webhook signature (FONIVA_API_KEY)
    const fonivaConfig = this.configService.get('foniva');
    const expectedApiKey = fonivaConfig?.apiKey;

    if (!expectedApiKey) {
      throw new UnauthorizedException(this.i18n.t('errors.WEBHOOK_API_KEY_NOT_CONFIGURED'));
    }

    // Check API key from header (X-API-Key)
    // Note: In production, webhook signature verification should use HMAC-SHA256
    // For MVP, we'll use simple API key header check
    if (!apiKey || apiKey !== expectedApiKey) {
      throw new UnauthorizedException(this.i18n.t('errors.WEBHOOK_SIGNATURE_INVALID'));
    }

    // Find SMS record by providerId
    const smsRecord = await this.prisma.sMS.findFirst({
      where: { providerId: body.providerId },
    });

    if (!smsRecord) {
      // Log warning but return 200 OK to prevent webhook retries
      return {
        success: false,
        message: this.i18n.t('errors.SMS_NOT_FOUND'),
      };
    }

    // Update SMS record: status: DELIVERED/FAILED, deliveredAt
    await this.prisma.sMS.update({
      where: { id: smsRecord.id },
      data: {
        status: body.status,
        deliveredAt: new Date(),
      },
    });

    return {
      success: true,
      message: this.i18n.t('success.OPERATION_SUCCESSFUL'),
    };
  }

  @Public()
  @ApiEndpoint('Meta WhatsApp webhook doğrulama', { isPublic: true })
  @Get('whatsapp/webhook')
  @HttpCode(HttpStatus.OK)
  verifyWhatsAppWebhook(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') verifyToken?: string,
    @Query('hub.challenge') challenge?: string,
  ) {
    const whatsappConfig = this.configService.get('whatsapp');
    const expectedVerifyToken = whatsappConfig?.webhookVerifyToken;

    if (!expectedVerifyToken) {
      throw new UnauthorizedException('sms.WHATSAPP_WEBHOOK_TOKEN_NOT_CONFIGURED');
    }

    if (mode !== 'subscribe' || verifyToken !== expectedVerifyToken) {
      throw new UnauthorizedException('sms.WHATSAPP_WEBHOOK_VERIFICATION_FAILED');
    }

    return challenge ?? '';
  }

  @Public()
  @ApiEndpoint('Meta WhatsApp webhook callback', { isPublic: true })
  @Post('whatsapp/webhook')
  @HttpCode(HttpStatus.OK)
  handleWhatsAppWebhook(@Body() body: Record<string, unknown>) {
    this.logger.log(`WhatsApp webhook received: ${JSON.stringify(body)}`);
    return { received: true };
  }

  /**
   * Get SMS statistics
   *
   * @route GET /api/sms/stats
   * @access Protected - Requires JWT authentication and SMS.VIEW permission
   * @permission SMS.VIEW
   */
  @ApiEndpoint('SMS istatistiklerini getir', {
    queries: [
      {
        name: 'startDate',
        description: 'Başlangıç tarihi (ISO 8601 formatı)',
        type: String,
        required: false,
      },
      {
        name: 'endDate',
        description: 'Bitiş tarihi (ISO 8601 formatı)',
        type: String,
        required: false,
      },
      {
        name: 'type',
        description: 'SMS tipi filtresi',
        type: String,
        enum: Object.values(SmsType),
        required: false,
      },
    ],
  })
  @Get('stats')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('SMS', ActionEnum.VIEW)
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    // Validate and convert query string to SmsType enum
    // Convert string to number first, then check if it's a valid enum value
    const typeNumber = type ? Number(type) : undefined;
    const smsType: SmsType | undefined =
      typeNumber !== undefined &&
      typeNumber !== null &&
      !isNaN(typeNumber) &&
      Object.values(SmsType).includes(typeNumber as SmsType)
        ? (typeNumber as SmsType)
        : undefined;

    return this.smsService.getStats(start, end, smsType);
  }
}
