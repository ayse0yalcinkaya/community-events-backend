import inquirer from 'inquirer';
import { colors } from '../utils/colors';
import * as fs from 'fs';
import * as path from 'path';

export interface EnvConfig {
  databaseType: 'postgresql' | 'mongodb';
  port: number;
  apiPrefix: string;
  baseUrl: string;
  nodeEnv: string;
  jwtSecret: string;
  jwtAccessExpiration: string;
  jwtRefreshExpiration: string;
  awsRegion: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  s3Bucket?: string;
  postgresUser?: string;
  postgresPassword?: string;
  postgresDb?: string;
  mongoInitUsername?: string;
  mongoInitPassword?: string;
  dbPoolMin?: number;
  dbPoolMax?: number;
  sendgridApiKey?: string;
  mailFrom?: string;
  mailProvider?: string;
  fonivaUsername?: string;
  fonivaPassword?: string;
  fonivaApiUrl?: string;
  fonivaApiKey?: string;
  fonivaSender?: string;
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
  redisDb?: number;
  redisTtl?: number;
  documentCacheTtl?: number;
  documentRetryMaxAttempts?: number;
  documentRetryBaseDelay?: number;
  s3RetryMaxAttempts?: number;
  s3RetryBaseDelay?: number;
  mailRetryMaxAttempts?: number;
  mailRetryBaseDelay?: number;
  smsRetryMaxAttempts?: number;
  smsRetryBaseDelay?: number;
  swaggerEnabled?: boolean;
  sentryDsn?: string;
  sentryEnvironment?: string;
  sentryTracesSampleRate?: number;
  sentryDebug?: boolean;
  firebaseEnabled?: boolean;
  firebaseProjectId?: string;
  firebasePrivateKey?: string;
  firebaseClientEmail?: string;
  firebaseRetryMaxAttempts?: number;
  firebaseRetryBaseDelay?: number;
}

export class EnvironmentWizard {
  static async setup(): Promise<EnvConfig> {
    console.log(colors.primary.bold('\n🔧 Environment Configuration Wizard\n'));
    console.log(colors.dim('Projenizi adım adım yapılandıralım. Her bölüm için sadece istediğiniz alanları doldurun.\n'));

    // 1. Application Settings
    console.log(colors.secondary('1️⃣ Application Settings'));
    const appConfig = await inquirer.prompt([
      { type: 'list', name: 'nodeEnv', message: 'Environment:', choices: ['development', 'staging', 'production'], default: 'development' },
      { type: 'input', name: 'port', message: 'Port:', default: 3000, validate: (v: string) => parseInt(v) > 0 && parseInt(v) < 65536 ? true : 'Invalid port' },
      { type: 'input', name: 'apiPrefix', message: 'API Prefix:', default: 'api' },
      { type: 'input', name: 'baseUrl', message: 'Base URL:', default: 'http://localhost:3000' }
    ]);

    // 2. Database Settings
    console.log(colors.secondary('\n2️⃣ Database Settings'));
    const dbConfig = await inquirer.prompt([
      { type: 'list', name: 'databaseType', message: 'Database:', choices: ['postgresql', 'mongodb'], default: 'postgresql' },
      { type: 'input', name: 'dbPoolMin', message: 'DB Pool Min:', default: 2 },
      { type: 'input', name: 'dbPoolMax', message: 'DB Pool Max:', default: 10 }
    ]);

    // PostgreSQL specific
    let postgresConfig: any = {};
    if (dbConfig.databaseType === 'postgresql') {
      postgresConfig = await inquirer.prompt([
        { type: 'input', name: 'postgresUser', message: 'Postgres User:', default: 'user' },
        { type: 'password', name: 'postgresPassword', message: 'Postgres Password:' },
        { type: 'input', name: 'postgresDb', message: 'Database Name:', default: 'boilerplate' }
      ]);
    }

    // MongoDB specific
    let mongoConfig: any = {};
    if (dbConfig.databaseType === 'mongodb') {
      mongoConfig = await inquirer.prompt([
        { type: 'input', name: 'mongoInitUsername', message: 'Mongo Root Username:', default: 'admin' },
        { type: 'password', name: 'mongoInitPassword', message: 'Mongo Root Password:' }
      ]);
    }

    // 3. JWT Settings
    console.log(colors.secondary('\n3️⃣ JWT Settings'));
    const jwtConfig = await inquirer.prompt([
      { type: 'password', name: 'jwtSecret', message: 'JWT Secret (min 32 char):', validate: (v: string) => v.length >= 32 ? true : 'Min 32 characters' },
      { type: 'input', name: 'jwtAccessExpiration', message: 'Access Token Expiration:', default: '15m' },
      { type: 'input', name: 'jwtRefreshExpiration', message: 'Refresh Token Expiration:', default: '7d' }
    ]);

    // 4. AWS S3 Settings
    console.log(colors.secondary('\n4️⃣ AWS S3 Settings (Optional)'));
    const awsConfig = await inquirer.prompt([
      { type: 'input', name: 'awsRegion', message: 'AWS Region:', default: 'us-east-1' },
      { type: 'input', name: 'awsAccessKeyId', message: 'Access Key ID:', default: '' },
      { type: 'password', name: 'awsSecretAccessKey', message: 'Secret Access Key:', default: '' },
      { type: 'input', name: 's3Bucket', message: 'S3 Bucket:', default: '' }
    ]);

    // 5. Email Settings
    console.log(colors.secondary('\n5️⃣ Email Settings (Optional)'));
    const emailConfig = await inquirer.prompt([
      { type: 'input', name: 'mailProvider', message: 'Mail Provider:', default: 'sendgrid' },
      { type: 'input', name: 'sendgridApiKey', message: 'SendGrid API Key:', default: '' },
      { type: 'input', name: 'mailFrom', message: 'Mail From:', default: 'noreply@example.com' }
    ]);

    // 6. SMS Settings
    console.log(colors.secondary('\n6️⃣ SMS Settings (Optional)'));
    const smsConfig = await inquirer.prompt([
      { type: 'input', name: 'fonivaApiUrl', message: 'FONIVA API URL:', default: 'https://sms.foniva.com.tr:9588/sms/create' },
      { type: 'input', name: 'fonivaUsername', message: 'FONIVA Username:', default: '' },
      { type: 'password', name: 'fonivaPassword', message: 'FONIVA Password:', default: '' },
      { type: 'input', name: 'fonivaApiKey', message: 'FONIVA API Key:', default: '' },
      { type: 'input', name: 'fonivaSender', message: 'FONIVA Sender:', default: 'ADLKURUMSAL' }
    ]);

    // 7. Redis Settings
    console.log(colors.secondary('\n7️⃣ Redis Settings (Optional)'));
    const redisConfig = await inquirer.prompt([
      { type: 'input', name: 'redisHost', message: 'Redis Host:', default: 'redis' },
      { type: 'input', name: 'redisPort', message: 'Redis Port:', default: 6379 },
      { type: 'password', name: 'redisPassword', message: 'Redis Password:', default: '' },
      { type: 'input', name: 'redisDb', message: 'Redis DB:', default: 0 },
      { type: 'input', name: 'redisTtl', message: 'Redis TTL (seconds):', default: 3600 }
    ]);

    // 8. Error Tracking
    console.log(colors.secondary('\n8️⃣ Error Tracking (Optional)'));
    const sentryConfig = await inquirer.prompt([
      { type: 'input', name: 'sentryDsn', message: 'Sentry DSN:', default: '' },
      { type: 'list', name: 'sentryEnvironment', message: 'Environment:', choices: ['development', 'staging', 'production'], default: 'development' },
      { type: 'input', name: 'sentryTracesSampleRate', message: 'Traces Sample Rate:', default: 0.1 },
      { type: 'list', name: 'sentryDebug', message: 'Debug Mode:', choices: ['true', 'false'], default: 'true' }
    ]);
    sentryConfig.sentryDebug = sentryConfig.sentryDebug === 'true';

    // 9. Firebase (Optional)
    console.log(colors.secondary('\n9️⃣ Firebase Settings (Optional)'));
    const firebaseEnabled = await inquirer.prompt([
      { type: 'list', name: 'firebaseEnabled', message: 'Enable Firebase?', choices: ['true', 'false'], default: 'false' }
    ]);

    let firebaseConfig: any = {};
    if (firebaseEnabled.firebaseEnabled === 'true') {
      firebaseConfig = await inquirer.prompt([
        { type: 'input', name: 'firebaseProjectId', message: 'Project ID:', default: '' },
        { type: 'input', name: 'firebaseClientEmail', message: 'Client Email:', default: '' },
        { type: 'password', name: 'firebasePrivateKey', message: 'Private Key:', default: '' }
      ]);
    }

    // Merge all configs
    return {
      ...appConfig,
      ...dbConfig,
      ...postgresConfig,
      ...mongoConfig,
      ...jwtConfig,
      ...awsConfig,
      ...emailConfig,
      ...smsConfig,
      ...redisConfig,
      ...sentryConfig,
      ...firebaseConfig,
      firebaseEnabled: firebaseEnabled.firebaseEnabled === 'true'
    };
  }

  static async saveToFile(config: EnvConfig): Promise<void> {
    const envContent = this.generateEnvContent(config);
    const envPath = path.join(process.cwd(), '.env');

    await fs.promises.writeFile(envPath, envContent, 'utf8');
    console.log(colors.accent('\n✅ .env dosyası başarıyla oluşturuldu!\n'));
  }

  private static generateEnvContent(config: EnvConfig): string {
    return `# Generated by CLI Wizard
# Date: ${new Date().toISOString()}

# ============================================
# Application Configuration
# ============================================
NODE_ENV=${config.nodeEnv}
PORT=${config.port}
API_PREFIX=${config.apiPrefix}
BASE_URL=${config.baseUrl}

# ============================================
# Database Configuration
# ============================================
DATABASE_URL=${config.databaseType === 'postgresql' ? `postgresql://${config.postgresUser}:${config.postgresPassword}@postgres:5432/${config.postgresDb}` : 'mongodb://user:password@mongo:27017/boilerplate'}

# PostgreSQL Docker Compose Service Configuration
POSTGRES_USER=${config.postgresUser || 'user'}
POSTGRES_PASSWORD=${config.postgresPassword || 'password'}
POSTGRES_DB=${config.postgresDb || 'boilerplate'}

# MongoDB Docker Compose Service Configuration
MONGO_INITDB_ROOT_USERNAME=${config.mongoInitUsername || 'admin'}
MONGO_INITDB_ROOT_PASSWORD=${config.mongoInitPassword || 'password'}

# Optional: Database connection pool settings
DB_POOL_MIN=${config.dbPoolMin || 2}
DB_POOL_MAX=${config.dbPoolMax || 10}

# ============================================
# JWT Configuration
# ============================================
JWT_SECRET=${config.jwtSecret}
JWT_ACCESS_EXPIRATION=${config.jwtAccessExpiration}
JWT_REFRESH_EXPIRATION=${config.jwtRefreshExpiration}

# ============================================
# AWS S3 Configuration
# ============================================
AWS_REGION=${config.awsRegion}
AWS_ACCESS_KEY_ID=${config.awsAccessKeyId || 'your-aws-access-key-id'}
AWS_SECRET_ACCESS_KEY=${config.awsSecretAccessKey || 'your-aws-secret-access-key'}
S3_BUCKET=${config.s3Bucket || 'your-s3-bucket-name'}

# ============================================
# SendGrid Email Configuration
# ============================================
MAIL_PROVIDER=${config.mailProvider || 'sendgrid'}
SENDGRID_API_KEY=${config.sendgridApiKey || 'your-sendgrid-api-key'}
MAIL_FROM=${config.mailFrom || 'noreply@example.com'}

# ============================================
# FONIVA SMS Configuration
# ============================================
SMS_PROVIDER=FONIVA
FONIVA_API_URL=${config.fonivaApiUrl || 'https://sms.foniva.com.tr:9588/sms/create'}
FONIVA_USERNAME=${config.fonivaUsername || 'adlkurumsal'}
FONIVA_PASSWORD=${config.fonivaPassword || 'Fon_SMS3266'}
FONIVA_API_KEY='${config.fonivaApiKey || "YWRsa3VydW1zYWw6Rm9uX1NNUzMyNjY="}'
FONIVA_SENDER=${config.fonivaSender || 'ADLKURUMSAL'}

# ============================================
# Redis Cache Configuration
# ============================================
REDIS_HOST=${config.redisHost || 'redis'}
REDIS_PORT=${config.redisPort || 6379}
REDIS_PASSWORD=${config.redisPassword || '123'}
REDIS_DB=${config.redisDb || 0}
REDIS_TTL=${config.redisTtl || 3600}

# ============================================
# Document Generator Cache & Retry Configuration
# ============================================
DOCUMENT_CACHE_TTL=3600000
DOCUMENT_RETRY_MAX_ATTEMPTS=3
DOCUMENT_RETRY_BASE_DELAY=1000

# ============================================
# S3 Service Retry Configuration
# ============================================
S3_RETRY_MAX_ATTEMPTS=5
S3_RETRY_BASE_DELAY=2000

# ============================================
# Mail Service Retry Configuration
# ============================================
MAIL_RETRY_MAX_ATTEMPTS=5
MAIL_RETRY_BASE_DELAY=2000

# ============================================
# SMS Service Retry Configuration
# ============================================
SMS_RETRY_MAX_ATTEMPTS=5
SMS_RETRY_BASE_DELAY=2000

# ============================================
# Swagger Configuration
# ============================================
SWAGGER_ENABLED=true

# ============================================
# Sentry Error Tracking
# ============================================
SENTRY_DSN=${config.sentryDsn || 'https://90ee13e61b2923403b3b1f9ebb9f08d1@sentry.adldev.tr/9'}
SENTRY_ENVIRONMENT=${config.sentryEnvironment}
SENTRY_TRACES_SAMPLE_RATE=${config.sentryTracesSampleRate}
SENTRY_DEBUG=${config.sentryDebug}

# ============================================
# Firebase Push Notifications
# ============================================
FIREBASE_ENABLED=${config.firebaseEnabled}
FIREBASE_PROJECT_ID=${config.firebaseProjectId || 'your-firebase-project-id'}
FIREBASE_PRIVATE_KEY=${config.firebasePrivateKey || 'your-firebase-private-key'}
FIREBASE_CLIENT_EMAIL=${config.firebaseClientEmail || 'your-firebase-client-email'}

# ============================================
# Firebase Service Retry Configuration
# ============================================
FIREBASE_RETRY_MAX_ATTEMPTS=5
FIREBASE_RETRY_BASE_DELAY=2000

`;
  }
}
