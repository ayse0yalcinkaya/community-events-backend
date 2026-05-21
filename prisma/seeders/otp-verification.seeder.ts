// Libraries
import { PrismaClient } from '@prisma/client';
import { OTPVerificationFactory } from '../factories/otp-verification.factory';

// Configs
import { getCurrentEnvironmentConfig } from '../config/environment.config';
/**
 * OTP Verification Seeder
 *
 * Creates sample OTP verification records for users
 * Supports EMAIL and SMS OTP types
 * Mix of verified and unverified records
 * Uses upsert for idempotent operations
 *
 * Factory Pattern Integration:
 * - OTPVerificationFactory.generate() - Creates a single OTP record
 * - OTPVerificationFactory.generateVerified() - Creates verified OTP
 * - OTPVerificationFactory.generateUnverified() - Creates active OTP
 * - OTPVerificationFactory.generateForUser() - Creates OTPs for specific user
 *
 * Example usage with factories:
 * const otp = OTPVerificationFactory.generate({
 *   userID: userId,
 *   domainID: domainId,
 *   type: 'EMAIL'
 * });
 * await prisma.oTPVerification.create({ data: otp });
 */
export class OTPVerificationSeeder {
  static async seed(prisma: PrismaClient): Promise<void> {
    console.log('🔢 Creating OTP verifications...');

    // Get environment-specific configuration
    const envConfig = getCurrentEnvironmentConfig();
    const targetOTPCount = envConfig.otpVerifications;

    if (targetOTPCount === 0) {
      console.log('  ℹ️ Production environment - skipping OTP verification seeding\n');
      return;
    }

    // Get all users
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
      },
    });

    if (users.length === 0) {
      console.log('  ⚠ No users found, skipping OTP verification seeding\n');
      return;
    }

    console.log(`  📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  📊 Target: ${targetOTPCount} OTP records`);
    console.log(`  📊 Distributing across ${users.length} users\n`);

    let createdCount = 0;
    const otpsPerUser = Math.ceil(targetOTPCount / users.length);

    // Create OTPs for each user
    for (const user of users) {
      // Determine OTP types based on user data
      const otpTypes = [];
      if (user.email) otpTypes.push('EMAIL');
      if (user.phoneNumber) otpTypes.push('SMS');

      if (otpTypes.length === 0) {
        continue;
      }

      const otpRecords: any[] = [];

      // Generate mix of verified and unverified OTPs
      const verifiedCount = Math.floor(otpTypes.length / 2);
      const unverifiedCount = otpTypes.length - verifiedCount;

      // Create verified OTPs
      for (let i = 0; i < verifiedCount; i++) {
        const type = otpTypes[i % otpTypes.length];
        otpRecords.push(OTPVerificationFactory.generateVerified(user.id, type));
      }

      // Create unverified OTPs
      for (let i = 0; i < unverifiedCount; i++) {
        const type = otpTypes[(i + verifiedCount) % otpTypes.length];
        otpRecords.push(OTPVerificationFactory.generateUnverified(user.id, type));
      }

      // Create additional random OTPs if needed
      const additionalCount = Math.min(otpRecords.length, otpsPerUser);
      for (let i = otpRecords.length; i < additionalCount; i++) {
        const type = otpTypes[i % otpTypes.length];
        otpRecords.push(
          OTPVerificationFactory.generate({
            userID: user.id,
            type,
          }),
        );
      }

      // Create OTPs in database
      for (const otpData of otpRecords.slice(0, otpsPerUser)) {
        try {
          // Check if OTP already exists (by userID, code, type)
          const existing = await prisma.oTPVerification.findFirst({
            where: {
              userID: otpData.userID,
              code: otpData.code,
              type: otpData.type,
            },
          });

          if (!existing) {
            await prisma.oTPVerification.create({
              data: otpData,
            });
            createdCount++;
          }
        } catch (error: any) {
          console.error(`  ⚠ Failed to create OTP for user ${user.firstName} ${user.lastName}:`, error.message);
        }
      }

      console.log(`  ✓ ${user.firstName} ${user.lastName} - ${Math.min(otpsPerUser, otpRecords.length)} OTP records`);
    }

    console.log(`✓ ${createdCount} OTP verifications created/updated\n`);
  }
}

// Standalone execution support
if (require.main === module) {
  const prisma = new PrismaClient();

  OTPVerificationSeeder.seed(prisma)
    .then(async () => {
      await prisma.$disconnect();
      console.log('✅ OTP verification seeder completed successfully');
    })
    .catch(async (error) => {
      console.error('❌ OTP verification seeder failed:', error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
