// Libraries
import { Prisma } from '@prisma/client';
import { faker } from '@faker-js/faker';
/**
 * PermissionFactory
 *
 * Generates permission data with action-based permissions
 * Type-safe with Prisma schema types
 */
export class PermissionFactory {
  private static readonly MODULES = [
    'user',
    'role',
    'permission',
    'file',
    'notification',
    'sms',
    'auth',
    'profile',
  ] as const;

  private static readonly ACTIONS = ['create', 'read', 'update', 'delete', 'manage'] as const;

  /**
   * Generate a single permission
   */
  static generate(overrides: Partial<Prisma.PermissionCreateInput> = {}): Prisma.PermissionCreateInput {
    const moduleName = faker.helpers.arrayElement(this.MODULES);
    const action = faker.helpers.arrayElement(this.ACTIONS);

    // Generate description
    const description = `${moduleName}:${action} action`;

    const defaults: Prisma.PermissionCreateInput = {
      // In factory, we assume module exists or is created by wrapper
      // This is tricky because we need a valid moduleID.
      // For simple factory usage, we might need to connect to an existing known module or create one.
      // However, factory.generate returns inputs, not executes DB calls.
      // So we must provide a connector.
      module: {
        connectOrCreate: {
          where: { nameKey: `modules.${moduleName.toUpperCase()}.NAME` },
          create: {
            nameKey: `modules.${moduleName.toUpperCase()}.NAME`,
            descriptionKey: `modules.${moduleName.toUpperCase()}.DESCRIPTION`,
          },
        },
      },
      action,
      description,
    };

    // Merge with overrides
    return {
      ...defaults,
      ...overrides,
    };
  }

  /**
   * Generate multiple permissions
   */
  static generateMany(
    count: number,
    overrides: Partial<Prisma.PermissionCreateInput> = {},
  ): Prisma.PermissionCreateInput[] {
    const permissions: Prisma.PermissionCreateInput[] = [];
    const usedCombinations = new Set<string>();

    for (let i = 0; i < count; i++) {
      let permission: Prisma.PermissionCreateInput = {} as Prisma.PermissionCreateInput;
      let attempts = 0;
      const maxAttempts = 50;

      // Ensure unique module-action combinations
      let isUnique = false;
      while (!isUnique) {
        permission = this.generate(overrides);

        // Extract module name
        const moduleInput = permission.module as Prisma.ModuleCreateNestedOneWithoutPermissionsInput;
        let moduleName = 'unknown';
        if (moduleInput?.connectOrCreate?.where?.nameKey) {
          moduleName = moduleInput.connectOrCreate.where.nameKey;
        } else if (moduleInput?.connect?.id) {
          moduleName = moduleInput.connect.id;
        }

        const key = `${moduleName}:${permission.action}`;

        if (!usedCombinations.has(key)) {
          usedCombinations.add(key);
          isUnique = true;
          break;
        }

        attempts++;
        if (attempts > maxAttempts) {
          // Fallback: add suffix to action
          permission.action = `${permission.action}_${attempts}`;
          usedCombinations.add(`${moduleName}:${permission.action}`);
          isUnique = true;
          break;
        }
      }

      permissions.push(permission);
    }

    return permissions;
  }
}
