/**
 * Default Permission Migration Script (Development Environment Only)
 *
 * Populates defaultAdminActions and defaultUserActions fields for existing modules.
 * - Reads configuration from DEFAULT_ADMIN_MODULES and DEFAULT_USER_MODULES
 * - Updates modules with default permission arrays
 * - Idempotent: Safe to run multiple times (overwrites existing values)
 * - Environment protected: Only runs in development/local
 *
 * Usage: npx ts-node scripts/migrate-default-permissions.ts
 */

import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_ADMIN_MODULES,
  DEFAULT_USER_MODULES,
} from '../src/modules/permissions/constants/default-permissions.constant';

const prisma = new PrismaClient();

interface MigrationResult {
  adminUpdated: number;
  userUpdated: number;
  notFound: string[];
}

/**
 * Check environment and ensure script only runs in development/local
 */
function checkEnvironment(): void {
  const env = process.env.NODE_ENV;

  if (env === 'production' || env === 'staging') {
    console.error('❌ ERROR: Default permission migration cannot run in production or staging environments!');
    console.error(`   Current NODE_ENV: ${env}`);
    console.error('   This script is for development use only.');
    process.exit(1);
  }

  console.log(`✓ Environment check passed: ${env || 'development'}`);
}

/**
 * Update module with default admin actions
 */
async function updateAdminDefaults(): Promise<{ updated: number; notFound: string[] }> {
  let updated = 0;
  const notFound: string[] = [];

  console.log('\n📋 Updating ADMIN default permissions...\n');

  for (const [moduleName, actions] of Object.entries(DEFAULT_ADMIN_MODULES)) {
    const moduleKey = `modules.${moduleName}.NAME`;

    try {
      const result = await prisma.module.updateMany({
        where: { nameKey: moduleKey },
        data: { defaultAdminActions: actions },
      });

      if (result.count > 0) {
        console.log(`  ✓ [ADMIN] ${moduleName}: ${actions.join(', ')}`);
        updated++;
      } else {
        console.warn(`  ⚠️  Module not found: ${moduleName}`);
        notFound.push(moduleName);
      }
    } catch (error) {
      console.error(`  ✗ Failed to update ${moduleName}:`, error);
      throw error;
    }
  }

  return { updated, notFound };
}

/**
 * Update module with default user actions
 */
async function updateUserDefaults(): Promise<{ updated: number; notFound: string[] }> {
  let updated = 0;
  const notFound: string[] = [];

  console.log('\n📋 Updating USER default permissions...\n');

  for (const [moduleName, actions] of Object.entries(DEFAULT_USER_MODULES)) {
    const moduleKey = `modules.${moduleName}.NAME`;

    try {
      const result = await prisma.module.updateMany({
        where: { nameKey: moduleKey },
        data: { defaultUserActions: actions },
      });

      if (result.count > 0) {
        console.log(`  ✓ [USER] ${moduleName}: ${actions.join(', ')}`);
        updated++;
      } else {
        // Only warn if not already warned in admin update
        if (!Object.keys(DEFAULT_ADMIN_MODULES).includes(moduleName)) {
          console.warn(`  ⚠️  Module not found: ${moduleName}`);
          notFound.push(moduleName);
        }
      }
    } catch (error) {
      console.error(`  ✗ Failed to update ${moduleName}:`, error);
      throw error;
    }
  }

  return { updated, notFound };
}

/**
 * Log migration results summary
 */
function logResults(result: MigrationResult): void {
  console.log('\n' + '─'.repeat(60));
  console.log('📊 Migration Results:');
  console.log('─'.repeat(60));
  console.log(`   Admin defaults updated: ${result.adminUpdated} modules`);
  console.log(`   User defaults updated: ${result.userUpdated} modules`);

  if (result.notFound.length > 0) {
    console.log(`   Not found: ${result.notFound.join(', ')}`);
  }

  console.log('─'.repeat(60) + '\n');
  console.log('✅ Default permission migration completed successfully!\n');
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('\n🔄 Starting Default Permission Migration Script...\n');

    // Step 1: Environment check
    checkEnvironment();

    // Step 2: Connect to database
    await prisma.$connect();
    console.log('✓ Connected to database');

    // Step 3: Update admin defaults
    const adminResult = await updateAdminDefaults();

    // Step 4: Update user defaults
    const userResult = await updateUserDefaults();

    // Step 5: Log results
    logResults({
      adminUpdated: adminResult.updated,
      userUpdated: userResult.updated,
      notFound: [...new Set([...adminResult.notFound, ...userResult.notFound])],
    });
  } catch (error) {
    console.error('\n❌ Default permission migration failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute script
main();
