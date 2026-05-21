// Libraries
import { Body, Controller, Get, Logger, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

// DTOs
import { AuthResponseDto } from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestLoginOtpDto } from './dto/request-login-otp.dto';
import { ResendVerificationOtpDto } from './dto/resend-verification-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthUserResDto } from './dto/user-res.dto';
import { VerifyLoginOtpDto } from './dto/verify-login-otp.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';

// Services
import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';
// Guards/Decorators
import { ApiEndpoint } from '@/common/decorators';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';

// Interfaces/Types
import type { JwtPayload } from './interfaces/jwt-payload.interface';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * User registration endpoint - phone-based authentication
   * No authentication required (@Public decorator)
   */
  @ApiEndpoint('Kullanıcı kaydı', { type: AuthUserResDto, isPublic: true })
  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<AuthUserResDto> {
    this.logger.log(`User registration request for: ${registerDto.phoneNumber}`);
    const user = await this.authService.register(registerDto);
    this.logger.log(`User registered successfully: ${user.id}`);
    return user;
  }

  /**
   * Admin login endpoint - phone-based authentication
   * No authentication required (@Public decorator)
   * Rate limited to 5 attempts per 15 minutes
   */
  @ApiEndpoint('Admin girişi', { type: AuthResponseDto, isPublic: true })
  @Public()
  @Throttle({
    default: { limit: process.env.NODE_ENV === 'test' ? 10000 : 5, ttl: 900 },
  }) // 5 attempts per 15 min (10000 in test - effectively disabled)
  @Post('login/admin')
  async loginAdmin(@Body() loginDto: LoginAdminDto): Promise<AuthResponseDto> {
    const result = await this.authService.loginAdmin(loginDto);
    return result;
  }

  /**
   * Staff login OTP request endpoint - request OTP for staff login
   * No authentication required (@Public decorator)
   * Rate limited to 3 attempts per 15 minutes per phone
   */
  @ApiEndpoint('Staff login OTP talebi', { isPublic: true })
  @Public()
  @Throttle({
    default: { limit: process.env.NODE_ENV === 'test' ? 10000 : 3, ttl: 900 },
  }) // 3 attempts / 15 min (10000 in test - effectively disabled)
  @Post('login/otp/request')
  async requestLoginOtp(@Body() dto: RequestLoginOtpDto): Promise<{ message: string; expiresIn: number }> {
    const result = await this.authService.requestLoginOtp(dto.phoneNumber);
    return {
      message: result.message,
      expiresIn: result.expiresIn,
    };
  }

  /**
   * Staff login OTP verify endpoint - verify OTP and complete login
   * No authentication required (@Public decorator)
   */
  @ApiEndpoint('Staff login OTP doğrulama', {
    type: AuthResponseDto,
    isPublic: true,
  })
  @Public()
  @Post('login/otp/verify')
  async verifyLoginOtp(@Body() dto: VerifyLoginOtpDto): Promise<AuthResponseDto> {
    return await this.authService.verifyLoginOtp(dto.phoneNumber, dto.code);
  }

  /**
   * Token refresh endpoint - refresh access token using refresh token
   * No authentication required (@Public decorator - uses refresh token instead)
   * Implements token rotation pattern (old refresh token invalidated, new one issued)
   */
  @ApiEndpoint('Token yenileme', { isPublic: true })
  @Public()
  @Post('refresh')
  async refresh(
    @Body() refreshDto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const result = await this.tokenService.refreshTokens(refreshDto.refreshToken);
    return result;
  }

  /**
   * Logout endpoint - invalidate refresh token
   * Requires valid JWT token (inherited from class-level guard)
   * Idempotent operation - returns success even if token not found
   */
  @ApiEndpoint('Çıkış yap')
  @Post('logout')
  async logout(@Body() logoutDto: LogoutDto): Promise<void> {
    await this.authService.logout(logoutDto.refreshToken);
  }

  /**
   * Forgot password endpoint - request OTP for password reset
   * No authentication required (@Public decorator)
   * Rate limited to 3 attempts per hour
   * Silent fail pattern - always returns 200 OK regardless of phone existence
   */
  @ApiEndpoint('Şifre sıfırlama talebi', { isPublic: true })
  @Public()
  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'test' ? 10000 : 3,
      ttl: 3600000,
    },
  }) // 3 attempts per hour (10000 in test - effectively disabled)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string; expiresIn: number }> {
    const result = await this.authService.forgotPassword(dto.phoneNumber);
    return {
      message: result.message,
      expiresIn: result.expiresIn,
    };
  }

  /**
   * Reset password endpoint - reset password using OTP
   * No authentication required (@Public decorator)
   */
  @ApiEndpoint('Şifre sıfırlama', { isPublic: true })
  @Public()
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(dto);
  }

  /**
   * Verify phone endpoint - validate phone using OTP
   * No authentication required (@Public decorator)
   * Graceful handling for already verified users
   */
  @ApiEndpoint('Telefon doğrulama', { isPublic: true })
  @Public()
  @Post('verify-phone')
  async verifyPhone(@Body() dto: VerifyPhoneDto): Promise<void> {
    await this.authService.verifyPhone(dto);
  }

  /**
   * Resend verification OTP endpoint - generate and send new phone verification OTP
   * No authentication required (@Public decorator)
   * Rate limited to 3 attempts per 15 minutes
   */
  @ApiEndpoint('Doğrulama kodu tekrar gönder', { isPublic: true })
  @Public()
  @Throttle({
    default: { limit: process.env.NODE_ENV === 'test' ? 10000 : 3, ttl: 900 },
  }) // 3 attempts / 15 min (10000 in test - effectively disabled)
  @Post('resend-verification-otp')
  async resendVerificationOtp(@Body() dto: ResendVerificationOtpDto): Promise<{ message: string; expiresIn: number }> {
    const result = await this.authService.resendVerificationOtp(dto.phoneNumber);
    return {
      message: result.message,
      expiresIn: result.expiresIn,
    };
  }

  /**
   * Public test endpoint - accessible without authentication
   * Tests @Public() decorator functionality
   */
  @ApiEndpoint('Test: Genel endpoint', { isPublic: true })
  @Public()
  @Get('test/public')
  getPublicEndpoint() {
    return {
      message: 'Public endpoint - no authentication required',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Protected test endpoint - requires valid JWT token
   * Tests JwtAuthGuard and @CurrentUser() decorator functionality (inherited from class-level guard)
   */
  @ApiEndpoint('Test: Korumalı endpoint')
  @Get('test/protected')
  getProtectedEndpoint(@CurrentUser() user: JwtPayload) {
    return {
      message: 'Protected endpoint - authentication required',
      user: {
        userId: user.sub,
        phoneNumber: user.phoneNumber,
        roles: user.roles,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
