// Libraries
import { Module } from '@nestjs/common';

// Services
import { AuthorizationService } from './services/authorization.service';
import { PermissionsService } from './services/permissions.service';

// Guards/Decorators
import { PermissionsController } from './controllers/permissions.controller';

/**
 * Permissions Module
 *
 * Provides permission-based authorization infrastructure:
 * - AuthorizationService: Permission checking logic (Story 3.5)
 * - PermissionsService: Permission CRUD and assignment operations (Story 3.8)
 * - PermissionsController: Admin permission management endpoints (Story 3.8)
 * - Permission constants: Type-safe permission strings
 * - @Permission decorator: Route-level permission metadata
 * - PermissionsGuard: Route guard for permission enforcement
 *
 * Import this module in any feature module that needs permission-based access control.
 */
@Module({
  controllers: [PermissionsController],
  providers: [AuthorizationService, PermissionsService],
  exports: [AuthorizationService, PermissionsService],
})
export class PermissionsModule {}
