// Libraries
import { Prisma } from '@prisma/client';
import { faker } from '@faker-js/faker';
/**
 * RoleFactory
 *
 * Generates role data with English names
 * Type-safe with Prisma schema types
 */
export class RoleFactory {
  private static readonly ROLES = ['admin', 'staff', 'user', 'manager', 'guest'] as const;

  /**
   * Generate a single role
   */
  static generate(overrides: Partial<Prisma.RoleCreateInput> = {}): Prisma.RoleCreateInput {
    const defaults: Prisma.RoleCreateInput = {
      name: faker.helpers.arrayElement(this.ROLES),
    };

    // Merge with overrides
    return {
      ...defaults,
      ...overrides,
    };
  }
  //
  /**
   * Generate multiple roles
   */
  static generateMany(count: number, overrides: Partial<Prisma.RoleCreateInput> = {}): Prisma.RoleCreateInput[] {
    const roles: Prisma.RoleCreateInput[] = [];
    const usedNames = new Set<string>();

    for (let i = 0; i < count; i++) {
      let role: Prisma.RoleCreateInput;
      let attempts = 0;
      const maxAttempts = 50;

      // Ensure unique role names
      do {
        role = this.generate(overrides);
        attempts++;

        if (attempts > maxAttempts) {
          // Fallback: add suffix to make unique
          role.name = `${role.name} ${attempts}`;
          break;
        }
      } while (usedNames.has(role.name));

      usedNames.add(role.name);
      roles.push(role);
    }

    return roles;
  }
}
