// Libraries
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { I18nService } from 'nestjs-i18n';

// Services
import { PrismaService } from '../../../database/prisma.service';
// Interfaces/Types
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * JWT Strategy for phone-based authentication
 * Validates JWT tokens and ensures user still exists in database
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  /**
   * Validates JWT payload and checks if user still exists
   * Called automatically by Passport after JWT signature verification
   *
   * @param payload - Decoded JWT payload
   * @returns Validated user payload or null (triggers 401)
   */
  async validate(payload: JwtPayload): Promise<JwtPayload | null> {
    // Validate user still exists and not deleted
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    // User not found or soft-deleted
    if (!user || user.deletedAt !== null) {
      throw new UnauthorizedException(await this.i18n.translate('errors.USER_NOT_FOUND_OR_DELETED'));
    }

    // Return payload to be attached to request.user
    return {
      sub: payload.sub,
      phoneNumber: payload.phoneNumber,
      roles: payload.roles,
      userType: payload.userType,
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}
