// Libraries
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';

// Services
import { AuthorizationService } from '../../modules/permissions/services/authorization.service';
// Guards/Decorators
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSION_KEY, PermissionMetadata } from '../decorators/permission.decorator';
// Enums
import { ActionEnum } from '../enums/action.enum';
// Interfaces/Types
import { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';

/**
 * Permissions Guard
 *
 * Enforces permission-based access control on routes marked with @Permission decorator.
 * Executes after JwtAuthGuard (requires authenticated user in request).
 *
 * Flow:
 * 1. Check if route is @Public() → allow (no permission check needed)
 * 2. Extract @Permission metadata from route
 * 3. If no @Permission metadata → allow (route has no permission requirement)
 * 4. Extract user from request (set by JwtAuthGuard)
 * 5. Call AuthorizationService.hasPermission(userID, domainID, permission)
 * 6. Return true if granted, throw ForbiddenException if denied
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @Permission('USERS', ActionEnum.CREATE)
 * @Post()
 * async create() { ... }
 * ```
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private authorizationService: AuthorizationService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Determines if the current request can proceed based on user permissions.
   *
   * @param context - Execution context
   * @returns Promise<boolean> - true if authorized
   * @throws ForbiddenException if permission denied
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public (skip permission check)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Extract @Permission metadata from route
    const permissionMetadata = this.reflector.getAllAndOverride<PermissionMetadata | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no @Permission decorator, allow access (route has no permission requirement)
    if (!permissionMetadata) {
      return true;
    }

    // Extract user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload | undefined = request.user;

    // User should always exist here since JwtAuthGuard runs first
    // But defensive check in case guard order is wrong
    if (!user) {
      this.logger.error('User not authenticated in PermissionsGuard. Guard order may be incorrect.');
      throw new ForbiddenException(this.i18n.translate('errors.INVALID_CREDENTIALS', {}));
    }

    // Build permission string: MODULE.ACTION (e.g., USERS.CREATE)
    // Convert integer enum back to string for compatibility with AuthorizationService
    const actionString = this.getActionString(permissionMetadata.action);
    const permission = `${permissionMetadata.module}.${actionString}`;

    // Check if user has required permission
    const hasPermission = await this.authorizationService.hasPermission(
      user.sub, // userID
      permission,
    );

    if (!hasPermission) {
      this.logger.warn(`Permission denied for user ${user.sub}: ${permission}`);
      throw new ForbiddenException(
        this.i18n.translate('errors.PERMISSION_DENIED', {
          args: { permission },
        }),
      );
    }

    this.logger.debug(`Permission granted for user ${user.sub}: ${permission}`);
    return true;
  }

  /**
   * Convert integer enum value back to string representation
   * @param action - Integer action value from ActionEnum
   * @returns String representation of the action
   */
  private getActionString(action: ActionEnum | number): string {
    const reverseMap: Record<number, string> = {
      [ActionEnum.CREATE]: 'CREATE',
      [ActionEnum.VIEW]: 'VIEW',
      [ActionEnum.UPDATE]: 'UPDATE',
      [ActionEnum.DELETE]: 'DELETE',
      [ActionEnum.ASSIGN]: 'ASSIGN',
      [ActionEnum.REVOKE]: 'REVOKE',
      [ActionEnum.ACTIVATE]: 'ACTIVATE',
      [ActionEnum.VIEW_ALL]: 'VIEW_ALL',
      [ActionEnum.MARK_READ]: 'MARK_READ',
      [ActionEnum.SEND]: 'SEND',
      [ActionEnum.MANAGE]: 'MANAGE',
      [ActionEnum.REGISTER]: 'REGISTER',
      [ActionEnum.VERIFY]: 'VERIFY',
      [ActionEnum.RESEND]: 'RESEND',
      [ActionEnum.APPROVE]: 'APPROVE',
      [ActionEnum.EXPORT]: 'EXPORT',
      [ActionEnum.RESPOND]: 'RESPOND',
    };

    return reverseMap[action] || 'UNKNOWN';
  }
}
