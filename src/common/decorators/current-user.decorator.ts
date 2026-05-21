// Libraries
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Interfaces/Types
import { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';

/**
 * Parameter decorator to extract authenticated user from request
 * User data is populated by JwtStrategy.validate() after successful JWT validation
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@CurrentUser() user: JwtPayload) {
 *   return {
 *     userId: user.sub,
 *     phone: user.phoneNumber,
 *     domain: user.domainID,
 *     roles: user.roles
 *   };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext): JwtPayload => {
  const request = ctx.switchToHttp().getRequest();
  return request.user; // Populated by JwtStrategy.validate()
});
