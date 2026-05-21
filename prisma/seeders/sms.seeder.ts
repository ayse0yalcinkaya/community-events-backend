// Libraries
import { PrismaClient } from '@prisma/client';

// Configs
import { getCurrentEnvironmentConfig } from '../config/environment.config';
const SMS_TYPES = [0, 1, 2, 3] as const; // OTP, NOTIFICATION, MARKETING, ALERT
const SMS_STATUSES = [0, 1, 2] as const; // PENDING, SENT, DELIVERED
const MS_PER_DAY = 24 * 60 * 60 * 1000;

let sequence = 0;
const nextSeed = () => {
  sequence += 1;
  return sequence;
};

const pickFrom = <T>(items: readonly T[], seed: number) => items[seed % items.length];
const randomSixDigitCode = (seed: number) => 100000 + (seed % 900000);
const recentDate = (seed: number, days = 30) => {
  const dayOffset = (seed % days) + 1;
  const intraDayOffset = (seed * 7919) % MS_PER_DAY;
  return new Date(Date.now() - dayOffset * MS_PER_DAY + intraDayOffset);
};

/**
 * SMS Seeder
 *
 * Creates sample SMS logs for OTP testing
 * Uses upsert for idempotent operations
 */
export class SmsSeeder {
  static async seed(prisma: PrismaClient): Promise<void> {
    console.log('📱 Creating sample SMS logs...');

    // Get environment-specific configuration
    const envConfig = getCurrentEnvironmentConfig();
    const targetSmsCount = envConfig.sms;

    if (targetSmsCount === 0) {
      console.log('  ℹ️ Production environment - skipping SMS seeding\n');
      return;
    }

    // Get users to generate SMS for their phone numbers
    const users = await prisma.user.findMany({
      orderBy: { email: 'asc' },
      take: 50,
    });

    if (users.length === 0) {
      console.log('  ℹ️ No users found - skipping SMS seeding\n');
      return;
    }

    let smsCount = 0;

    for (let i = 0; i < targetSmsCount; i++) {
      const userIndex = i % users.length;
      const user = users[userIndex];
      const seed = nextSeed();

      const smsType = pickFrom(SMS_TYPES, seed);
      const status = pickFrom(SMS_STATUSES, seed * 13);
      const code = randomSixDigitCode(seed * 17);

      let message = '';
      switch (smsType) {
        case 0: // OTP
          message = `Your verification code is: ${code}`;
          break;
        case 1: // NOTIFICATION
          message = `You have a new notification. Reference code: ${code}`;
          break;
        case 2: // MARKETING
          message = `Special offer for you! Use code: ${code}`;
          break;
        case 3: // ALERT
          message = `Important alert: ${code}`;
          break;
      }

      // Check if SMS already exists (by phoneNumber and message)
      const existingSms = await prisma.sMS.findFirst({
        where: {
          phoneNumber: user.phoneNumber,
          message: message,
        },
      });

      if (existingSms) {
        console.log(`  ✓ ${user.phoneNumber} - ${smsType} (already exists)`);
      } else {
        // Create new SMS log
        await prisma.sMS.create({
          data: {
            phoneNumber: user.phoneNumber,
            message: message,
            status,
            provider: 'foniva',
            type: smsType,
            sentAt: recentDate(seed),
          },
        });
        console.log(`  ✓ ${user.phoneNumber} - ${smsType} (${status})`);
      }
      smsCount++;
    }

    console.log(`✓ ${smsCount} SMS logs created/updated\n`);
  }
}
