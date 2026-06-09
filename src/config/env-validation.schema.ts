// Libraries
import * as Joi from 'joi';

export const envSchema = Joi.object({
  // Application Configuration
  NODE_ENV: Joi.string().valid('development', 'staging', 'production', 'test').required(),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api'),
  BASE_URL: Joi.string().uri().optional(), // Base URL for webhook callbacks (defaults to http://localhost:PORT)

  // Database Configuration
  DATABASE_URL: Joi.string().required(),

  // Optional: Database connection pool settings
  DB_POOL_MIN: Joi.number().default(2),
  DB_POOL_MAX: Joi.number().default(10),

  // JWT Configuration
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),

  // AES Configuration for Password Hashing
  AES_SECRET_KEY: Joi.string().min(64).required(), // 32 bytes in hex (64 hex chars)

  // AWS S3 Configuration (Epic 4: File Management)
  AWS_REGION: Joi.string().required(),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  S3_BUCKET: Joi.string().required(),

  // Optional: MinIO Local Development Configuration
  S3_ENDPOINT: Joi.string().uri().optional(),
  S3_FORCE_PATH_STYLE: Joi.string().valid('true', 'false').optional(),

  // FONIVA SMS Configuration (Epic 5: Communication Infrastructure)
  SMS_PROVIDER: Joi.string().valid('FONIVA').default('FONIVA'),
  FONIVA_API_URL: Joi.string().uri().required(),
  FONIVA_USERNAME: Joi.string().required(),
  FONIVA_PASSWORD: Joi.string().required(),
  FONIVA_API_KEY: Joi.string().required(),
  FONIVA_SENDER: Joi.string().optional(),

  // Meta WhatsApp Cloud API Configuration
  WHATSAPP_ENABLED: Joi.string().valid('true', 'false').default('false'),
  WHATSAPP_API_URL: Joi.string().uri().optional(),
  WHATSAPP_API_VERSION: Joi.string().optional(),
  WHATSAPP_ACCESS_TOKEN: Joi.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: Joi.string().optional(),
  WHATSAPP_OTP_TEMPLATE_NAME: Joi.string().optional(),
  WHATSAPP_OTP_TEMPLATE_LANGUAGE_CODE: Joi.string().optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: Joi.string().optional(),

  // SendGrid Email Configuration (Epic 5: Communication Infrastructure)
  MAIL_PROVIDER: Joi.string().valid('sendgrid').default('sendgrid'),
  SENDGRID_API_KEY: Joi.string().required(),
  MAIL_FROM: Joi.string().email().required(),

  // Redis Cache Configuration (Epic 6.5: Common Cache Service)
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().default(0),
  REDIS_TTL: Joi.number().default(3600), // Default: 1 hour in seconds

  // Allow extra variables for future epics (AWS SES, Sentry, etc.)
}).unknown();
