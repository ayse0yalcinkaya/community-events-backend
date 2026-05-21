// Libraries
import { Prisma } from '@prisma/client';
const FIRST_NAMES = ['Ahmet', 'Mehmet', 'Ayşe', 'Fatma', 'Can', 'Elif', 'Deniz', 'Ece', 'Burak', 'Selin'] as const;

const LAST_NAMES = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Koç', 'Arslan', 'Öztürk', 'Tekin', 'Aydın'] as const;

const sanitizeForEmail = (value: string) =>
  value
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
/**
 * UserFactory
 *
 * Generates realistic Turkish user test data using Faker.js
 * Type-safe with Prisma schema types
 */
export class UserFactory {
  private static sequence = 0;

  private static nextSequence() {
    this.sequence += 1;
    return this.sequence;
  }

  private static pickRandom<T>(items: readonly T[], seed: number) {
    const index = seed % items.length;
    return items[index];
  }

  private static generatePhoneNumber(seed: number) {
    const area = (50 + (seed % 10)).toString().padStart(2, '0');
    const firstPart = (100 + (seed % 900)).toString();
    const secondPart = (10 + (seed % 90)).toString().padStart(2, '0');
    const thirdPart = (10 + ((seed * 7) % 90)).toString().padStart(2, '0');
    return `05${area} ${firstPart} ${secondPart} ${thirdPart}`;
  }

  private static generateEmail(firstName: string, lastName: string, seed: number) {
    const safeFirst = sanitizeForEmail(firstName);
    const safeLast = sanitizeForEmail(lastName);
    return `${safeFirst}.${safeLast}${seed}@example.com`;
  }

  /**
   * Generate a single user with realistic Turkish data
   * NOTE: Role is NOT included - use UserRole junction table for role assignment
   */
  static generate(overrides: Partial<Prisma.UserCreateInput> = {}): Prisma.UserCreateInput {
    const seed = this.nextSequence();
    const firstName = overrides.firstName ?? this.pickRandom(FIRST_NAMES, seed);
    const lastName = overrides.lastName ?? this.pickRandom(LAST_NAMES, seed * 3);

    const defaults: Prisma.UserCreateInput = {
      email: overrides.email || this.generateEmail(firstName, lastName, seed),
      firstName,
      lastName,
      phoneNumber: overrides.phoneNumber || this.generatePhoneNumber(seed),
      phoneVerified: overrides.phoneVerified ?? true,
      isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    };

    // Merge with overrides (overrides take precedence)
    return {
      ...defaults,
      ...overrides,
    };
  }

  /**
   * Generate multiple users with unique data
   */
  static generateMany(count: number, overrides: Partial<Prisma.UserCreateInput> = {}): Prisma.UserCreateInput[] {
    const users: Prisma.UserCreateInput[] = [];

    // Track used phone numbers and emails to ensure uniqueness
    const usedPhoneNumbers = new Set<string>();
    const usedEmails = new Set<string>();

    for (let i = 0; i < count; i++) {
      let user: Prisma.UserCreateInput;
      let attempts = 0;
      const maxAttempts = 50;

      // Ensure unique phone and email
      do {
        user = this.generate(overrides);
        attempts++;

        if (attempts > maxAttempts) {
          // Fallback: add random suffix to make unique
          user.phoneNumber = `${user.phoneNumber}${attempts}`;
          user.email = `${user.email}.${attempts}`;
          break;
        }
      } while (usedPhoneNumbers.has(user.phoneNumber || '') || usedEmails.has(user.email || ''));

      usedPhoneNumbers.add(user.phoneNumber || '');
      usedEmails.add(user.email || '');
      users.push(user);
    }

    return users;
  }
}
