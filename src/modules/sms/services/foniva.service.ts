// Libraries
import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { I18nService } from 'nestjs-i18n';

// Enums
import { SmsType } from '../enums/sms-type.enum';

/**
 * FONIVA API Result Interface
 */
export interface FonivaResult {
  providerId: string;
  success: boolean;
}

/**
 * FONIVA Service Interface
 */
export interface IFonivaService {
  /**
   * Send SMS via FONIVA API
   * @param phoneNumber - Phone number in E.164 format (+90XXXXXXXXXX)
   * @param message - SMS message content
   * @param type - SMS type (OTP, NOTIFICATION, MARKETING, ALERT)
   * @param customId - Optional custom tracking ID for delivery callbacks
   * @param lang - Optional language code (tr/en) for message formatting
   * @returns FonivaResult with providerId and success status
   * @throws BadRequestException on invalid credentials
   * @throws ServiceUnavailableException on network failures
   */
  sendSms(phoneNumber: string, message: string, type: SmsType, customId?: string, lang?: string): Promise<FonivaResult>;
}

@Injectable()
export class FonivaService implements IFonivaService {
  private readonly logger = new Logger(FonivaService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly apiUrl: string;
  private readonly username: string;
  private readonly password: string;
  private readonly apiKey: string;
  private readonly sender: string;
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {
    // Load FONIVA configuration from config factory
    const fonivaConfig = this.configService.get('foniva');
    const appConfig = this.configService.get('app');

    if (!fonivaConfig) {
      this.logger.error('FONIVA configuration is missing');
      throw new Error(this.i18n.t('errors.FONIVA_CONFIG_MISSING'));
    }

    this.apiUrl = fonivaConfig.apiUrl || '';
    this.username = fonivaConfig.username || '';
    this.password = fonivaConfig.password || '';
    this.apiKey = fonivaConfig.apiKey || '';
    this.sender = fonivaConfig.sender || 'FONIVA';
    this.baseUrl = appConfig?.baseUrl || 'http://localhost:3000';

    // Validate required configuration
    if (!this.apiUrl || !this.username || !this.password || !this.apiKey) {
      this.logger.error('FONIVA configuration is incomplete');
      throw new Error(this.i18n.t('errors.FONIVA_CONFIG_MISSING'));
    }

    // Create axios instance with Basic Auth and API Key header
    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      timeout: 10000, // 10 seconds timeout
      auth: {
        username: this.username,
        password: this.password,
      },
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        Authorization: `Bearer ${this.apiKey}`, // Also add Bearer token for FONIVA API
      },
    });

    this.logger.log('FonivaService initialized');
  }

  /**
   * Send SMS via FONIVA API
   */
  async sendSms(
    phoneNumber: string,
    message: string,
    type: SmsType,
    customId?: string,
    lang?: string,
  ): Promise<FonivaResult> {
    try {
      this.logger.debug(`Sending SMS to ${phoneNumber} (type: ${type})`);

      // Build FONIVA API request payload according to their specification
      const callbackUrl = `${this.baseUrl}/api/sms/callback/delivery`;

      const payload = {
        type: 1, // SMS type
        sendingType: 0, // Immediate sending
        title: this.sender, // SMS title
        content: message, // SMS content
        number: phoneNumber, // Target phone number
        encoding: 1, // UTF-8 encoding
        sender: this.sender, // Sender identifier
        commercial: false, // Non-commercial message
        skipAhsQuery: true, // Skip AHS validation
        recipientType: 0, // Individual recipient
        customID: customId, // Custom tracking ID
        pushSettings: {
          url: callbackUrl, // Delivery callback URL
        },
      };

      // Make POST request to FONIVA API
      const response = await this.axiosInstance.post('', payload);

      // Log full response for debugging
      this.logger.debug('FONIVA API Response:', JSON.stringify(response.data, null, 2));

      // Extract provider ID from response
      // FONIVA API returns: { err: null, data: { pkgID: 42576396 } }
      const providerId =
        response.data?.data?.pkgID?.toString() ||
        response.data?.pkgID?.toString() ||
        response.data?.id?.toString() ||
        response.data?.messageId?.toString() ||
        response.data?.message_id?.toString() ||
        '';

      if (!providerId) {
        this.logger.error('FONIVA API response missing pkgID', {
          response: response.data,
        });
        throw new ServiceUnavailableException(this.i18n.t('errors.FONIVA_INVALID_RESPONSE'));
      }

      this.logger.log(`SMS sent successfully via FONIVA (providerId: ${providerId})`);

      return {
        providerId,
        success: true,
      };
    } catch (error) {
      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        // Handle network failures
        if (!axiosError.response) {
          this.logger.error('FONIVA API network error', {
            message: axiosError.message,
            code: axiosError.code,
          });
          throw new ServiceUnavailableException(this.i18n.t('errors.FONIVA_NETWORK_ERROR'));
        }

        // Handle invalid credentials (401 Unauthorized)
        if (axiosError.response.status === 401) {
          this.logger.error('FONIVA API authentication failed', {
            status: axiosError.response.status,
            data: axiosError.response.data,
          });
          throw new BadRequestException(this.i18n.t('errors.FONIVA_AUTH_FAILED'));
        }

        // Handle other HTTP errors
        this.logger.error('FONIVA API error', {
          status: axiosError.response.status,
          data: axiosError.response.data,
        });
        // Use i18n with interpolation for dynamic values
        const errorMessage = this.i18n.t('errors.FONIVA_API_ERROR_WITH_STATUS', {
          args: {
            status: axiosError.response.status,
            statusText: axiosError.response.statusText || 'Unknown',
          },
        });
        throw new ServiceUnavailableException(errorMessage);
      }

      // Handle other errors
      this.logger.error('Unexpected error in FonivaService.sendSms', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new ServiceUnavailableException(this.i18n.t('errors.SMS_SEND_FAILED'));
    }
  }
}
