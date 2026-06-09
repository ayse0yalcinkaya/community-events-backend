// Libraries
import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

// Services
import { PrismaService } from '../../../database/prisma.service';
export type OtpPurpose = 'login' | 'password-reset' | 'phone-verification';

export interface OtpValidationResult {
  valid: boolean;
  userID?: string;
  reason?: 'EXPIRED' | 'INVALID_CODE' | 'MAX_ATTEMPTS' | 'NOT_FOUND';
  attemptsRemaining?: number;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private static readonly FIXED_OTP_PHONE_NUMBERS = new Set(['+905350506655', '+905067957939']);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate OTP for user with specific purpose
   * @param userID User ID
   * @param purpose OTP purpose (login, password-reset, phone-verification)
   * @returns 6-digit OTP code
   */
  async generateOtp(userID: string, purpose: OtpPurpose): Promise<string> {
    // 1. Invalidate previous OTPs for same user and purpose
    await this.prisma.oTPVerification.updateMany({
      where: {
        userID,
        purpose, // Filter by purpose
        verified: false,
      },
      data: { verified: true }, // Mark as used (invalidate)
    });

    // 2. Generate 6-digit OTP
    const code = process.env.NODE_ENV === 'development' ? '999999' : crypto.randomInt(100000, 999999).toString();

    // 3. Create OTP record with 5-minute expiry
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.prisma.oTPVerification.create({
      data: {
        userID,
        code,
        type: 'SMS',
        purpose, // Store purpose
        expiresAt,
        attempts: 0,
        verified: false,
      },
    });

    this.logger.log(`OTP generated for user ${userID} (purpose: ${purpose}): ${code}`);

    return code;
  }

  /**
   * Validate OTP code for user
   * @param userID User ID
   * @param code 6-digit OTP code
   * @param purpose Optional purpose filter
   * @returns Validation result with status and reason
   */
  async validateOtp(userID: string, code: string, purpose?: OtpPurpose): Promise<OtpValidationResult> {
    // 1. Find OTP
    const otp = await this.prisma.oTPVerification.findFirst({
      where: {
        userID,
        code,
        purpose: purpose || undefined, // Filter by purpose if provided
        verified: false,
      },
    });

    if (!otp) {
      return { valid: false, reason: 'NOT_FOUND' };
    }

    // 2. Check expiry
    if (new Date() > otp.expiresAt) {
      return { valid: false, reason: 'EXPIRED' };
    }

    // 3. Check attempts
    if (otp.attempts >= 3) {
      return { valid: false, reason: 'MAX_ATTEMPTS' };
    }

    // 4. Code matches (already filtered in query)
    // Mark as verified
    await this.prisma.oTPVerification.update({
      where: { id: otp.id },
      data: { verified: true },
    });

    this.logger.log(`OTP validated successfully for user ${userID} (purpose: ${otp.purpose})`);

    return { valid: true, userID };
  }

  /**
   * Increment OTP attempt counter
   * @param userID User ID
   * @param code OTP code
   */
  async incrementAttempts(userID: string, code: string): Promise<void> {
    await this.prisma.oTPVerification.updateMany({
      where: {
        userID,
        code,
        verified: false,
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Delete OTP after successful validation (cleanup)
   * @param userID User ID
   * @param code OTP code
   */
  async deleteOtp(userID: string, code: string): Promise<void> {
    await this.prisma.oTPVerification.deleteMany({
      where: { userID, code },
    });

    this.logger.log(`OTP deleted for user ${userID}`);
  }

  /**
   * Legacy method for backward compatibility (Epic 5.1 integration)
   * @deprecated Use generateOtp() and send SMS separately
   */
  async generateAndSendOtp(userID: string, phoneNumber: string): Promise<void> {
    // TODO: Epic 5.1 - FONIVA SMS integration
    // For now, just log OTP (development only)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    this.logger.log(`[STUB] OTP for ${phoneNumber}: ${otpCode}`);
    this.logger.warn('OTP sending is stubbed. Epic 5.1 will implement FONIVA integration.');

    // In Epic 5.1, this will:
    // 1. Store OTP in OTPVerification table
    // 2. Call SmsService.sendOtp(phoneNumber, otpCode)
    // 3. Handle SMS delivery confirmation
  }
}
