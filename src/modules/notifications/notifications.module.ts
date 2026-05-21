// Libraries
import { Module } from '@nestjs/common';

// Services
import { NotificationPreferencesService } from './services/notification-preferences.service';
import { NotificationService } from './services/notification.service';
import { FirebaseService } from './services/firebase.service';
import { DeviceTokenService } from './services/device-token.service';

// Controllers
import { NotificationPreferencesController } from './controllers/notification-preferences.controller';
import { NotificationController } from './controllers/notification.controller';
import { DeviceTokenController } from './controllers/device-token.controller';

// Database
import { PrismaModule } from '../../database/prisma.module';

// Modules
import { MailModule } from '../mail/mail.module';
import { SmsModule } from '../sms/sms.module';

/**
 * Notifications Module
 *
 * Provides unified notification service and preferences management:
 * - POST /notifications/send: Send notification via enabled channels (EMAIL, SMS, PUSH)
 * - GET /users/me/notifications: Get user notification history (pagination)
 * - GET /users/me/notification-preferences: Get user preferences
 * - PATCH /users/me/notification-preferences: Update user preferences (bulk)
 * - POST /users/me/device-tokens: Register device token for push notifications
 * - Default preferences creation on user registration
 */
@Module({
  imports: [
    PrismaModule, // For database access via PrismaService
    MailModule, // For MailService (EMAIL channel)
    SmsModule, // For SmsService (SMS channel)
  ],
  controllers: [NotificationPreferencesController, NotificationController, DeviceTokenController],
  providers: [NotificationPreferencesService, NotificationService, FirebaseService, DeviceTokenService],
  exports: [
    NotificationPreferencesService, // Export for use in UsersModule (default preferences creation)
    NotificationService, // Export for use in other modules (e.g., Auth, Chat modules)
  ],
})
export class NotificationsModule {}
