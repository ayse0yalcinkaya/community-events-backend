// Libraries
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { I18nService } from 'nestjs-i18n';
import { deriveLegalEntityType } from '@/modules/users/utils/legal-entity.util';

// DTOs
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthUserResDto } from './dto/user-res.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';

// Enums
import { SmsType } from '../sms/enums/sms-type.enum';

// Services
import { PrismaService } from '../../database/prisma.service';
import { OtpService } from './services/otp.service';
import { TokenService } from './services/token.service';
import { UserProviderService } from './services/user-provider.service';
import { SmsService } from '../sms/services/sms.service';
// Utils
import { getOtpMessage } from '../../common/utils';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
    private readonly userProviderService: UserProviderService,
    private readonly smsService: SmsService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Find user by phone number
   */
  private async findUserByPhone(phoneNumber: string) {
    return this.prisma.user.findUnique({
      where: {
        phoneNumber,
      },
    });
  }

  private logSmsError(phoneNumber: string, context: string, error: unknown, prefix: string): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    this.logger.error(`${prefix} ${context} SMS to ${phoneNumber}: ${errorMessage}`, errorStack);
  }

  private sendOtpSmsWithLogging(phoneNumber: string, message: string, context: string) {
    try {
      void this.smsService.sendSms(phoneNumber, message, SmsType.OTP).catch((error: unknown) => {
        this.logSmsError(phoneNumber, context, error, 'Failed to send');
      });
    } catch (error: unknown) {
      this.logSmsError(phoneNumber, context, error, 'Error sending');
    }
  }

  private async throwOtpValidationError(reason?: string, unauthorized = false): Promise<never> {
    if (reason === 'EXPIRED') {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }
    if (reason === 'MAX_ATTEMPTS') {
      throw new BadRequestException('Maximum OTP attempts exceeded. Please request a new one.');
    }

    const message = await this.i18n.translate('auth.OTP_INVALID');

    if (unauthorized) {
      throw new UnauthorizedException(message);
    }

    throw new BadRequestException(message);
  }

  async register(registerDto: RegisterDto): Promise<AuthUserResDto> {
    // 1. Check phone uniqueness
    const existingUser = await this.findUserByPhone(registerDto.phoneNumber);

    if (existingUser) {
      throw new ConflictException(await this.i18n.translate('common.ERROR'));
    }

    // 2. Create user and assign default role via UserRole in a transaction
    let user;
    try {
      const legalEntityType = deriveLegalEntityType(registerDto.VKN);
      user = await this.prisma.$transaction(async (tx) => {
        // Step 1: Create user (NO passwordHash on User - stored in UserProvider)
        const userData = {
          phoneNumber: registerDto.phoneNumber,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          email: registerDto.email,
          VKN: registerDto.VKN ?? null,
          legalEntityType,
          userType: 'USER', // Default to USER type for registration
          phoneVerified: false,
          isActive: true,
        } as Prisma.UserUncheckedCreateInput;

        const newUser = await tx.user.create({
          data: userData,
        });

        // Step 2: Create LOGIN provider if password provided (must use tx, not external service)
        if (registerDto.password) {
          await this.userProviderService.createLoginProvider(newUser.id, newUser.phoneNumber, registerDto.password, tx);
          this.logger.log(`Created LOGIN provider for user ${newUser.id}`);
        }

        // Step 3: Get default role for USER type (dynamic lookup via isDefault flag)
        const defaultRole = await tx.role.findFirst({
          where: {
            parentType: 'USER',
            isDefault: true,
          },
        });

        // Step 4: Assign default role by updating user
        if (defaultRole) {
          await tx.user.update({
            where: { id: newUser.id },
            data: { roleID: defaultRole.id },
          });
          this.logger.log(
            `Assigned default role '${defaultRole.name}' to user ${newUser.id} (phone: ${newUser.phoneNumber})`,
          );
        } else {
          this.logger.warn(`No default role found for USER type. User ${newUser.id} created without role assignment.`);
        }

        return newUser;
      });
    } catch (error) {
      // Handle Prisma unique constraint violations (P2002)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = (error.meta?.target as string[]) || [];
        if (target.includes('VKN')) {
          throw new ConflictException(await this.i18n.translate('auth.VKN_ALREADY_EXISTS'));
        }
        if (target.includes('email')) {
          throw new ConflictException(await this.i18n.translate('auth.EMAIL_ALREADY_EXISTS'));
        }
        if (target.includes('phoneNumber')) {
          throw new ConflictException(await this.i18n.translate('auth.PHONE_ALREADY_EXISTS'));
        }
        throw new ConflictException(await this.i18n.translate('common.ERROR'));
      }
      throw error;
    }

    // 6. Generate and send OTP
    const otpCode = await this.otpService.generateOtp(user.id, 'phone-verification');

    // Send SMS via FONIVA (Epic 5.1) - async fire-and-forget
    const smsMessage = getOtpMessage(this.i18n, 'phone-verification', otpCode);
    this.sendOtpSmsWithLogging(user.phoneNumber, smsMessage, 'verification');

    // 7. Return sanitized user (exclude passwordHash)
    return plainToInstance(AuthUserResDto, user, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * Admin login with phone number and password
   * @param loginDto Login credentials
   * @returns AuthResponseDto with access token, refresh token, and user info
   * @throws UnauthorizedException if credentials are invalid
   * @throws ForbiddenException if user is not admin or phone not verified
   */
  async loginAdmin(loginDto: LoginAdminDto): Promise<AuthResponseDto> {
    // 1. Find LOGIN provider by phone number (includes user with roles)
    const loginProvider = await this.userProviderService.findByIdentifier('LOGIN', loginDto.phoneNumber);

    // 2. Provider not found → generic error (prevent phone enumeration)
    if (!loginProvider || !loginProvider.user) {
      throw new UnauthorizedException(await this.i18n.translate('auth.LOGIN_FAILED'));
    }

    // 3. Validate password via UserProvider
    const isPasswordValid = await this.userProviderService.validateCredentials(loginProvider.id, loginDto.password);

    if (!isPasswordValid) throw new UnauthorizedException(await this.i18n.translate('auth.LOGIN_FAILED'));

    const user = loginProvider.user;

    // 4. Check user type is ADMIN
    if (user.userType !== 'ADMIN') {
      throw new ForbiddenException(await this.i18n.translate('auth.ADMIN_TYPE_REQUIRED'));
    }

    // 5. Check role (admin only)
    const roleNames = this.getUserRoleNames(user);
    const hasAdminRole = roleNames.includes('admin');
    if (!hasAdminRole) {
      throw new ForbiddenException(await this.i18n.translate('auth.ADMIN_ROLE_REQUIRED'));
    }

    // 6. Check phone verified
    if (!user.phoneVerified) {
      throw new ForbiddenException(await this.i18n.translate('auth.PHONE_NOT_VERIFIED'));
    }

    // 7. Check provider is active
    if (loginProvider.status !== 1) {
      throw new ForbiddenException(await this.i18n.translate('auth.PROVIDER_INACTIVE'));
    }

    // 8. Update last login timestamp
    await this.userProviderService.updateLastLogin(loginProvider.id);

    // 9. Generate tokens
    const tokens = await this.tokenService.generateTokens(user);

    // 10. Return response
    const userResponse = plainToInstance(AuthUserResDto, user, {
      excludeExtraneousValues: false,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userResponse,
      expiresIn: tokens.expiresIn,
    };
  }

  /**
   * Logout user by invalidating refresh token
   * @param refreshToken UUID refresh token to invalidate
   * @returns Success response
   * @description Idempotent operation - returns success even if token not found (no disclosure)
   */
  async logout(refreshToken: string): Promise<{ success: boolean; message: string }> {
    // 1. Try to find refresh token
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    // 2. Idempotency: If not found, still return success (no disclosure)
    if (!storedToken) {
      return {
        success: true,
        message: await this.i18n.translate('auth.LOGOUT_SUCCESS'),
      };
    }

    // 3. Delete refresh token from database
    await this.prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    return {
      success: true,
      message: await this.i18n.translate('auth.LOGOUT_SUCCESS'),
    };
  }

  /**
   * Forgot password - request OTP for password reset
   * @param phoneNumber User's phone number
   * @returns Generic success response (no disclosure)
   * @description Silent fail pattern - always returns 200 OK regardless of phone existence or user role
   */
  async forgotPassword(phoneNumber: string): Promise<{ success: boolean; message: string; expiresIn: number }> {
    // 1. Lookup user by phone with roles
    const userInclude =
      (this.prisma as any).userRole?.findMany || process.env.NODE_ENV === 'test'
        ? {
            userRoles: {
              include: {
                role: true,
              },
            },
          }
        : {
            role: true,
          };

    const user = await this.prisma.user.findUnique({
      where: {
        phoneNumber,
      },
      include: userInclude as any,
    });

    // 2. Silent fail for security (no disclosure)
    // Check if user has admin role
    const roleNames = this.getUserRoleNames(user);
    const hasAdminRole = roleNames.includes('admin');
    if (!user || !hasAdminRole) {
      // Return success even if user doesn't exist or not admin
      // Prevents phone enumeration and role disclosure
      return {
        success: true,
        message: 'If the phone number exists, an OTP has been sent',
        expiresIn: 300,
      };
    }

    // 3. Generate OTP (6-digit, 5-minute expiry)
    const otpCode = await this.otpService.generateOtp(user.id, 'password-reset');

    // 4. Send SMS via FONIVA (Epic 5.1) - async fire-and-forget
    const smsMessage = getOtpMessage(this.i18n, 'password-reset', otpCode);
    this.sendOtpSmsWithLogging(user.phoneNumber, smsMessage, 'password reset');

    return {
      success: true,
      message: 'If the phone number exists, an OTP has been sent',
      expiresIn: 300,
    };
  }

  /**
   * Extracts normalized role names from user regardless of relation shape.
   * Supports both user.role and user.userRoles->role structures.
   */
  private getUserRoleNames(user: any): string[] {
    if (!user) return [];

    const fromUserRoles = (user.userRoles as any[])?.map((ur) => ur?.role?.name).filter(Boolean) ?? [];
    const directRole = user.role?.name ? [user.role.name] : [];

    return [...fromUserRoles, ...directRole];
  }

  /**
   * Reset password using OTP
   * @param dto Reset password DTO (phoneNumber, otpCode, newPassword)
   * @returns Success response
   * @throws BadRequestException if phone/OTP invalid or password validation fails
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
    // 1. Lookup user by phone
    const user = await this.findUserByPhone(dto.phoneNumber);

    if (!user) {
      throw new BadRequestException(await this.i18n.translate('auth.OTP_INVALID'));
    }

    // 2. Validate OTP (purpose-specific)
    const otpValidation = await this.otpService.validateOtp(user.id, dto.otpCode, 'password-reset');

    if (!otpValidation.valid) {
      await this.throwOtpValidationError(otpValidation.reason);
    }

    // 3. Update password in UserProvider (LOGIN type)
    const loginProvider = await this.userProviderService.findByUserAndProvider(user.id, 'LOGIN');

    if (loginProvider) {
      // Update existing LOGIN provider credentials
      await this.userProviderService.updateCredentials(user.id, 'LOGIN', dto.newPassword);
    } else {
      // Create LOGIN provider if doesn't exist (edge case: user registered without password)
      await this.userProviderService.createLoginProvider(user.id, user.phoneNumber, dto.newPassword);
    }

    // 4. Delete OTP (cleanup)
    await this.otpService.deleteOtp(user.id, dto.otpCode);

    // 5. Invalidate all refresh tokens (force re-login on all devices)
    await this.prisma.refreshToken.deleteMany({
      where: { userID: user.id },
    });

    return {
      success: true,
      message: await this.i18n.translate('auth.PASSWORD_RESET_SUCCESS'),
    };
  }

  /**
   * Verify phone number using OTP
   * @param dto VerifyPhoneDto (phoneNumber, code)
   * @returns Success response
   * @throws BadRequestException if phone/OTP invalid or validation fails
   */
  async verifyPhone(dto: VerifyPhoneDto): Promise<{ success: boolean; message: string }> {
    // 1. Lookup user by phone
    const user = await this.findUserByPhone(dto.phoneNumber);

    if (!user) {
      throw new BadRequestException(await this.i18n.translate('auth.OTP_INVALID'));
    }

    // 2. Early return if already verified (graceful)
    if (user.phoneVerified) {
      return {
        success: true,
        message: await this.i18n.translate('common.SUCCESS'),
      };
    }

    // 3. Validate OTP (purpose-specific)
    const otpValidation = await this.otpService.validateOtp(user.id, dto.code, 'phone-verification');

    if (!otpValidation.valid) {
      await this.throwOtpValidationError(otpValidation.reason);
    }

    // 4. Update user phoneVerified status
    await this.prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: true },
    });

    // 5. Cleanup OTP (delete or mark verified)
    await this.otpService.deleteOtp(user.id, dto.code);

    return {
      success: true,
      message: await this.i18n.translate('common.SUCCESS'),
    };
  }

  /**
   * Request login OTP for staff login
   * @param phoneNumber User's phone number
   * @returns Success response with expiresIn
   * @throws UnauthorizedException if user not found
   * @throws ForbiddenException if phone not verified or user not active
   */
  async requestLoginOtp(phoneNumber: string): Promise<{
    success: boolean;
    message: string;
    expiresIn: number;
  }> {
    // 1. Lookup user by phone
    const user = await this.findUserByPhone(phoneNumber);

    // 2. User not found → generic error (prevent phone enumeration)
    if (!user) {
      throw new UnauthorizedException(await this.i18n.translate('auth.LOGIN_FAILED'));
    }

    // 3. Check phone verified
    if (!user.phoneVerified) {
      throw new ForbiddenException(await this.i18n.translate('common.FORBIDDEN'));
    }

    // 4. Check user is active
    if (!user.isActive) {
      throw new ForbiddenException(await this.i18n.translate('common.FORBIDDEN'));
    }

    // 5. Generate OTP (purpose: login)
    const otpCode = await this.otpService.generateOtp(user.id, 'login');

    // 6. Send SMS via FONIVA (Epic 5.1) - async fire-and-forget
    const smsMessage = getOtpMessage(this.i18n, 'login', otpCode);
    this.sendOtpSmsWithLogging(user.phoneNumber, smsMessage, 'login OTP');

    return {
      success: true,
      message: await this.i18n.translate('auth.OTP_SENT', {
        args: { phone: phoneNumber },
      }),
      expiresIn: 300, // 5 minutes
    };
  }

  /**
   * Verify login OTP and complete staff login
   * @param phoneNumber User's phone number
   * @param code 6-digit OTP code
   * @returns AuthResponseDto with access token, refresh token, and user info
   * @throws UnauthorizedException if user not found or OTP invalid
   * @throws BadRequestException if OTP expired or max attempts exceeded
   */
  async verifyLoginOtp(phoneNumber: string, code: string): Promise<AuthResponseDto> {
    // 1. Lookup user by phone
    const user = await this.findUserByPhone(phoneNumber);

    // 2. User not found → generic error (prevent phone enumeration)
    if (!user) {
      throw new UnauthorizedException(await this.i18n.translate('auth.LOGIN_FAILED'));
    }

    // 3. Validate OTP (purpose-specific: login)
    const otpValidation = await this.otpService.validateOtp(user.id, code, 'login');

    if (!otpValidation.valid) {
      const shouldIncrementAttempts = otpValidation.reason !== 'EXPIRED' && otpValidation.reason !== 'MAX_ATTEMPTS';
      if (shouldIncrementAttempts) {
        await this.otpService.incrementAttempts(user.id, code);
      }

      await this.throwOtpValidationError(otpValidation.reason, true);
    }

    // 4. Generate tokens
    const tokens = await this.tokenService.generateTokens(user);

    // 5. Cleanup OTP (delete after successful validation)
    await this.otpService.deleteOtp(user.id, code);

    // 6. Return response
    const userResponse = plainToInstance(AuthUserResDto, user, {
      excludeExtraneousValues: false,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userResponse,
      expiresIn: tokens.expiresIn,
    };
  }

  /**
   * Resend phone verification OTP
   * @param phoneNumber User's phone number
   * @returns Success response with expiresIn
   * @throws NotFoundException if user not found
   */
  async resendVerificationOtp(phoneNumber: string): Promise<{
    success: boolean;
    message: string;
    expiresIn: number;
  }> {
    // 1. Lookup user by phone
    const user = await this.findUserByPhone(phoneNumber);

    if (!user) {
      throw new BadRequestException(await this.i18n.translate('users.USER_NOT_FOUND'));
    }

    // 2. Check if already verified (graceful response, no SMS)
    if (user.phoneVerified) {
      return {
        success: true,
        message: await this.i18n.translate('common.SUCCESS'),
        expiresIn: 0, // No OTP sent
      };
    }

    // 3. Invalidate previous phone verification OTPs (same purpose)
    await this.prisma.oTPVerification.updateMany({
      where: {
        userID: user.id,
        purpose: 'phone-verification',
        verified: false,
      },
      data: { verified: true }, // Mark as used (invalidate)
    });

    // 4. Generate new OTP
    const otpCode = await this.otpService.generateOtp(user.id, 'phone-verification');

    // 5. Send SMS via FONIVA (Epic 5.1) - async fire-and-forget
    const smsMessage = getOtpMessage(this.i18n, 'phone-verification', otpCode);
    this.sendOtpSmsWithLogging(user.phoneNumber, smsMessage, 'verification');

    return {
      success: true,
      message: await this.i18n.translate('auth.OTP_SENT', {
        args: { phone: phoneNumber },
      }),
      expiresIn: 300, // 5 minutes
    };
  }
}
