// Libraries
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { SMS } from '@prisma/client';

// Enums
import { SmsType } from '../enums/sms-type.enum';
import { SmsStatus } from '../enums/sms-status.enum';

// Services
import { RetryService } from '@/common/services/retry.service';
import { PrismaService } from '../../../database/prisma.service';
import { FonivaService } from './foniva.service';
/**
 * SMS Service Interface
 */
export interface ISmsService {
  /**
   * Send SMS and track in database
   * @param phoneNumber - Phone number in E.164 format (+90XXXXXXXXXX)
   * @param message - SMS message content
   * @param type - SMS type (OTP, NOTIFICATION, MARKETING, ALERT)
   * @returns SMS entity with tracking information
   */
  sendSms(phoneNumber: string, message: string, type: SmsType): Promise<SMS>;

  /**
   * Retry failed SMS with exponential backoff
   * @param smsId - SMS record ID
   * @returns Updated SMS entity
   */
  retrySms(smsId: string): Promise<SMS>;

  /**
   * Get SMS statistics with filtering
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @param type - Optional SMS type filter
   * @returns Statistics object with totals and success rates
   */
  getStats(
    startDate?: Date,
    endDate?: Date,
    type?: SmsType,
  ): Promise<{
    total: {
      sent: number;
      delivered: number;
      failed: number;
    };
    successRate: number;
    byType: Record<SmsType, { sent: number; delivered: number; failed: number }>;
  }>;
}

@Injectable()
export class SmsService implements ISmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly smsRetryMaxAttempts: number;
  private readonly smsRetryBaseDelay: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly fonivaService: FonivaService,
    private readonly i18n: I18nService,
    private readonly retryService: RetryService,
    private readonly configService: ConfigService,
  ) {
    // AC-6.5.5.9: Load retry configuration from environment
    this.smsRetryMaxAttempts = this.configService.get<number>('SMS_RETRY_MAX_ATTEMPTS', 5);
    this.smsRetryBaseDelay = this.configService.get<number>('SMS_RETRY_BASE_DELAY', 2000);
  }

  /**
   * Send SMS and track in database
   * AC-6.5.5.5: Integrated with RetryService for automatic retry on transient failures
   */
  async sendSms(phoneNumber: string, message: string, type: SmsType): Promise<SMS> {
    this.logger.debug(`Creating SMS record for ${phoneNumber} (type: ${type})`);

    // Create SMS record with status: PENDING
    const smsRecord = await this.prisma.sMS.create({
      data: {
        phoneNumber,
        message,
        type,
        status: SmsStatus.PENDING,
        attemptCount: 0,
      },
    });

    this.logger.debug(`SMS record created (id: ${smsRecord.id})`);

    // Skip sending OTP in development
    if (process.env.NODE_ENV === 'development' && type === SmsType.OTP) {
      this.logger.log(`[DEV] Skipping SMS sending for ${phoneNumber} (OTP). Marking as SENT.`);
      return this.prisma.sMS.update({
        where: { id: smsRecord.id },
        data: {
          status: SmsStatus.SENT,
          providerId: 'DEV-MOCK-PROVIDER-ID',
          sentAt: new Date(),
        },
      });
    }

    try {
      // AC-6.5.5.5: Wrap FONIVA service call with RetryService
      const fonivaResult = await this.retryService.executeWithRetry(
        async () =>
          await this.fonivaService.sendSms(
            phoneNumber,
            message,
            type,
            smsRecord.id, // Use SMS record ID as customId for callback tracking
          ),
        {
          maxAttempts: this.smsRetryMaxAttempts,
          baseDelay: this.smsRetryBaseDelay,
          context: `SMS Send: ${phoneNumber} - ${message.substring(0, 50)}...`,
        },
      );

      // Update SMS record on success: status: SENT, providerId, sentAt
      const updatedSms = await this.prisma.sMS.update({
        where: { id: smsRecord.id },
        data: {
          status: SmsStatus.SENT,
          providerId: fonivaResult.providerId,
          sentAt: new Date(),
        },
      });

      this.logger.log(`SMS sent successfully (id: ${smsRecord.id}, providerId: ${fonivaResult.providerId})`);

      return updatedSms;
    } catch (error) {
      // AC-6.5.5.8: Error handling - Update SMS record on failure after retry exhaustion
      const errorMessage = error instanceof Error ? error.message : String(error);

      const updatedSms = await this.prisma.sMS.update({
        where: { id: smsRecord.id },
        data: {
          status: SmsStatus.FAILED,
          errorMessage,
          attemptCount: smsRecord.attemptCount + 1,
        },
      });

      this.logger.error(`SMS sending failed (id: ${smsRecord.id}): ${errorMessage}`);

      return updatedSms;
    }
  }

  /**
   * Retry failed SMS with exponential backoff
   * AC-6.5.5.6: Refactored to use RetryService (removed manual backoff logic)
   */
  async retrySms(smsId: string): Promise<SMS> {
    // Load SMS record by ID
    const smsRecord = await this.prisma.sMS.findUnique({
      where: { id: smsId },
    });

    if (!smsRecord) {
      throw new InternalServerErrorException(this.i18n.t('errors.SMS_NOT_FOUND'));
    }

    // Check attemptCount < 3
    if (smsRecord.attemptCount >= 3) {
      throw new InternalServerErrorException(this.i18n.t('errors.SMS_MAX_RETRY_EXCEEDED'));
    }

    this.logger.debug(`Retrying SMS ${smsId} (attempt ${smsRecord.attemptCount + 1}/3)`);

    try {
      // AC-6.5.5.6: Use RetryService instead of manual exponential backoff
      // Remaining attempts: 3 - current attemptCount
      const fonivaResult = await this.retryService.executeWithRetry(
        async () =>
          await this.fonivaService.sendSms(
            smsRecord.phoneNumber,
            smsRecord.message,
            smsRecord.type as SmsType, // Prisma enum to our enum (both have same values)
            smsRecord.id, // Use SMS record ID as customId for callback tracking
          ),
        {
          maxAttempts: 3 - smsRecord.attemptCount, // Remaining attempts
          baseDelay: this.smsRetryBaseDelay,
          context: `SMS Retry: ${smsRecord.id} (attempt ${smsRecord.attemptCount + 1}/3)`,
        },
      );

      // Update SMS record with new attempt result (success)
      const updatedSms = await this.prisma.sMS.update({
        where: { id: smsId },
        data: {
          status: SmsStatus.SENT,
          providerId: fonivaResult.providerId,
          sentAt: new Date(),
          attemptCount: smsRecord.attemptCount + 1,
          errorMessage: null, // Clear previous error
        },
      });

      this.logger.log(`SMS retry successful (id: ${smsId}, providerId: ${fonivaResult.providerId})`);

      return updatedSms;
    } catch (error) {
      // AC-6.5.5.8: Update SMS record with new attempt result (failure after retry exhaustion)
      const errorMessage = error instanceof Error ? error.message : String(error);

      const updatedSms = await this.prisma.sMS.update({
        where: { id: smsId },
        data: {
          status: SmsStatus.FAILED,
          errorMessage,
          attemptCount: smsRecord.attemptCount + 1,
        },
      });

      this.logger.error(`SMS retry failed (id: ${smsId}): ${errorMessage}`);

      return updatedSms;
    }
  }

  /**
   * Get SMS statistics with filtering
   */
  async getStats(
    startDate?: Date,
    endDate?: Date,
    type?: SmsType,
  ): Promise<{
    total: {
      sent: number;
      delivered: number;
      failed: number;
    };
    successRate: number;
    byType: Record<SmsType, { sent: number; delivered: number; failed: number }>;
  }> {
    // Build where clause for filtering
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    if (type !== undefined && type !== null) {
      where.type = type;
    }

    // Get all SMS records matching filters
    const smsRecords = await this.prisma.sMS.findMany({
      where,
    });

    // Calculate totals
    const total = {
      sent: smsRecords.filter((s) => s.status === SmsStatus.SENT).length,
      delivered: smsRecords.filter((s) => s.status === SmsStatus.DELIVERED).length,
      failed: smsRecords.filter((s) => s.status === SmsStatus.FAILED).length,
    };

    // Calculate success rate (delivered / sent)
    const successRate = total.sent > 0 ? (total.delivered / total.sent) * 100 : 0;

    // Calculate by type
    const byType: { [key: number]: { sent: number; delivered: number; failed: number } } = {
      [SmsType.OTP]: { sent: 0, delivered: 0, failed: 0 },
      [SmsType.NOTIFICATION]: { sent: 0, delivered: 0, failed: 0 },
      [SmsType.MARKETING]: { sent: 0, delivered: 0, failed: 0 },
      [SmsType.ALERT]: { sent: 0, delivered: 0, failed: 0 },
    };

    smsRecords.forEach((sms) => {
      // sms.type is already a number from Prisma schema
      const smsType = sms.type as SmsType;
      if (byType[smsType]) {
        if (sms.status === SmsStatus.SENT) {
          byType[smsType].sent++;
        } else if (sms.status === SmsStatus.DELIVERED) {
          byType[smsType].delivered++;
        } else if (sms.status === SmsStatus.FAILED) {
          byType[smsType].failed++;
        }
      }
    });

    return {
      total,
      successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
      byType: byType as Record<SmsType, { sent: number; delivered: number; failed: number }>,
    };
  }
}
