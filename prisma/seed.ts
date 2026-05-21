/**
 * Prisma Native Seeding Entry Point
 *
 * Main entry point for Prisma database seeding
 * Executes all seeders in proper dependency order
 *
 * Usage: npm run prisma:seed
 * Or: npx prisma db seed
 *
 * Architecture:
 * - Modular seeder pattern: Each entity has its own seeder class
 * - Dependency-aware execution: Seeders run in order
 * - Idempotent operations: All seeders use upsert() to prevent duplicates
 * - Error handling: try-catch with process.exit(1) on failure
 * - Progress logging: console.log() with checkmarks
 * - Environment-specific: Data volumes vary by NODE_ENV (development/test/staging)
 * - Transaction safety: $transaction ensures all-or-nothing seeding
 */
// Libraries
import { PrismaClient } from '@prisma/client';

// Configs
import { getEnvironment } from './config/environment.config';
// Seeders
import { RoleSeeder } from './seeders/role.seeder';
import { PermissionSeeder } from './seeders/permission.seeder';
import { UserSeeder } from './seeders/user.seeder';
import { FileSeeder } from './seeders/file.seeder';
import { SmsSeeder } from './seeders/sms.seeder';
import { NotificationPreferencesSeeder } from './seeders/notification-preferences.seeder';
import { DeviceTokenSeeder } from './seeders/device-token.seeder';
import { OTPVerificationSeeder } from './seeders/otp-verification.seeder';
import { RefreshTokenSeeder } from './seeders/refresh-token.seeder';
import { NotificationSeeder } from './seeders/notification.seeder';
import { ModuleSeeder } from './seeders/module.seeder';

/**
 * Main seed function
 * Executes all seeders in proper dependency order with transaction safety
 */
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌱 Starting Prisma Database Seeding');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const prisma = new PrismaClient();
  const startTime = Date.now();

  // Get current environment
  const environment = getEnvironment();
  const seederStartTime: Record<string, number> = {};

  try {
    // ========================================
    // 1. Initialize database connection
    // ========================================
    console.log('🔌 Connecting to database...\n');
    console.log(`🌍 Environment: ${environment}`);
    console.log(`📊 Data volumes: See individual seeder logs\n`);

    await prisma.$connect();

    // ========================================
    // 2. Execute seeders in dependency order with transaction
    // All seeders must succeed or all will rollback
    // ========================================
    const seederTimings: Record<string, number> = {};

    await prisma
      .$transaction(async (tx) => {
        console.log('💾 Starting transactional database seeding...');
        console.log('   All seeders must succeed, or all changes will rollback\n');

        // Step 1: Create roles (no dependencies)
        seederStartTime['roles'] = Date.now();
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Step 1/10: Creating Roles');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        await RoleSeeder.seed(tx as any);
        seederTimings['roles'] = Date.now() - seederStartTime['roles'];
        console.log(`⏱️  Roles: ${seederTimings['roles']}ms\n`);

        // Step 2: Create modules (no dependencies)
        seederStartTime['modules'] = Date.now();
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Step 2/10: Creating Modules');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        await ModuleSeeder.seed(tx as any);
        seederTimings['modules'] = Date.now() - seederStartTime['modules'];
        console.log(`⏱️  Modules: ${seederTimings['modules']}ms\n`);

        // Step 3: Create permissions (depends on modules)
        seederStartTime['permissions'] = Date.now();
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Step 3/10: Creating Permissions');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        await PermissionSeeder.seed(tx as any);
        seederTimings['permissions'] = Date.now() - seederStartTime['permissions'];
        console.log(`⏱️  Permissions: ${seederTimings['permissions']}ms\n`);

        // Step 4: Create users (depends on roles)
        seederStartTime['users'] = Date.now();
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Step 4/10: Creating Users');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        await UserSeeder.seed(tx as any);
        seederTimings['users'] = Date.now() - seederStartTime['users'];
        console.log(`⏱️  Users: ${seederTimings['users']}ms\n`);

        // Step 5: Create files (depends on users)
        seederStartTime['files'] = Date.now();
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Step 5/10: Creating Files');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        await FileSeeder.seed(tx as any);
        seederTimings['files'] = Date.now() - seederStartTime['files'];
        console.log(`⏱️  Files: ${seederTimings['files']}ms\n`);

        // Step 6: Create SMS logs (no dependencies)
        seederStartTime['sms'] = Date.now();
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Step 6/10: Creating SMS Logs');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        await SmsSeeder.seed(tx as any);
        seederTimings['sms'] = Date.now() - seederStartTime['sms'];
        console.log(`⏱️  SMS: ${seederTimings['sms']}ms\n`);

        // Step 7: Create notification preferences (depends on users)
        seederStartTime['notificationPreferences'] = Date.now();
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Step 7/10: Creating Notification Preferences');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        await NotificationPreferencesSeeder.seed(tx as any);
        seederTimings['notificationPreferences'] = Date.now() - seederStartTime['notificationPreferences'];
        console.log(`⏱️  Notification Preferences: ${seederTimings['notificationPreferences']}ms\n`);

        // Step 8: Create device tokens (depends on users)
        seederStartTime['deviceTokens'] = Date.now();
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Step 8/10: Creating Device Tokens');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        await DeviceTokenSeeder.seed(tx as any);
        seederTimings['deviceTokens'] = Date.now() - seederStartTime['deviceTokens'];
        console.log(`⏱️  Device Tokens: ${seederTimings['deviceTokens']}ms\n`);

        // Step 9: Create OTP verifications (depends on users)
        seederStartTime['otpVerifications'] = Date.now();
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Step 9/10: Creating OTP Verifications');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        await OTPVerificationSeeder.seed(tx as any);
        seederTimings['otpVerifications'] = Date.now() - seederStartTime['otpVerifications'];
        console.log(`⏱️  OTP Verifications: ${seederTimings['otpVerifications']}ms\n`);

        // Step 10: Create refresh tokens (depends on users)
        seederStartTime['refreshTokens'] = Date.now();
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Step 10/10: Creating Refresh Tokens & Notifications');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        await RefreshTokenSeeder.seed(tx as any);
        await NotificationSeeder.seed(tx as any);
        seederTimings['refreshTokens'] = Date.now() - seederStartTime['refreshTokens'];
        console.log(`⏱️  Refresh Tokens & Notifications: ${seederTimings['refreshTokens']}ms\n`);

        console.log('\n💾 Transaction committed successfully ✓\n');

        // Store timings for summary
        return seederTimings;
      })
      .then((timings) => {
        Object.assign(seederTimings, timings);
      });

    // ========================================
    // 3. Success summary with performance metrics
    // ========================================
    const totalTime = Date.now() - startTime;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Database seeding completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⏱️  Performance Summary:');
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Environment: ${environment}`);

    // Check performance targets
    if (environment === 'test' && totalTime > 3000) {
      console.log('\n⚠️  WARNING: Test environment seeding exceeded 3s target!');
      console.log('   Consider reducing data volumes for better CI/CD performance.');
    } else if (environment === 'test') {
      console.log('\n✅ Test environment performance target met (< 3s)');
    }

    console.log('\n🔑 Sample Login Credentials:');
    console.log('  - admin@communityevents.local (password: Admin123!)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error: any) {
    const totalTime = Date.now() - startTime;

    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Seeding failed - Transaction rolled back');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`\n⏱️  Failed after: ${totalTime}ms`);
    console.error(`\n❌ Error: ${error.message}`);

    if (error.code) {
      console.error(`📍 Error code: ${error.code}`);
    }

    if (error.meta) {
      console.error('📍 Error details:', error.meta);
    }

    console.error('\n🔍 Stack trace:');
    console.error(error.stack);

    console.error('\n💡 Troubleshooting:');
    console.error('   - Check database connection');
    console.error('   - Verify NODE_ENV is set correctly');
    console.error('   - Ensure database is accessible');
    console.error('   - Check for constraint violations');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    throw error; // Re-throw to trigger process.exit(1)
  } finally {
    // ========================================
    // 4. Cleanup: Disconnect from database
    // ========================================
    await prisma.$disconnect();
  }
}

// Execute seed function
main().catch((error) => {
  console.error('Fatal error during seeding:', error);
  process.exit(1);
});
