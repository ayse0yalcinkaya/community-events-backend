// Libraries
import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => {
  const jwtSecret = process.env.JWT_SECRET;

  // Validation: JWT_SECRET must be at least 32 characters
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required but not defined');
  }

  if (jwtSecret.length < 32) {
    throw new Error(`JWT_SECRET must be at least 32 characters long (current length: ${jwtSecret.length})`);
  }

  return {
    secret: jwtSecret,
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  };
});
