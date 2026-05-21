import { PrismaClient } from '@prisma/client';
import { RefreshTokenFactory } from '../factories/refresh-token.factory';
import { getCurrentEnvironmentConfig } from '../config/environment.config';

/**
 * Refresh Token Seeder
 *
 * Creates refresh token records for JWT authentication
 * Generates realistic tokens with proper expiration dates
 * Mix of fresh, expiring, and expired tokens
 * Uses upsert for idempotent operations
 *
 * Factory Pattern Integration:
 * - RefreshTokenFactory.generate() - Creates a single refresh token
 * - RefreshTokenFactory.generateFresh() - Creates fresh token (25 days to expiry)
 * - RefreshTokenFactory.generateExpiringSoon() - Creates token expiring in 2 hours
 * - RefreshTokenFactory.generateExpired() - Creates expired token (for testing cleanup)
 * - RefreshTokenFactory.generateForUser() - Creates tokens for specific user
 *
 * Example usage with factories:
 * const token = RefreshTokenFactory.generateFresh(userId, domainId);
 * await prisma.refreshToken.upsert({
 *   where: { token: token.token },
 *   create: token,
 *   update: {}
 * });
 */
export class RefreshTokenSeeder {
  static async seed(prisma: PrismaClient): Promise<void> {
    console.log('🔑 Creating refresh tokens...');

    // Get environment-specific configuration
    const envConfig = getCurrentEnvironmentConfig();
    const targetTokenCount = envConfig.refreshTokens;

    if (targetTokenCount === 0) {
      console.log('  ℹ️ Production environment - skipping refresh token seeding\n');
      return;
    }

    // Get active users
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (users.length === 0) {
      console.log('  ⚠ No users found, skipping refresh token seeding\n');
      return;
    }

    console.log(`  📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  📊 Target: ${targetTokenCount} refresh tokens`);
    console.log(`  📊 Distributing across ${users.length} users\n`);

    let createdCount = 0;
    const tokensPerUser = Math.ceil(targetTokenCount / users.length);

    // Create refresh tokens for each user
    for (const user of users) {
      const refreshTokens: any[] = [];

      // Create mix of token types:
      // 70% fresh tokens, 20% expiring soon, 10% expired
      const freshCount = Math.max(1, Math.floor(tokensPerUser * 0.7));
      const expiringSoonCount = Math.floor(tokensPerUser * 0.2);
      const expiredCount = Math.max(0, tokensPerUser - freshCount - expiringSoonCount);

      // Create fresh tokens
      for (let i = 0; i < freshCount; i++) {
        refreshTokens.push(RefreshTokenFactory.generateFresh(user.id));
      }

      // Create expiring soon tokens
      for (let i = 0; i < expiringSoonCount; i++) {
        refreshTokens.push(RefreshTokenFactory.generateExpiringSoon(user.id));
      }

      // Create expired tokens
      for (let i = 0; i < expiredCount; i++) {
        refreshTokens.push(RefreshTokenFactory.generateExpired(user.id));
      }

      // Create tokens in database
      for (const tokenData of refreshTokens) {
        try {
          await prisma.refreshToken.upsert({
            where: {
              token: tokenData.token,
            },
            create: tokenData,
            update: {},
          });
          createdCount++;
        } catch (error: any) {
          console.error(
            `  ⚠ Failed to create refresh token for user ${user.firstName} ${user.lastName}:`,
            error.message,
          );
        }
      }

      console.log(
        `  ✓ ${user.firstName} ${user.lastName} - ${tokensPerUser} refresh tokens (${freshCount} fresh, ${expiringSoonCount} expiring, ${expiredCount} expired)`,
      );
    }

    console.log(`✓ ${createdCount} refresh tokens created/updated\n`);
  }
}

// Standalone execution support
if (require.main === module) {
  const prisma = new PrismaClient();

  RefreshTokenSeeder.seed(prisma)
    .then(async () => {
      await prisma.$disconnect();
      console.log('✅ Refresh token seeder completed successfully');
    })
    .catch(async (error) => {
      console.error('❌ Refresh token seeder failed:', error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
