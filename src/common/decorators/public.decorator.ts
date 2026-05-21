// Libraries
import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for marking routes as public
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark routes as public (bypass JWT authentication)
 * Use this decorator on routes that should be accessible without authentication
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('public-endpoint')
 * getPublicData() {
 *   return { message: 'No authentication required' };
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
