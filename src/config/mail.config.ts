// Libraries
import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  provider: process.env.MAIL_PROVIDER || 'sendgrid',
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    from: process.env.MAIL_FROM,
  },
}));
