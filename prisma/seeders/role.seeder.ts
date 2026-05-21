import { PrismaClient, UserType } from '@prisma/client';
import { getCurrentEnvironmentConfig } from '../config/environment.config';

/**
 * Role configuration with parentType and isDefault for hierarchical role system
 * - ADMIN type roles: admin (default for ADMIN users)
 * - USER type roles: staff (default for USER users), manager, user
 * - null parentType: guest (available for all user types)
 *
 * isDefault: When true, this role is automatically assigned to new users of that parentType
 * Note: Only one role per parentType can have isDefault=true (enforced by partial unique index)
 */
interface RoleConfig {
  parentType: UserType | null;
  isDefault: boolean;
}

const ROLE_CONFIG: Record<string, RoleConfig> = {
  admin: { parentType: 'ADMIN', isDefault: true },
  staff: { parentType: 'USER', isDefault: true },
  manager: { parentType: 'USER', isDefault: false },
  user: { parentType: 'USER', isDefault: false },
  guest: { parentType: null, isDefault: false },
};

/**
 * Role Seeder
 *
 * Creates default roles: admin, staff, user, guest
 * Uses upsert for idempotent operations
 * Assigns parentType for hierarchical role system (UserType ↔ Role)
 *
 * Environment-specific: Only creates roles allowed in the current environment
 */
export class RoleSeeder {
  static async seed(prisma: PrismaClient): Promise<void> {
    console.log('👥 Creating roles...');

    // Get environment-specific roles
    const envConfig = getCurrentEnvironmentConfig();
    const roles = envConfig.roles;

    if (roles.length === 0) {
      console.log('  ℹ️ Production environment - skipping role seeding\n');
      return;
    }

    console.log(`  📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  📊 Roles: ${roles.join(', ')}`);

    for (const roleName of roles) {
      const config = ROLE_CONFIG[roleName] ?? { parentType: null, isDefault: false };

      await prisma.role.upsert({
        where: {
          name: roleName,
        },
        create: {
          name: roleName,
          parentType: config.parentType,
          isDefault: config.isDefault,
        },
        update: {
          parentType: config.parentType,
          isDefault: config.isDefault,
        },
      });
      console.log(`  ✓ ${roleName} (parentType: ${config.parentType || 'null'}, isDefault: ${config.isDefault})`);
    }

    console.log(`✓ ${roles.length} roles created/updated\n`);
  }
}

// Standalone execution support
if (require.main === module) {
  const prisma = new PrismaClient();

  RoleSeeder.seed(prisma)
    .then(async () => {
      await prisma.$disconnect();
      console.log('✅ Role seeder completed successfully');
    })
    .catch(async (error) => {
      console.error('❌ Role seeder failed:', error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
