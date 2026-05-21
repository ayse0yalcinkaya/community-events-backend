// Libraries
import { PrismaClient, NotificationSenderType, NotificationStatus } from '@prisma/client';
import { NotificationFactory } from '../factories/notification.factory';

// Configs
import { getCurrentEnvironmentConfig } from '../config/environment.config';
/**
 * Notification Seeder
 *
 * Creates sample notifications for all users
 * Uses upsert for idempotent operations
 *
 * Factory Pattern Integration:
 * - NotificationFactory.generate() - Creates a single notification
 * - NotificationFactory.generateForUser() - Creates notifications for specific user
 * - NotificationFactory.generateMany() - Creates bulk notifications
 *
 * Example usage with factories:
 * const notifications = NotificationFactory.generateMany(10, {
 *   type: 'EMAIL_VERIFICATION',
 *   channel: 'EMAIL'
 * });
 * for (const notificationData of notifications) {
 *   await prisma.notification.create({ data: notificationData });
 * }
 */
export class NotificationSeeder {
  static async seed(prisma: PrismaClient): Promise<void> {
    console.log('🔔 Creating notifications...');

    // Get environment-specific configuration
    const envConfig = getCurrentEnvironmentConfig();
    const targetNotificationCount = envConfig.notifications;

    if (targetNotificationCount === 0) {
      console.log('  ℹ️ Production environment - skipping notification seeding\n');
      return;
    }

    // Get all users to distribute notifications
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
      console.log('  ⚠ No users found, skipping notification seeding\n');
      return;
    }

    console.log(`  📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  📊 Target: ${targetNotificationCount} notifications`);
    console.log(`  📊 Distributing across ${users.length} users\n`);

    let createdCount = 0;
    const notificationsPerUser = Math.ceil(targetNotificationCount / users.length);

    // Create notifications for each user
    for (const user of users) {
      const notifications = NotificationFactory.generateForUser(
        user.id,
        Math.min(notificationsPerUser, 5), // Max 5 per user per run
      );

      for (const notificationData of notifications) {
        try {
          // Check if notification already exists (by userID, subject, message)
          const existing = await prisma.notification.findFirst({
            where: {
              userID: notificationData.userID,
              subject: notificationData.title || 'Notification',
              message: notificationData.message,
            },
          });

          if (!existing) {
            await prisma.notification.create({
              data: {
                userID: notificationData.userID,
                senderType: NotificationSenderType.SYSTEM,
                subject: notificationData.title || 'Notification',
                message: notificationData.message,
                read: false,
                status: NotificationStatus.SENT,
              },
            });
            createdCount++;
          }
        } catch (error: any) {
          console.error(
            `  ⚠ Failed to create notification for user ${user.firstName} ${user.lastName}:`,
            error.message,
          );
        }
      }

      console.log(`  ✓ ${user.firstName} ${user.lastName} - ${Math.min(notificationsPerUser, 5)} notifications`);
    }

    console.log(`✓ ${createdCount} notifications created/updated\n`);
  }
}

// Standalone execution support
if (require.main === module) {
  const prisma = new PrismaClient();

  NotificationSeeder.seed(prisma)
    .then(async () => {
      await prisma.$disconnect();
      console.log('✅ Notification seeder completed successfully');
    })
    .catch(async (error) => {
      console.error('❌ Notification seeder failed:', error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
