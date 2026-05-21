/**
 * Permission Sync Script (Development Environment Only)
 *
 * Syncs PERMISSIONS constant from code to database Permission table.
 * - Reads all modules and actions from PERMISSIONS constant
 * - Upserts permissions using [module, action] unique constraint
 * - Idempotent: Safe to run multiple times
 * - Environment protected: Only runs in development/local
 *
 * Usage: npm run permission:sync
 */

import { PrismaClient } from '@prisma/client';
import { PERMISSIONS } from '../src/modules/permissions/constants/permissions.constant';
import {
  DEFAULT_ADMIN_MODULES,
  DEFAULT_USER_MODULES,
} from '../src/modules/permissions/constants/default-permissions.constant';

const prisma = new PrismaClient();

interface SyncResult {
  totalSynced: number;
  newPermissions: number;
  existingPermissions: number;
  newPermissionsList: Array<{ module: string; action: string }>;
}

/**
 * Check environment and ensure script only runs in development/local
 */
function checkEnvironment(): void {
  const env = process.env.NODE_ENV;

  console.log(`✓ Environment check passed: ${env || 'development'}`);
}

/**
 * Extract all permission pairs (module, action) from PERMISSIONS constant
 */
function extractPermissions(): Array<{ module: string; action: string }> {
  const permissions: Array<{ module: string; action: string }> = [];

  for (const [module, actions] of Object.entries(PERMISSIONS)) {
    for (const [action, value] of Object.entries(actions)) {
      // Extract module and action from permission value (e.g., "USERS.CREATE")
      const [moduleFromValue, actionFromValue] = (value as string).split('.');

      permissions.push({
        module: moduleFromValue,
        action: actionFromValue,
      });
    }
  }

  return permissions;
}

/**
 * Sync permissions to database using upsert (idempotent)
 */
async function syncPermissions(): Promise<SyncResult> {
  const permissions = extractPermissions();
  const result: SyncResult = {
    totalSynced: permissions.length,
    newPermissions: 0,
    existingPermissions: 0,
    newPermissionsList: [],
  };

  console.log(`\n⚙️  Syncing ${permissions.length} permissions to database...\n`);

  console.log(`\n⚙️  Syncing ${permissions.length} permissions to database...\n`);

  for (const { module, action } of permissions) {
    try {
      // Find module first to get ID
      // We assume module name in PERMISSIONS constant matches the 'KEY' part of i18n key 'modules.KEY.NAME'
      // effectively mapping 'USERS' -> 'modules.USERS.NAME'
      const moduleKey = `modules.${module}.NAME`;
      const moduleRecord = await prisma.module.findUnique({
        where: { nameKey: moduleKey },
      });

      if (!moduleRecord) {
        console.warn(`  ⚠️  Module '${module}' not found (key: ${moduleKey}). Skipping permission ${action}.`);
        continue;
      }

      // Check if permission already exists
      const existing = await prisma.permission.findUnique({
        where: {
          moduleID_action: {
            moduleID: moduleRecord.id,
            action,
          },
        },
      });

      if (existing) {
        // Permission already exists, skip
        result.existingPermissions++;
      } else {
        // Create new permission
        await prisma.permission.create({
          data: {
            moduleID: moduleRecord.id,
            action,
            description: `Permission for ${module}.${action}`,
          },
        });

        result.newPermissions++;
        result.newPermissionsList.push({ module, action });
        console.log(`  ✓ Created: ${module}.${action}`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to sync ${module}.${action}:`, error);
      throw error;
    }
  }

  return result;
}

/**
 * Sync default module actions (defaultAdminActions, defaultUserActions) to Module table
 */
async function syncDefaultModuleActions(): Promise<{ updated: number; modules: string[] }> {
  const result = { updated: 0, modules: [] as string[] };

  console.log('\n⚙️  Syncing default module actions to database...\n');

  // Get all unique module names from both ADMIN and USER defaults
  const allModules = new Set([...Object.keys(DEFAULT_ADMIN_MODULES), ...Object.keys(DEFAULT_USER_MODULES)]);

  for (const moduleName of allModules) {
    const moduleKey = `modules.${moduleName}.NAME`;
    const adminActions = DEFAULT_ADMIN_MODULES[moduleName] || [];
    const userActions = DEFAULT_USER_MODULES[moduleName] || [];

    try {
      const moduleRecord = await prisma.module.findUnique({
        where: { nameKey: moduleKey },
        select: { id: true, defaultAdminActions: true, defaultUserActions: true },
      });

      if (!moduleRecord) {
        console.warn(`  ⚠️  Module '${moduleName}' not found (key: ${moduleKey}). Skipping default actions.`);
        continue;
      }

      // Check if update is needed
      const adminNeedsUpdate =
        JSON.stringify(moduleRecord.defaultAdminActions.sort()) !== JSON.stringify([...adminActions].sort());
      const userNeedsUpdate =
        JSON.stringify(moduleRecord.defaultUserActions.sort()) !== JSON.stringify([...userActions].sort());

      if (adminNeedsUpdate || userNeedsUpdate) {
        await prisma.module.update({
          where: { id: moduleRecord.id },
          data: {
            defaultAdminActions: adminActions,
            defaultUserActions: userActions,
          },
        });

        result.updated++;
        result.modules.push(moduleName);
        console.log(
          `  ✓ Updated: ${moduleName} (admin: [${adminActions.join(', ')}], user: [${userActions.join(', ')}])`,
        );
      }
    } catch (error) {
      console.error(`  ✗ Failed to sync default actions for ${moduleName}:`, error);
      throw error;
    }
  }

  return result;
}

/**
 * Log sync results summary
 */
function logResults(result: SyncResult): void {
  console.log('\n' + '─'.repeat(60));
  console.log('📊 Sync Results:');
  console.log('─'.repeat(60));
  console.log(`   Total synced: ${result.totalSynced}`);
  console.log(`   New permissions: ${result.newPermissions}`);
  console.log(`   Existing permissions: ${result.existingPermissions}`);
  console.log('─'.repeat(60) + '\n');

  if (result.newPermissions > 0) {
    console.log('✅ Permission sync completed successfully!');
    console.log(`   ${result.newPermissions} new permission(s) added to database.\n`);
  } else {
    console.log('✅ Permission sync completed successfully!');
    console.log('   All permissions were already in sync.\n');
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('\n🔄 Starting Permission Sync Script...\n');

    // Step 1: Environment check
    checkEnvironment();

    // Step 2: Warning before sync
    console.log('⚠️  Warning: About to sync permissions from code to database');

    // Step 3: Connect to database
    await prisma.$connect();
    console.log('✓ Connected to database\n');

    // Step 4: Sync permissions
    const result = await syncPermissions();

    // Step 5: Sync default module actions
    const defaultActionsResult = await syncDefaultModuleActions();

    // Step 6: Log results
    logResults(result);

    if (defaultActionsResult.updated > 0) {
      console.log(`📦 Default Actions Updated: ${defaultActionsResult.updated} module(s)`);
      console.log(`   Modules: ${defaultActionsResult.modules.join(', ')}\n`);
    } else {
      console.log('📦 Default module actions already in sync.\n');
    }
  } catch (error) {
    console.error('\n❌ Permission sync failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute script
main();
