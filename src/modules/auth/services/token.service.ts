// Libraries
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

// Services
import { PrismaService } from '../../../database/prisma.service';

// Interfaces/Types
import type { User } from '@prisma/client';

interface JwtPayload {
  sub: string;
  phoneNumber: string;
  roles: string[];
  userType: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Parse expiration string (e.g., '15m', '7d') to seconds
   * @param expiration Expiration string or number
   * @returns Expiration in seconds
   */
  private parseExpiration(expiration: string | number): number {
    if (typeof expiration === 'number') {
      return expiration;
    }

    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600; // Default: 1 hour
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 3600;
    }
  }

  /**
   * Generate JWT access token (stateless, short-lived)
   * @param user User entity
   * @returns Signed JWT token
   */
  async generateAccessToken(user: User): Promise<string> {
    // Get roles from UserRole junction table
    // Note: This requires user to be loaded with userRoles relation
    const roles = (user as any).userRoles?.map((ur: any) => ur.role?.name).filter(Boolean) || [];

    const payload: JwtPayload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      roles, // roles from UserRole junction table
      userType: user.userType, // ADMIN or USER
    };

    const expirationConfig = this.config.get<string>('JWT_ACCESS_EXPIRATION') || '15m';
    const expiresInSeconds = this.parseExpiration(expirationConfig);

    return this.jwtService.sign(payload, { expiresIn: expiresInSeconds });
  }

  /**
   * Generate refresh token (database-stored, long-lived, revokable)
   * @param user User entity
   * @returns UUID token string
   */
  async generateRefreshToken(user: User): Promise<string> {
    const token = randomUUID();
    const expirationConfig = this.config.get<string>('JWT_REFRESH_EXPIRATION') || '7d';
    const expiresInSeconds = this.parseExpiration(expirationConfig);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userID: user.id,
        token,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Generate both access and refresh tokens
   * @param user User entity
   * @returns Object containing accessToken, refreshToken, and expiresIn
   */
  async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);
    const expirationConfig = this.config.get<string>('JWT_ACCESS_EXPIRATION') || '15m';
    const expiresIn = this.parseExpiration(expirationConfig);

    return { accessToken, refreshToken, expiresIn };
  }

  /**
   * Refresh tokens using existing refresh token (with rotation)
   * @param refreshToken Refresh token UUID
   * @returns New access token, new refresh token, and expiresIn
   */
  async refreshTokens(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    // 1. Validate refresh token exists and not expired
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }, // Include user for token generation
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 2. Check expiration
    if (storedToken.expiresAt < new Date()) {
      // Delete expired token (cleanup)
      await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedException('Refresh token expired');
    }

    // 3. Validate user still exists
    const user = storedToken.user;
    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    // 4. Generate new tokens
    const accessToken = await this.generateAccessToken(user);

    // 5. Generate new refresh token and delete old one atomically (rotation)
    const expirationConfig = this.config.get<string>('JWT_REFRESH_EXPIRATION') || '7d';
    const expiresInSeconds = this.parseExpiration(expirationConfig);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const newToken = randomUUID();

    // Transaction ensures atomic delete + create (prevents race conditions)
    const [_, newRefreshToken] = await this.prisma.$transaction([
      this.prisma.refreshToken.delete({ where: { id: storedToken.id } }),
      this.prisma.refreshToken.create({
        data: {
          userID: user.id,
          token: newToken,
          expiresAt,
        },
      }),
    ]);

    const accessExpiresIn = this.parseExpiration(this.config.get<string>('JWT_ACCESS_EXPIRATION') || '15m');

    return {
      accessToken,
      refreshToken: newRefreshToken.token,
      expiresIn: accessExpiresIn,
    };
  }
}
