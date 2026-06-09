import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';

export interface WhatsAppTemplateResult {
  providerId: string;
  success: boolean;
}

@Injectable()
export class WhatsAppCloudService {
  private readonly logger = new Logger(WhatsAppCloudService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly enabled: boolean;
  private readonly apiVersion: string;
  private readonly phoneNumberId?: string;
  private readonly accessToken?: string;
  private readonly otpTemplateName?: string;
  private readonly otpTemplateLanguageCode: string;

  constructor(private readonly configService: ConfigService) {
    const whatsappConfig = this.configService.get('whatsapp');

    this.enabled = whatsappConfig?.enabled === true;
    this.apiVersion = whatsappConfig?.apiVersion || 'v22.0';
    this.phoneNumberId = whatsappConfig?.phoneNumberId;
    this.accessToken = whatsappConfig?.accessToken;
    this.otpTemplateName = whatsappConfig?.otpTemplateName;
    this.otpTemplateLanguageCode = whatsappConfig?.otpTemplateLanguageCode || 'tr';

    this.axiosInstance = axios.create({
      baseURL: whatsappConfig?.apiUrl || 'https://graph.facebook.com',
      timeout: 10000,
    });
  }

  async sendOtpTemplate(phoneNumber: string, code: string): Promise<WhatsAppTemplateResult> {
    if (process.env.NODE_ENV === 'development') {
      this.logger.log(`[DEV] Skipping WhatsApp OTP send for ${phoneNumber}. Code: ${code}`);
      return { providerId: 'DEV-WHATSAPP-MOCK-ID', success: true };
    }

    if (!this.enabled) {
      throw new ServiceUnavailableException('sms.WHATSAPP_DISABLED');
    }

    if (!this.phoneNumberId || !this.accessToken || !this.otpTemplateName) {
      this.logger.error('WhatsApp Cloud configuration is incomplete');
      throw new ServiceUnavailableException('sms.WHATSAPP_CONFIG_INCOMPLETE');
    }

    try {
      const response = await this.axiosInstance.post(
        `/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'template',
          template: {
            name: this.otpTemplateName,
            language: {
              code: this.otpTemplateLanguageCode,
            },
            components: [
              {
                type: 'body',
                parameters: [
                  {
                    type: 'text',
                    text: code,
                  },
                ],
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const providerId = response.data?.messages?.[0]?.id;

      if (!providerId) {
        this.logger.error('WhatsApp API response missing message id', { response: response.data });
        throw new ServiceUnavailableException('sms.WHATSAPP_INVALID_RESPONSE');
      }

      this.logger.log(`WhatsApp OTP sent successfully (providerId: ${providerId})`);
      return { providerId, success: true };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (!axiosError.response) {
          this.logger.error('WhatsApp API network error', { message: axiosError.message, code: axiosError.code });
          throw new ServiceUnavailableException('sms.WHATSAPP_NETWORK_ERROR');
        }

        if (axiosError.response.status === 401 || axiosError.response.status === 403) {
          this.logger.error('WhatsApp API authentication failed', {
            status: axiosError.response.status,
            data: axiosError.response.data,
          });
          throw new BadRequestException('sms.WHATSAPP_AUTH_FAILED');
        }

        this.logger.error('WhatsApp API error', {
          status: axiosError.response.status,
          data: axiosError.response.data,
        });
        throw new ServiceUnavailableException('sms.WHATSAPP_API_ERROR');
      }

      this.logger.error(
        'Unexpected error in WhatsAppCloudService.sendOtpTemplate',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException('sms.WHATSAPP_SEND_FAILED');
    }
  }
}
