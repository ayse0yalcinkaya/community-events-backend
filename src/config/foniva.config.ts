// Libraries
import { registerAs } from '@nestjs/config';

export default registerAs('foniva', () => ({
  apiUrl: process.env.FONIVA_API_URL,
  username: process.env.FONIVA_USERNAME,
  password: process.env.FONIVA_PASSWORD,
  apiKey: process.env.FONIVA_API_KEY,
  sender: process.env.FONIVA_SENDER || 'FONIVA',
  provider: process.env.SMS_PROVIDER || 'FONIVA',
}));
