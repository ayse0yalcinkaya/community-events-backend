import { PrismaClient } from '@prisma/client';
import { DeviceTokenFactory } from '../factories/device-token.factory';
import { getCurrentEnvironmentConfig } from '../config/environment.config';

/**
 * Device Token Seeder
 *
 * Creates device token records for push notifications
 * Supports iOS and Android platforms
 * Uses upsert for idempotent operations
 *
 * Factory Pattern Integration:
 * - DeviceTokenFactory.generate() - Creates a single device token
 * - DeviceTokenFactory.generateForUser() - Creates tokens for specific user
 * - DeviceTokenFactory.generateForUserMultiPlatform() - Creates both iOS and Android tokens
 * - DeviceTokenFactory.generateMany() - Creates bulk device tokens
 *
 * Example usage with factories:
 * const tokens = DeviceTokenFactory.generateForUserMultiPlatform(userId, domainId);
 * for (const tokenData of tokens) {
 *   await prisma.deviceToken.upsert({
 *     where: { token: tokenData.token },
 *     create: tokenData,
 *     update: {}
 *   });
 * }
 */
export class DeviceTokenSeeder {
  static async seed(prisma: PrismaClient): Promise<void> {
    console.log('📱 Creating device tokens...');

    // Get environment-specific configuration
    const envConfig = getCurrentEnvironmentConfig();
    const targetDeviceTokenCount = envConfig.deviceTokens;

    if (targetDeviceTokenCount === 0) {
      console.log('  ℹ️ Production environment - skipping device token seeding\n');
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
        firstName: true,
        lastName: true,
      },
    });

    if (users.length === 0) {
      console.log('  ⚠ No users found, skipping device token seeding\n');
      return;
    }

    console.log(`  📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  📊 Target: ${targetDeviceTokenCount} device tokens`);
    console.log(`  📊 Distributing across ${users.length} users\n`);

    let createdCount = 0;
    const tokensPerUser = Math.ceil(targetDeviceTokenCount / users.length);

    // Create device tokens for each user
    for (const user of users) {
      const deviceTokens: any[] = [];

      // 60% chance to create multi-platform tokens
      if (Math.random() > 0.4) {
        deviceTokens.push(
          ...DeviceTokenFactory.generateForUserMultiPlatform(user.id),
        );
      } else {
        // Create single token (random platform)
        deviceTokens.push(
          ...DeviceTokenFactory.generateForUser(user.id, 1),
        );
      }

      // Create additional tokens if needed
      if (tokensPerUser > deviceTokens.length) {
        const additional = Math.min(tokensPerUser - deviceTokens.length, 3);
        deviceTokens.push(
          ...DeviceTokenFactory.generateForUser(user.id, additional),
        );
      }

      // Create tokens in database
      for (const tokenData of deviceTokens.slice(0, tokensPerUser)) {
        try {
          await prisma.deviceToken.upsert({
            where: {
              token: tokenData.token,
            },
            create: tokenData,
            update: {},
          });
          createdCount++;
        } catch (error: any) {
          console.error(
            `  ⚠ Failed to create device token for user ${user.firstName} ${user.lastName}:`,
            error.message,
          );
        }
      }

      console.log(
        `  ✓ ${user.firstName} ${user.lastName} - ${Math.min(tokensPerUser, deviceTokens.length)} device tokens`,
      );
    }

    console.log(`✓ ${createdCount} device tokens created/updated\n`);
  }
}

// Standalone execution support
if (require.main === module) {
  const prisma = new PrismaClient();

  DeviceTokenSeeder.seed(prisma)
    .then(async () => {
      await prisma.$disconnect();
      console.log('✅ Device token seeder completed successfully');
    })
    .catch(async (error) => {
      console.error('❌ Device token seeder failed:', error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
