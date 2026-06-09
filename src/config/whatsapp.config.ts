import { registerAs } from '@nestjs/config';

export default registerAs('whatsapp', () => ({
  enabled: process.env.WHATSAPP_ENABLED === 'true',
  apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com',
  apiVersion: process.env.WHATSAPP_API_VERSION || 'v22.0',
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  otpTemplateName: process.env.WHATSAPP_OTP_TEMPLATE_NAME,
  otpTemplateLanguageCode: process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE_CODE || 'tr',
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
}));
