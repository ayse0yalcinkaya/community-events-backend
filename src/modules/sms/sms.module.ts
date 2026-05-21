// Libraries
import { Module } from '@nestjs/common';

// Services
import { SmsService } from './services/sms.service';
import { FonivaService } from './services/foniva.service';

// Controllers
import { SmsController } from './controllers/sms.controller';

// Guards/Decorators
import { PermissionsModule } from '../permissions/permissions.module';

/**
 * SMS Module
 *
 * Provides SMS sending functionality via FONIVA provider:
 * - SMS sending with database tracking
 * - Retry mechanism with exponential backoff
 * - Webhook callbacks for delivery status
 * - SMS statistics with multi-tenant filtering
 */
@Module({
  imports: [
    PermissionsModule, // Import PermissionsModule for AuthorizationService (used by PermissionsGuard)
  ],
  controllers: [SmsController],
  providers: [SmsService, FonivaService],
  exports: [SmsService], // Export for use in Auth module (OTP sending)
})
export class SmsModule {}
