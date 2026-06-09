// Libraries
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AcceptLanguageResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import * as fs from 'fs';
import * as path from 'path';

// Configs
import appConfig from './config/app.config';
import awsConfig from './config/aws.config';
import databaseConfig from './config/database.config';
import { envSchema } from './config/env-validation.schema';
import fonivaConfig from './config/foniva.config';
import jwtConfig from './config/jwt.config';
import mailConfig from './config/mail.config';
import redisConfig from './config/redis.config';
import whatsappConfig from './config/whatsapp.config';

// Services
import { AppService } from './app.service';

// Controllers
import { AppController } from './app.controller';

// Modules
import { PrismaModule } from './database/prisma.module';
import { LoggerModule } from './common/logger/logger.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { FilesModule } from './modules/files/files.module';
import { UsersModule } from './modules/users/users.module';
import { SmsModule } from './modules/sms/sms.module';
import { MailModule } from './modules/mail/mail.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DocsModule } from './modules/docs/docs.module';
import { ChatModule } from './modules/chat/chat.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { InterestsModule } from './modules/interests/interests.module';
import { EventsModule } from './modules/events/events.module';
import { CommunitiesModule } from './modules/communities/communities.module';
import { ConnectionsModule } from './modules/connections/connections.module';
import { DiscoverModule } from './modules/discover/discover.module';
import { SpeakersModule } from './modules/speakers/speakers.module';
import { SponsorsModule } from './modules/sponsors/sponsors.module';
import { TicketsModule } from './modules/tickets/tickets.module';

const i18nPathCandidates = [
  path.join(__dirname, 'modules', 'i18n', 'translations'),
  path.join(__dirname, 'src', 'modules', 'i18n', 'translations'),
  path.join(process.cwd(), 'dist', 'modules', 'i18n', 'translations'),
  path.join(process.cwd(), 'dist', 'src', 'modules', 'i18n', 'translations'),
  path.join(process.cwd(), 'src', 'modules', 'i18n', 'translations'),
];

const i18nTranslationsPath = i18nPathCandidates.find((candidate) => fs.existsSync(candidate)) ?? i18nPathCandidates.at(-1)!;

@Module({
  imports: [
    // ConfigModule must be loaded first to validate environment variables
    // before any other module attempts to use them
    ConfigModule.forRoot({
      isGlobal: true, // Make config available in all modules without importing
      envFilePath: ['.env.development', '.env'], // Support environment-specific config files
      validationSchema: envSchema, // Joi validation schema for fail-fast approach
      validationOptions: {
        abortEarly: false, // Show all validation errors at once
        allowUnknown: true, // Allow extra variables for future epics
      },
      load: [appConfig, databaseConfig, jwtConfig, awsConfig, fonivaConfig, whatsappConfig, mailConfig, redisConfig], // Load config factory functions
    }),
    // I18n module for multi-language support (Story 7.1)
    I18nModule.forRoot({
      fallbackLanguage: 'tr', // Default language when translation is missing
      loaderOptions: {
        path: i18nTranslationsPath,
        watch: true, // Enable hot-reload in development
      },
      resolvers: [
        // Priority 1: Query parameter (?lang=tr)
        new QueryResolver(['lang']),
        // Priority 2: Accept-Language header
        AcceptLanguageResolver,
      ],
    }),
    // Logger module for structured logging (Story 7.3)
    LoggerModule,
    // Common module for CacheService (Story 6.5.1)
    CommonModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    FilesModule,
    SmsModule,
    MailModule,
    NotificationsModule,
    DocsModule,
    HealthModule,
    ChatModule,
    AnnouncementsModule,
    CategoriesModule,
    InterestsModule,
    EventsModule,
    CommunitiesModule,
    ConnectionsModule,
    DiscoverModule,
    SpeakersModule,
    SponsorsModule,
    TicketsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
