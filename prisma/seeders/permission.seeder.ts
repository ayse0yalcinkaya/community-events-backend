// Libraries
import { PrismaClient } from '@prisma/client';
import { PermissionFactory } from '../factories/permission.factory';

// Configs
import { getCurrentEnvironmentConfig } from '../config/environment.config';
/**
 * Permission Seeder
 *
 * Creates comprehensive permissions for ALL modules in the system:
 * - USERS: User management (CREATE, VIEW, UPDATE, DELETE, ACTIVATE)
 * - ROLES: Role management (CREATE, VIEW, UPDATE, DELETE, ASSIGN)
 * - PERMISSIONS: Permission management (VIEW, CREATE, ASSIGN, REVOKE)
 * - FILES: File management (CREATE, VIEW, UPDATE, DELETE, VIEW_ALL)
 * - NOTIFICATIONS: Notification management (VIEW, MARK_READ, DELETE, SEND)
 * - NOTIFICATION_PREFERENCES: Preference management (VIEW, UPDATE, MANAGE)
 * - OTP_VERIFICATIONS: OTP management (VIEW, CREATE, VERIFY)
 * - DEVICE_TOKENS: Device token management (VIEW, REGISTER, DELETE)
 * - REFRESH_TOKENS: Token management (VIEW, CREATE, REVOKE)
 * - SMS: SMS management (VIEW, SEND, RESEND, VIEW_ALL)
 * - DOMAINS: Domain management (VIEW, CREATE, UPDATE, DELETE, MANAGE)
 *
 * Total: 11 modules with 39 individual permissions
 *
 * Uses upsert for idempotent operations
 * Factory Pattern Integration available
 * Environment-specific: Only assigns permissions to roles that exist in current environment
 */
export class PermissionSeeder {
  static async seed(prisma: PrismaClient): Promise<void> {
    console.log('🔐 Creating permissions...');

    // Get environment-specific roles
    const envConfig = getCurrentEnvironmentConfig();
    const allowedRoles = envConfig.roles;

    if (allowedRoles.length === 0) {
      console.log('  ℹ️ Production environment - skipping permission seeding\n');
      return;
    }

    // Fetch all modules to link permissions
    const modules = await prisma.module.findMany();
    const moduleMap = new Map<string, string>(); // Module Name (e.g., USERS) -> Module ID

    for (const module of modules) {
      // Extract key from nameKey: modules.USERS.NAME -> USERS
      const keyMatches = module.nameKey.match(/modules\.(.+)\.NAME/);
      if (keyMatches && keyMatches[1]) {
        moduleMap.set(keyMatches[1], module.id);
      }
    }

    const allPermissions = [
      // USERS module (5 permissions)
      { module: 'USERS', action: 'CREATE', description: 'Create new users' },
      { module: 'USERS', action: 'VIEW', description: 'View user information' },
      { module: 'USERS', action: 'UPDATE', description: 'Update user information' },
      { module: 'USERS', action: 'DELETE', description: 'Delete users' },
      { module: 'USERS', action: 'ASSIGN', description: 'Assign roles to users' },
      // ROLES module (5 permissions)
      { module: 'ROLES', action: 'CREATE', description: 'Create new roles' },
      { module: 'ROLES', action: 'VIEW', description: 'View role information' },
      { module: 'ROLES', action: 'UPDATE', description: 'Update role information' },
      { module: 'ROLES', action: 'DELETE', description: 'Delete roles' },
      { module: 'ROLES', action: 'ASSIGN', description: 'Assign roles to users' },
      // PERMISSIONS module (4 permissions)
      { module: 'PERMISSIONS', action: 'VIEW', description: 'View permissions' },
      { module: 'PERMISSIONS', action: 'CREATE', description: 'Create new permissions' },
      { module: 'PERMISSIONS', action: 'ASSIGN', description: 'Assign permissions to users' },
      { module: 'PERMISSIONS', action: 'REVOKE', description: 'Revoke permissions from users' },
      { module: 'PERMISSIONS', action: 'DELETE', description: 'Delete permissions' },
      { module: 'PERMISSIONS', action: 'UPDATE', description: 'Update permissions' },
      // FILES module (5 permissions)
      { module: 'FILES', action: 'CREATE', description: 'Upload new files' },
      { module: 'FILES', action: 'VIEW', description: 'View own files' },
      { module: 'FILES', action: 'UPDATE', description: 'Update file metadata' },
      { module: 'FILES', action: 'DELETE', description: 'Delete own files' },
      { module: 'FILES', action: 'VIEW_ALL', description: 'View all users files' },
      // NOTIFICATIONS module (4 permissions)
      { module: 'NOTIFICATIONS', action: 'VIEW', description: 'View own notifications' },
      { module: 'NOTIFICATIONS', action: 'MARK_READ', description: 'Mark notifications as read' },
      { module: 'NOTIFICATIONS', action: 'DELETE', description: 'Delete notifications' },
      { module: 'NOTIFICATIONS', action: 'SEND', description: 'Send notifications to users' },
      // NOTIFICATION_PREFERENCES module (3 permissions)
      { module: 'NOTIFICATION_PREFERENCES', action: 'VIEW', description: 'View notification preferences' },
      { module: 'NOTIFICATION_PREFERENCES', action: 'UPDATE', description: 'Update notification preferences' },
      {
        module: 'NOTIFICATION_PREFERENCES',
        action: 'MANAGE',
        description: 'Manage notification preferences for all users',
      },
      // OTP_VERIFICATIONS module (3 permissions)
      { module: 'OTP_VERIFICATIONS', action: 'VIEW', description: 'View OTP verification records' },
      { module: 'OTP_VERIFICATIONS', action: 'CREATE', description: 'Create OTP verifications' },
      { module: 'OTP_VERIFICATIONS', action: 'VERIFY', description: 'Verify OTP codes' },
      // DEVICE_TOKENS module (3 permissions)
      { module: 'DEVICE_TOKENS', action: 'VIEW', description: 'View device tokens' },
      { module: 'DEVICE_TOKENS', action: 'REGISTER', description: 'Register new device tokens' },
      { module: 'DEVICE_TOKENS', action: 'DELETE', description: 'Delete device tokens' },
      // REFRESH_TOKENS module (3 permissions)
      { module: 'REFRESH_TOKENS', action: 'VIEW', description: 'View refresh tokens' },
      { module: 'REFRESH_TOKENS', action: 'CREATE', description: 'Create refresh tokens' },
      { module: 'REFRESH_TOKENS', action: 'REVOKE', description: 'Revoke refresh tokens' },
      // SMS module (4 permissions)
      { module: 'SMS', action: 'VIEW', description: 'View SMS logs' },
      { module: 'SMS', action: 'SEND', description: 'Send SMS messages' },
      { module: 'SMS', action: 'RESEND', description: 'Resend SMS messages' },
      { module: 'SMS', action: 'VIEW_ALL', description: 'View all SMS messages across domains' },
      // DOMAINS module (5 permissions)
      { module: 'DOMAINS', action: 'VIEW', description: 'View domain information' },
      { module: 'DOMAINS', action: 'CREATE', description: 'Create new domains' },
      { module: 'DOMAINS', action: 'UPDATE', description: 'Update domain information' },
      { module: 'DOMAINS', action: 'DELETE', description: 'Delete domains' },
      { module: 'DOMAINS', action: 'MANAGE', description: 'Manage domain settings and configuration' },
      // DEPARTMENTS module (4 permissions)
      { module: 'DEPARTMENTS', action: 'VIEW', description: 'View department information' },
      { module: 'DEPARTMENTS', action: 'CREATE', description: 'Create new departments' },
      { module: 'DEPARTMENTS', action: 'UPDATE', description: 'Update department information' },
      { module: 'DEPARTMENTS', action: 'DELETE', description: 'Delete departments' },
      // ANNOUNCEMENTS module (4 permissions)
      { module: 'ANNOUNCEMENTS', action: 'CREATE', description: 'Create announcements' },
      { module: 'ANNOUNCEMENTS', action: 'VIEW', description: 'View announcements' },
      { module: 'ANNOUNCEMENTS', action: 'UPDATE', description: 'Update announcements' },
      { module: 'ANNOUNCEMENTS', action: 'DELETE', description: 'Delete announcements' },
      // CATEGORIES module (4 permissions)
      { module: 'CATEGORIES', action: 'CREATE', description: 'Create categories' },
      { module: 'CATEGORIES', action: 'VIEW', description: 'View categories' },
      { module: 'CATEGORIES', action: 'UPDATE', description: 'Update categories' },
      { module: 'CATEGORIES', action: 'DELETE', description: 'Delete categories' },
      // SLAS module (4 permissions)
      { module: 'SLAS', action: 'CREATE', description: 'Create SLAs' },
      { module: 'SLAS', action: 'VIEW', description: 'View SLAs' },
      { module: 'SLAS', action: 'UPDATE', description: 'Update SLAs' },
      { module: 'SLAS', action: 'DELETE', description: 'Delete SLAs' },
      // SOLUTION_PROCESSES module (4 permissions)
      { module: 'SOLUTION_PROCESSES', action: 'CREATE', description: 'Create solution processes' },
      { module: 'SOLUTION_PROCESSES', action: 'VIEW', description: 'View solution processes' },
      { module: 'SOLUTION_PROCESSES', action: 'UPDATE', description: 'Update solution processes' },
      { module: 'SOLUTION_PROCESSES', action: 'DELETE', description: 'Delete solution processes' },
      // FAST_MESSAGES module (4 permissions)
      { module: 'FAST_MESSAGES', action: 'CREATE', description: 'Create fast messages' },
      { module: 'FAST_MESSAGES', action: 'VIEW', description: 'View fast messages' },
      { module: 'FAST_MESSAGES', action: 'UPDATE', description: 'Update fast messages' },
      { module: 'FAST_MESSAGES', action: 'DELETE', description: 'Delete fast messages' },
      // AUTOMATIONS module (4 permissions)
      { module: 'AUTOMATIONS', action: 'CREATE', description: 'Create automations' },
      { module: 'AUTOMATIONS', action: 'VIEW', description: 'View automations' },
      { module: 'AUTOMATIONS', action: 'UPDATE', description: 'Update automations' },
      { module: 'AUTOMATIONS', action: 'DELETE', description: 'Delete automations' },
      // TICKETS module (4 permissions)
      { module: 'TICKETS', action: 'CREATE', description: 'Create support tickets' },
      { module: 'TICKETS', action: 'VIEW', description: 'View support tickets' },
      { module: 'TICKETS', action: 'VIEW_ALL', description: 'View all support tickets' },
      {
        module: 'TICKETS',
        action: 'VIEW_DEPARTMENT',
        description: 'View support tickets for own department',
      },
      { module: 'TICKETS', action: 'UPDATE', description: 'Update support tickets' },
      { module: 'TICKETS', action: 'DELETE', description: 'Delete support tickets' },
      // TICKET_ASSIGNEDS module (1 permission)
      { module: 'TICKET_ASSIGNEDS', action: 'VIEW', description: 'View ticket assignment history' },
      { module: 'TICKETS', action: 'APPROVE', description: 'Approve support tickets' },
      // SSS module (4 permissions)
      { module: 'SSS', action: 'CREATE', description: 'Create FAQ entries' },
      { module: 'SSS', action: 'VIEW', description: 'View FAQ entries' },
      { module: 'SSS', action: 'UPDATE', description: 'Update FAQ entries' },
      { module: 'SSS', action: 'DELETE', description: 'Delete FAQ entries' },
      // SURVEYS module (5 permissions)
      { module: 'SURVEYS', action: 'CREATE', description: 'Create surveys' },
      { module: 'SURVEYS', action: 'VIEW', description: 'View surveys' },
      { module: 'SURVEYS', action: 'UPDATE', description: 'Update surveys' },
      { module: 'SURVEYS', action: 'DELETE', description: 'Delete surveys' },
      { module: 'SURVEYS', action: 'RESPOND', description: 'Submit survey responses' },
      // CHAT module (4 permissions)
      { module: 'CHAT', action: 'CREATE', description: 'Create chat' },
      { module: 'CHAT', action: 'VIEW', description: 'View chat' },
      { module: 'CHAT', action: 'UPDATE', description: 'Update chat' },
      { module: 'CHAT', action: 'DELETE', description: 'Delete chat' },
      // LOGS module (1 permission)
      { module: 'LOGS', action: 'VIEW', description: 'View audit logs' },
      // DASHBOARD module (1 permission)
      { module: 'DASHBOARD', action: 'VIEW', description: 'View dashboard metrics and statistics' },
      // REPORTS module (2 permissions)
      { module: 'REPORTS', action: 'VIEW', description: 'View report metrics and ticket lists' },
      { module: 'REPORTS', action: 'EXPORT', description: 'Export reports as PDF/Excel' },
    ];

    let permissionCount = 0;
    for (const perm of allPermissions) {
      const moduleID = moduleMap.get(perm.module);
      if (!moduleID) {
        console.warn(`  ⚠ Module '${perm.module}' not found in DB, skipping permission ${perm.action}`);
        continue;
      }

      await prisma.permission.upsert({
        where: {
          moduleID_action: {
            moduleID: moduleID,
            action: perm.action,
          },
        },
        create: {
          moduleID: moduleID,
          action: perm.action,
          description: perm.description,
        },
        update: {},
      });
      console.log(`  ✓ ${perm.module}.${perm.action}`);
      permissionCount++;
    }

    console.log(`✓ ${permissionCount} permissions created/updated\n`);

    // Fetch ALL permissions from the database to ensure Admin gets everything (including those synced from scripts)
    // This covers permissions that might be in the DB but not in the hardcoded list above
    const allDbPermissions = await prisma.permission.findMany();

    // Assign permissions to roles using $transaction
    console.log('🔑 Assigning permissions to roles...');
    console.log(`  📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  📊 Allowed roles: ${allowedRoles.join(', ')}\n`);

    const rolePermissionAssignments = [
      // Admin gets ALL permissions (from DB)
      { roleName: 'admin', permissions: allDbPermissions },
      // Staff gets comprehensive permissions for daily operations
      {
        roleName: 'staff',
        permissions: allPermissions.filter((p) => {
          // Staff can see department-level tickets but not all tickets
          if (p.module === 'TICKETS') {
            return ['CREATE', 'VIEW', 'UPDATE', 'DELETE', 'VIEW_DEPARTMENT'].includes(p.action);
          }
          // Staff can manage users, files, notifications, OTPs, SMS, and departments
          if (
            [
              'USERS',
              'ROLES',
              'FILES',
              'NOTIFICATIONS',
              'CHAT',
              'OTP_VERIFICATIONS',
              'SMS',
              'DEPARTMENTS',
              'CATEGORIES',
              'SLAS',
              'SOLUTION_PROCESSES',
              'FAST_MESSAGES',
              'AUTOMATIONS',
              'TICKET_ASSIGNEDS',
              'SSS',
              'SURVEYS',
              'REPORTS',
            ].includes(p.module)
          ) {
            return true;
          }
          // Staff can view announcements
          if (p.module === 'ANNOUNCEMENTS' && p.action === 'VIEW') {
            return true;
          }
          // Staff can view domains and device tokens
          if (['DOMAINS', 'DEVICE_TOKENS'].includes(p.module) && ['VIEW'].includes(p.action)) {
            return true;
          }
          // Staff can manage their own notification preferences
          if (p.module === 'NOTIFICATION_PREFERENCES' && ['VIEW', 'UPDATE'].includes(p.action)) {
            return true;
          }
          // Staff can view refresh tokens (for session management)
          if (p.module === 'REFRESH_TOKENS' && p.action === 'VIEW') {
            return true;
          }
          return false;
        }),
      },
      // User gets permissions for self-service operations
      {
        roleName: 'user',
        permissions: allPermissions.filter((p) => {
          // Users can view their own profile
          if (p.module === 'USERS' && ['VIEW', 'UPDATE'].includes(p.action)) {
            return true;
          }
          // Users can create and view their own tickets
          if (p.module === 'TICKETS' && ['VIEW', 'CREATE'].includes(p.action)) {
            return true;
          }
          // Users can view and respond to surveys
          if (p.module === 'SURVEYS' && ['VIEW', 'RESPOND'].includes(p.action)) {
            return true;
          }
          // Users can view announcements
          if (p.module === 'ANNOUNCEMENTS' && p.action === 'VIEW') {
            return true;
          }
          // Users can view knowledge base (SSS)
          if (p.module === 'SSS' && p.action === 'VIEW') {
            return true;
          }
          // Users can view dashboard
          if (p.module === 'DASHBOARD' && p.action === 'VIEW') {
            return true;
          }
          // Users can upload and view their own files
          if (p.module === 'FILES' && ['VIEW', 'CREATE'].includes(p.action)) {
            return true;
          }
          // Users can manage their own notifications
          if (p.module === 'NOTIFICATIONS' && ['VIEW', 'MARK_READ'].includes(p.action)) {
            return true;
          }
          // Users can manage their own notification preferences
          if (p.module === 'NOTIFICATION_PREFERENCES' && ['VIEW', 'UPDATE'].includes(p.action)) {
            return true;
          }
          // Users can manage their own device tokens
          if (p.module === 'DEVICE_TOKENS' && ['VIEW', 'REGISTER', 'DELETE'].includes(p.action)) {
            return true;
          }
          return false;
        }),
      },
      // Guest gets minimal read-only permissions
      {
        roleName: 'guest',
        permissions: allPermissions.filter((p) => {
          // Guests can only view their own basic info
          if (p.module === 'USERS' && p.action === 'VIEW') {
            return true;
          }
          return false;
        }),
      },
    ];

    let assignmentCount = 0;
    for (const assignment of rolePermissionAssignments) {
      // Skip if role not allowed in current environment
      if (!allowedRoles.includes(assignment.roleName)) {
        console.log(`  ⏭ ${assignment.roleName} - role not allowed in current environment, skipping`);
        continue;
      }

      // Get role
      const role = await prisma.role.findUnique({
        where: {
          name: assignment.roleName,
        },
      });

      if (!role) {
        console.log(`  ⚠ Role '${assignment.roleName}' not found, skipping permissions assignment`);
        continue;
      }

      // Assign each permission to the role
      for (const perm of assignment.permissions) {
        // Resolve moduleID for this permission (if it's not already a DB permission object)
        // Note: For 'admin', we passed allDbPermissions which already have id.
        // For others, we passed filtered objects from allPermissions array which don't have IDs or moduleIDs.

        // Check if perm has 'id' (it's a DB permission object from admin list)
        if ('id' in perm) {
          await prisma.rolePermission.upsert({
            where: {
              roleID_permissionID: {
                roleID: role.id,
                permissionID: (perm as any).id,
              },
            },
            create: {
              roleID: role.id,
              permissionID: (perm as any).id,
            },
            update: {},
          });
          assignmentCount++;
          continue;
        }

        // It's a definition object, need to find DB record
        const moduleID = moduleMap.get((perm as any).module);
        if (!moduleID) continue;

        const permission = await prisma.permission.findUnique({
          where: {
            moduleID_action: {
              moduleID: moduleID,
              action: perm.action,
            },
          },
        });

        if (permission) {
          await prisma.rolePermission.upsert({
            where: {
              roleID_permissionID: {
                roleID: role.id,
                permissionID: permission.id,
              },
            },
            create: {
              roleID: role.id,
              permissionID: permission.id,
            },
            update: {},
          });
          assignmentCount++;
        }
      }
      console.log(`  ✓ ${assignment.roleName} - ${assignment.permissions.length} permissions assigned`);
    }

    console.log(`✓ ${assignmentCount} role-permission assignments created/updated\n`);
  }
}

// Standalone execution support
if (require.main === module) {
  const prisma = new PrismaClient();

  PermissionSeeder.seed(prisma)
    .then(async () => {
      await prisma.$disconnect();
      console.log('✅ Permission seeder completed successfully');
    })
    .catch(async (error) => {
      console.error('❌ Permission seeder failed:', error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
