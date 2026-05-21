// Libraries
import { colors } from '../utils/colors';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
export interface SimpleConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  baseUrl: string;
  databaseType: 'postgresql';
  postgresUser: string;
  postgresPassword: string;
  postgresDb: string;
  dbPoolMin: number;
  dbPoolMax: number;
  jwtSecret: string;
  jwtAccessExpiration: string;
  jwtRefreshExpiration: string;
  awsRegion: string;
  redisHost: string;
  redisPort: number;
  redisPassword: string;
  redisDb: number;
  redisTtl: number;
  mailProvider: string;
  sentryDsn: string;
  sentryEnvironment: string;
  sentryTracesSampleRate: number;
  sentryDebug: boolean;
}

export class SimpleWizard {
  private static config: Partial<SimpleConfig> = {};

  static async quickSetup(): Promise<void> {
    console.clear();
    await this.showWelcome();

    const steps = [
      { key: 'basic', title: '🚀 Temel Ayarlar', handler: this.setupBasic.bind(this) },
      { key: 'database', title: '🗄️ Veritabanı', handler: this.setupDatabase.bind(this) },
      { key: 'security', title: '🔒 Güvenlik', handler: this.setupSecurity.bind(this) },
      { key: 'services', title: '⚙️ Servisler', handler: this.setupServices.bind(this) },
    ];

    for (const step of steps) {
      await this.showStep(step.title, step.key);
      await step.handler();
      await this.waitForEnter();
    }

    await this.reviewAndSave();
  }

  private static async showWelcome(): Promise<void> {
    console.log(colors.primary.bold('\n╔═══════════════════════════════════════╗'));
    console.log(colors.primary.bold('║        🚀 HIZLI KURULUM SIHRBazi        ║'));
    console.log(colors.primary.bold('╚═══════════════════════════════════════╝\n'));
    console.log(colors.dim('📝 Bu kurulum sadece 1-2 dakika sürer\n'));
    console.log(colors.secondary('💡 Tüm ayarlar akıllı default değerlerle gelir'));
    console.log(colors.secondary("   Sadece Enter'a basarak ilerleyebilirsiniz\n"));
  }

  private static async showStep(title: string, stepKey: string): Promise<void> {
    console.log(colors.accent(`\n${title}`));
    console.log(colors.dim('─'.repeat(50)));
  }

  private static async waitForEnter(): Promise<void> {
    console.log(colors.dim("\n➤ Devam etmek için Enter'a basın..."));
    await new Promise<void>((resolve) => {
      process.stdin.setEncoding('utf8');
      process.stdin.once('data', () => resolve());
      process.stdin.resume();
    });
  }

  private static async setupBasic(): Promise<void> {
    console.log(colors.secondary('📌 Temel ayarlar:'));
    console.log(colors.dim('   Environment: development'));
    console.log(colors.dim('   Port: 3000'));
    console.log(colors.dim('   API Prefix: api'));
    console.log(colors.dim('   Base URL: http://localhost:3000'));

    this.config = {
      ...this.config,
      nodeEnv: 'development',
      port: 3000,
      apiPrefix: 'api',
      baseUrl: 'http://localhost:3000',
    };
  }

  private static async setupDatabase(): Promise<void> {
    console.log(colors.secondary('📌 Veritabanı ayarları:'));
    console.log(colors.dim('   Tip: PostgreSQL 15'));
    console.log(colors.dim('   User: user'));
    console.log(colors.dim('   Password: password'));
    console.log(colors.dim('   Database: boilerplate'));
    console.log(colors.dim('   Pool Min: 2'));
    console.log(colors.dim('   Pool Max: 10'));

    this.config = {
      ...this.config,
      databaseType: 'postgresql',
      postgresUser: 'user',
      postgresPassword: 'password',
      postgresDb: 'boilerplate',
      dbPoolMin: 2,
      dbPoolMax: 10,
    };
  }

  private static async setupSecurity(): Promise<void> {
    const jwtSecret = randomBytes(32).toString('hex');

    console.log(colors.secondary('📌 JWT Güvenlik ayarları:'));
    console.log(colors.dim('   Secret: (otomatik oluşturuldu)'));
    console.log(colors.dim('   Access Token: 15m'));
    console.log(colors.dim('   Refresh Token: 7d'));

    this.config = {
      ...this.config,
      jwtSecret,
      jwtAccessExpiration: '15m',
      jwtRefreshExpiration: '7d',
    };
  }

  private static async setupServices(): Promise<void> {
    console.log(colors.secondary('📌 Servis ayarları:'));
    console.log(colors.dim('   Redis: localhost:6379'));
    console.log(colors.dim('   Email: SendGrid (opsiyonel)'));
    console.log(colors.dim('   Error Tracking: Sentry (aktif)'));

    this.config = {
      ...this.config,
      awsRegion: 'us-east-1',
      redisHost: 'redis',
      redisPort: 6379,
      redisPassword: '123',
      redisDb: 0,
      redisTtl: 3600,
      mailProvider: 'sendgrid',
      sentryDsn: 'https://90ee13e61b2923403b3b1f9ebb9f08d1@sentry.adldev.tr/9',
      sentryEnvironment: 'development',
      sentryTracesSampleRate: 0.1,
      sentryDebug: true,
    };
  }

  private static async reviewAndSave(): Promise<void> {
    console.log(colors.accent('\n📋 Kurulum Özeti'));
    console.log(colors.dim('─'.repeat(50)));
    console.log(colors.secondary('✅ PostgreSQL veritabanı'));
    console.log(colors.secondary('✅ Redis cache'));
    console.log(colors.secondary('✅ JWT authentication'));
    console.log(colors.secondary('✅ Sentry error tracking'));
    console.log(colors.dim('\n💾 .env dosyası oluşturuluyor...\n'));

    await this.saveToFile();
  }

  private static async saveToFile(): Promise<void> {
    const envContent = this.generateEnvContent(this.config as SimpleConfig);
    const envPath = path.join(process.cwd(), '.env');

    await fs.promises.writeFile(envPath, envContent, 'utf8');
    console.log(colors.accent('✅ .env dosyası başarıyla oluşturuldu!\n'));

    console.log(colors.primary.bold('🎉 Kurulum tamamlandı!\n'));
    console.log(colors.accent('📌 Sıradaki adımlar:'));
    console.log(colors.secondary('   1. npm run docker:up'));
    console.log(colors.secondary('   2. npm run docker:migrate'));
    console.log(colors.secondary('   3. npm run docker:seed\n'));
  }

  private static generateEnvContent(config: SimpleConfig): string {
    return `# 🚀 Generated by Quick Setup Wizard
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
DATABASE_URL=postgresql://${config.postgresUser}:${config.postgresPassword}@postgres:5432/${config.postgresDb}
POSTGRES_USER=${config.postgresUser}
POSTGRES_PASSWORD=${config.postgresPassword}
POSTGRES_DB=${config.postgresDb}
DB_POOL_MIN=${config.dbPoolMin}
DB_POOL_MAX=${config.dbPoolMax}

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
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
S3_BUCKET=your-s3-bucket-name

# ============================================
# Email Configuration
# ============================================
MAIL_PROVIDER=${config.mailProvider}
SENDGRID_API_KEY=your-sendgrid-api-key
MAIL_FROM=noreply@example.com

# ============================================
# SMS Configuration
# ============================================
SMS_PROVIDER=FONIVA
FONIVA_API_URL=https://sms.foniva.com.tr:9588/sms/create
FONIVA_USERNAME=adlkurumsal
FONIVA_PASSWORD=Fon_SMS3266
FONIVA_API_KEY=YWRsa3VydW1zYWw6Rm9uX1NNUzMyNjY=
FONIVA_SENDER=ADLKURUMSAL

# ============================================
# Redis Cache Configuration
# ============================================
REDIS_HOST=${config.redisHost}
REDIS_PORT=${config.redisPort}
REDIS_PASSWORD=${config.redisPassword}
REDIS_DB=${config.redisDb}
REDIS_TTL=${config.redisTtl}

# ============================================
# Cache & Retry Configuration
# ============================================
DOCUMENT_CACHE_TTL=3600000
DOCUMENT_RETRY_MAX_ATTEMPTS=3
DOCUMENT_RETRY_BASE_DELAY=1000
S3_RETRY_MAX_ATTEMPTS=5
S3_RETRY_BASE_DELAY=2000
MAIL_RETRY_MAX_ATTEMPTS=5
MAIL_RETRY_BASE_DELAY=2000
SMS_RETRY_MAX_ATTEMPTS=5
SMS_RETRY_BASE_DELAY=2000

# ============================================
# Swagger Configuration
# ============================================
SWAGGER_ENABLED=true

# ============================================
# Sentry Error Tracking
# ============================================
SENTRY_DSN=${config.sentryDsn}
SENTRY_ENVIRONMENT=${config.sentryEnvironment}
SENTRY_TRACES_SAMPLE_RATE=${config.sentryTracesSampleRate}
SENTRY_DEBUG=${config.sentryDebug}

# ============================================
# Firebase Push Notifications
# ============================================
FIREBASE_ENABLED=false
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_RETRY_MAX_ATTEMPTS=5
FIREBASE_RETRY_BASE_DELAY=2000

`;
  }
}
