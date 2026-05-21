// Libraries
import { ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { I18nService } from 'nestjs-i18n';
// Guards/Decorators
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JWT Authentication Guard
 * Protects routes by validating JWT tokens from Authorization header
 * Supports @Public() decorator to bypass authentication
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private readonly i18n: I18nService,
  ) {
    super();
  }

  /**
   * Determines if the current request can proceed
   * Checks for @Public() metadata first, then validates JWT if not public
   *
   * @param context - Execution context
   * @returns true if authorized, throws UnauthorizedException if not
   */
  canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Bypass JWT validation for public routes
    }

    // Proceed with JWT validation via JwtStrategy
    return super.canActivate(context);
  }

  /**
   * Handles authentication errors
   * Converts Passport errors to NestJS UnauthorizedException
   *
   * @param err - Error from Passport
   * @param user - User from strategy (null if validation failed)
   * @param info - Additional info from Passport
   * @param context - Execution context
   * @returns User if valid
   * @throws UnauthorizedException if invalid
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // You can throw an exception based on either "err" argument
    if (err || !user) {
      this.logger.warn(`JWT authentication failed: ${err?.message || 'Invalid or expired token'}`);
      throw err || new UnauthorizedException(this.i18n.translate('errors.INVALID_CREDENTIALS', {}));
    }
    return user;
  }
}
