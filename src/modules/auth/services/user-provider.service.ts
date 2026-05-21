// Libraries
import { Injectable, Logger } from '@nestjs/common';
import { AuthProvider, Prisma } from '@prisma/client';

// Services
import { PrismaService } from '../../../database/prisma.service';
// Utils
import { comparePassword, hashPassword } from '../../../common/utils/hash.util';

/**
 * Service for managing user authentication providers.
 * Supports multiple providers per user (AD, LOGIN).
 */
@Injectable()
export class UserProviderService {
  private readonly logger = new Logger(UserProviderService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new provider for a user
   * @param userID User's UUID
   * @param provider Provider type (AD, LOGIN)
   * @param identifier Provider-specific identifier (phone for LOGIN, username for AD)
   * @param credentials Optional credentials (password hash for LOGIN, null for AD)
   */
  private resolveClient(client?: PrismaService | Prisma.TransactionClient) {
    return client ?? this.prisma;
  }

  async createProvider(
    userID: string,
    provider: AuthProvider,
    identifier: string,
    credentials?: string,
    prismaClient?: PrismaService | Prisma.TransactionClient,
  ) {
    const prisma = this.resolveClient(prismaClient);

    return prisma.userProvider.create({
      data: {
        userID,
        provider,
        identifier,
        credentials,
        status: 1,
      },
    });
  }

  /**
   * Create LOGIN provider with password hashing
   * @param userID User's UUID
   * @param identifier Phone number or email
   * @param password Plain text password to hash
   */
  async createLoginProvider(
    userID: string,
    identifier: string,
    password: string,
    prismaClient?: PrismaService | Prisma.TransactionClient,
  ) {
    const hashedPassword = await hashPassword(password);
    return this.createProvider(userID, 'LOGIN', identifier, hashedPassword, prismaClient);
  }

  /**
   * Find provider by provider type and identifier
   * @param provider Provider type (AD, LOGIN)
   * @param identifier Provider-specific identifier
   */
  async findByIdentifier(provider: AuthProvider, identifier: string) {
    return this.prisma.userProvider.findUnique({
      where: {
        provider_identifier: {
          provider,
          identifier,
        },
      },
      include: {
        user: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  /**
   * Find provider by user ID and provider type
   * @param userID User's UUID
   * @param provider Provider type (AD, LOGIN)
   */
  async findByUserAndProvider(userID: string, provider: AuthProvider) {
    return this.prisma.userProvider.findUnique({
      where: {
        userID_provider: {
          userID,
          provider,
        },
      },
    });
  }

  /**
   * Validate credentials for a provider
   * @param providerID Provider's UUID
   * @param password Plain text password to validate
   * @returns true if valid, false otherwise
   */
  async validateCredentials(providerID: string, password: string): Promise<boolean> {
    const provider = await this.prisma.userProvider.findUnique({
      where: { id: providerID },
    });

    if (!provider || !provider.credentials) {
      return false;
    }

    return comparePassword(password, provider.credentials);
  }

  /**
   * Update last login timestamp
   * @param providerID Provider's UUID
   */
  async updateLastLogin(providerID: string) {
    return this.prisma.userProvider.update({
      where: { id: providerID },
      data: { lastLogin: new Date() },
    });
  }

  /**
   * Update provider credentials (e.g., password reset)
   * @param userID User's UUID
   * @param provider Provider type
   * @param newPassword New plain text password
   */
  async updateCredentials(userID: string, provider: AuthProvider, newPassword: string) {
    const hashedPassword = await hashPassword(newPassword);
    return this.prisma.userProvider.update({
      where: {
        userID_provider: {
          userID,
          provider,
        },
      },
      data: { credentials: hashedPassword },
    });
  }

  /**
   * Get all providers for a user
   * @param userID User's UUID
   */
  async getUserProviders(userID: string) {
    return this.prisma.userProvider.findMany({
      where: { userID },
      select: {
        id: true,
        provider: true,
        identifier: true,
        lastLogin: true,
        status: true,
        createdAt: true,
        // credentials excluded for security
      },
    });
  }
}
