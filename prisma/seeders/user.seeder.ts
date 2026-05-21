// Libraries
import { Prisma, PrismaClient, UserType } from '@prisma/client';
import { UserFactory } from '../factories/user.factory';
import { hashPassword } from '../../src/common/utils/hash.util';

// Configs
import { getCurrentEnvironmentConfig } from '../config/environment.config';

/**
 * Mapping from role name to UserType
 */
const ROLE_TO_USER_TYPE: Record<string, UserType> = {
  admin: 'ADMIN',
  staff: 'USER',
  manager: 'USER',
  user: 'USER',
  guest: 'USER',
};

const sanitizeFactoryUser = (input: Prisma.UserCreateInput): Prisma.UserUncheckedCreateInput => {
  if (!input.phoneNumber) {
    throw new Error('[UserSeeder] Factory user is missing phoneNumber');
  }

  return {
    email: input.email ?? null,
    firstName: input.firstName,
    lastName: input.lastName,
    phoneNumber: input.phoneNumber,
    phoneVerified: input.phoneVerified ?? false,
    isActive: input.isActive ?? true,
  };
};

/**
 * User Seeder
 *
 * Creates sample users with different roles
 * Uses upsert for idempotent operations
 *
 * Factory Pattern Integration:
 * - UserFactory.generate() - Creates a single user with Turkish test data
 * - UserFactory.generateMany(count) - Creates bulk users with unique data
 */
export class UserSeeder {
  static async seed(prisma: PrismaClient): Promise<void> {
    console.log('👤 Creating sample users...');

    // Get environment-specific configuration
    const envConfig = getCurrentEnvironmentConfig();
    const targetUserCount = envConfig.users;
    const allowedRoles = envConfig.roles;

    // Always ensure admin user exists
    const coreUsers: Array<{
      email: string;
      phoneNumber: string;
      password: string;
      firstName: string;
      lastName: string;
      role: string;
      phoneVerified: boolean;
      isActive: boolean;
    }> = [
      {
        email: 'admin@communityevents.local',
        phoneNumber: '+905551111111',
        password: 'Admin123!',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        phoneVerified: true,
        isActive: true,
      },
    ];

    const userIds: Record<string, string> = {};

    // Create core users first (admin, etc.)
    for (const user of coreUsers) {
      const passwordHash = await hashPassword(user.password);
      const userType = ROLE_TO_USER_TYPE[user.role] || 'USER';

      const existingUser = await prisma.user.findFirst({
        where: {
          phoneNumber: user.phoneNumber,
        },
      });

      const userRecord = existingUser
        ? await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              phoneVerified: user.phoneVerified,
              isActive: user.isActive,
              userType,
            },
          })
        : await prisma.user.create({
            data: {
              email: user.email,
              phoneNumber: user.phoneNumber,
              firstName: user.firstName,
              lastName: user.lastName,
              phoneVerified: user.phoneVerified,
              isActive: user.isActive,
              userType,
            },
          });

      // Create or update LOGIN provider with credentials
      await prisma.userProvider.upsert({
        where: {
          userID_provider: {
            userID: userRecord.id,
            provider: 'LOGIN',
          },
        },
        create: {
          userID: userRecord.id,
          provider: 'LOGIN',
          identifier: userRecord.phoneNumber,
          credentials: passwordHash,
          status: 1,
        },
        update: {
          credentials: passwordHash,
          identifier: userRecord.phoneNumber,
        },
      });

      // Store by phoneNumber (not email) for factory-generated users to reference
      userIds[user.phoneNumber] = userRecord.id;
      console.log(`  ✓ ${user.firstName} ${user.lastName} (${user.phoneNumber}) - ${user.role} [${userType}]`);

      // Get role ID and assign
      const roleRecord = await prisma.role.findUnique({
        where: {
          name: user.role,
        },
      });

      if (roleRecord) {
        await prisma.user.update({
          where: { id: userRecord.id },
          data: { roleID: roleRecord.id },
        });
      }
    }

    // Generate additional users using factory based on environment config
    const additionalUsersNeeded = targetUserCount - coreUsers.length;

    if (additionalUsersNeeded > 0) {
      console.log(`  📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  📊 Target: ${targetUserCount} users (${additionalUsersNeeded} additional from factory)`);

      // Generate additional users using factory (NOTE: role is NOT in factory data)
      const generatedUsers = UserFactory.generateMany(additionalUsersNeeded);
      const defaultPassword = 'User123!';
      const defaultPasswordHash = await hashPassword(defaultPassword);

      for (const [, userData] of generatedUsers.entries()) {
        // Find or create user with phoneNumber
        const existingUser = await prisma.user.findFirst({
          where: {
            phoneNumber: userData.phoneNumber,
          },
        });

        // Assign default 'staff' role to all factory-generated users (determines userType)
        const defaultRoleName = allowedRoles.includes('staff') ? 'staff' : allowedRoles[0];
        const userType = ROLE_TO_USER_TYPE[defaultRoleName] || 'USER';

        const userRecord = existingUser
          ? await prisma.user.update({
              where: { id: existingUser.id },
              data: { userType },
            })
          : await prisma.user.create({
              data: {
                ...sanitizeFactoryUser(userData),
                userType,
              },
            });

        // Create or update LOGIN provider with credentials
        await prisma.userProvider.upsert({
          where: {
            userID_provider: {
              userID: userRecord.id,
              provider: 'LOGIN',
            },
          },
          create: {
            userID: userRecord.id,
            provider: 'LOGIN',
            identifier: userRecord.phoneNumber,
            credentials: defaultPasswordHash,
            status: 1,
          },
          update: {
            credentials: defaultPasswordHash,
            identifier: userRecord.phoneNumber,
          },
        });

        // Store by phoneNumber for consistency
        userIds[userRecord.phoneNumber] = userRecord.id;

        const roleRecord = await prisma.role.findUnique({
          where: {
            name: defaultRoleName,
          },
        });

        if (roleRecord) {
          await prisma.user.update({
            where: { id: userRecord.id },
            data: { roleID: roleRecord.id },
          });
        }

        console.log(
          `  ✓ ${userRecord.firstName} ${userRecord.lastName} (${userRecord.email}) - ${defaultRoleName} [${userType}]`,
        );
      }
    }

    console.log(`✓ ${targetUserCount} users created/updated with roles\n`);
  }
}

// Standalone execution support
if (require.main === module) {
  const prisma = new PrismaClient();

  UserSeeder.seed(prisma)
    .then(async () => {
      await prisma.$disconnect();
      console.log('✅ User seeder completed successfully');
    })
    .catch(async (error) => {
      console.error('❌ User seeder failed:', error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
