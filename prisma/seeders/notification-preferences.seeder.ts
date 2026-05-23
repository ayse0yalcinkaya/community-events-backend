// Libraries
import { PrismaClient } from '@prisma/client';
import { NotificationPreferenceFactory } from '../factories/notification-preference.factory';

// Configs
import { getCurrentEnvironmentConfig } from '../config/environment.config';
/**
 * Notification Preferences Seeder
 *
 * Creates default notification preferences for all users
 * Supports EMAIL, SMS, and PUSH channels
 * Uses upsert for idempotent operations
 *
 * Factory Pattern Integration:
 * - NotificationPreferenceFactory.generate() - Creates a single preference
 * - NotificationPreferenceFactory.generateCompleteSet() - Creates all channels for a user
 * - NotificationPreferenceFactory.generateForUser() - Creates preferences for specific user
 *
 * Example usage with factories:
 * const preferences = NotificationPreferenceFactory.generateCompleteSet(userId, domainId);
 * for (const prefData of preferences) {
 *   await prisma.notificationPreference.upsert({
 *     where: { domainID_userID_channel: { ... } },
 *     create: prefData,
 *     update: {}
 *   });
 * }
 */
export class NotificationPreferencesSeeder {
  static async seed(prisma: PrismaClient): Promise<void> {
    console.log('⚙️ Creating notification preferences...');

    // Get environment-specific configuration
    const envConfig = getCurrentEnvironmentConfig();
    const targetPreferenceCount = envConfig.notificationPreferences;

    if (targetPreferenceCount === 0) {
      console.log('  ℹ️ Production environment - skipping notification preference seeding\n');
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
      console.log('  ⚠ No users found, skipping notification preference seeding\n');
      return;
    }

    console.log(`  📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  📊 Target: ${targetPreferenceCount} preferences`);
    console.log(`  📊 Creating preferences for ${users.length} users (all domain types x 3 channels)\n`);

    let createdCount = 0;
    const channels = ['EMAIL', 'SMS', 'PUSH'] as const;

    // Create complete preference set for each user
    for (const user of users) {
      const preferences = NotificationPreferenceFactory.generateForUser(user.id, channels);

      for (const prefData of preferences) {
        try {
          await prisma.notificationPreference.upsert({
            where: {
              userID_type_channel: {
                userID: prefData.userID,
                type: prefData.type,
                channel: prefData.channel,
              },
            },
            create: {
              userID: prefData.userID,
              type: prefData.type,
              channel: prefData.channel,
              enabled: prefData.enabled,
            },
            update: {
              enabled: prefData.enabled,
              updatedAt: new Date(),
            },
          });
          createdCount++;
        } catch (error: any) {
          console.error(
            `  ⚠ Failed to create preference for user ${user.firstName} ${user.lastName} (${prefData.channel}):`,
            error.message,
          );
        }
      }

      console.log(`  ✓ ${user.firstName} ${user.lastName} - 3 channel preferences configured`);
    }

    console.log(`✓ ${createdCount} notification preferences created/updated\n`);
  }
}

// Standalone execution support
if (require.main === module) {
  const prisma = new PrismaClient();

  NotificationPreferencesSeeder.seed(prisma)
    .then(async () => {
      await prisma.$disconnect();
      console.log('✅ Notification preferences seeder completed successfully');
    })
    .catch(async (error) => {
      console.error('❌ Notification preferences seeder failed:', error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
