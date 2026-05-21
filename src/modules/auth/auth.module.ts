// Libraries
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';

// Services
import { AuthService } from './auth.service';
import { OtpService } from './services/otp.service';
import { TokenService } from './services/token.service';
import { UserProviderService } from './services/user-provider.service';

// Modules
import { SmsModule } from '../sms/sms.module';

// Guards/Decorators
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    // Configure Passport with JWT as default strategy
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Configure rate limiting (disabled in test environment to avoid flaky tests)
    ThrottlerModule.forRoot([
      {
        ttl: process.env.NODE_ENV === 'test' ? 60 : 900, // 1 min in test, 15 min in prod
        limit: process.env.NODE_ENV === 'test' ? 10000 : 5, // 10000 in test (effectively disabled), 5 in prod
      },
    ]),

    // Configure JWT module with async configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is required but not configured');
        }
        const expiresIn = configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m';
        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as any, // Can be string like '15m' or number in seconds
          },
        };
      },
    }),

    // Import SmsModule for SMS sending (Epic 5.1)
    SmsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, OtpService, TokenService, UserProviderService],
  exports: [AuthService, JwtStrategy, JwtModule, PassportModule, TokenService, OtpService, UserProviderService],
})
export class AuthModule {}
