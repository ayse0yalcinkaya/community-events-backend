// Libraries
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { UserTypeEnum } from '@/common/enums';

// DTOs
import { CreateUserDto } from '../dto/request/create-user.dto';
import { QueryUserDto } from '../dto/request/query-user.dto';
import { UpdateProfileDto } from '../dto/request/update-profile.dto';
import { UpdateUserDto } from '../dto/request/update-user.dto';

// Enums
import { NotificationChannel } from '../../notifications/enums/notification-channel.enum';

// Services
import { PrismaService } from '../../../database/prisma.service';
import { UserProviderService } from '../../auth/services/user-provider.service';
// Interfaces/Types
import { Prisma, User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { deriveLegalEntityType } from '../utils/legal-entity.util';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly userProviderService: UserProviderService,
  ) {}

  /**
   * Find a single user by ID with soft-delete filtering
   * @param id User UUID
   * @returns User entity
   * @throws NotFoundException if user not found or soft-deleted
   */
  async findOne(id: string): Promise<User> {
    this.logger.log(`Finding user: ${id}`);

    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null, // Exclude soft-deleted users
      },
      include: {
        role: true,
        profileImage: true,
      },
    });

    if (!user) {
      throw new NotFoundException(await this.i18n.translate('users.USER_NOT_FOUND'));
    }

    this.logger.log(`User found: ${user.id}`);
    return user;
  }

  /**
   * Update user profile with validation and uniqueness checks
   * @param userId User UUID
   * @param updateProfileDto Fields to update
   * @returns Updated user entity
   * @throws NotFoundException if user not found
   * @throws ConflictException if phoneNumber already exists
   */
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    this.logger.log(`Updating profile for user: ${userId}`);

    // 1. Verify user exists
    const existingUser = await this.findOne(userId);

    // 2. Check phoneNumber uniqueness if being updated
    if (updateProfileDto.phoneNumber && updateProfileDto.phoneNumber !== existingUser.phoneNumber) {
      await this.ensurePhoneNumberUnique(updateProfileDto.phoneNumber, {
        excludeUserId: userId,
      });
    }

    // 3. Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: updateProfileDto.firstName ?? existingUser.firstName,
        lastName: updateProfileDto.lastName ?? existingUser.lastName,
        phoneNumber: updateProfileDto.phoneNumber ?? existingUser.phoneNumber,
        headline: updateProfileDto.headline ?? existingUser.headline,
        bio: updateProfileDto.bio ?? existingUser.bio,
        city: updateProfileDto.city ?? existingUser.city,
        website: updateProfileDto.website ?? existingUser.website,
        instagramUrl: updateProfileDto.instagramUrl ?? existingUser.instagramUrl,
        linkedinUrl: updateProfileDto.linkedinUrl ?? existingUser.linkedinUrl,
      },
    });

    this.logger.log(`Profile updated successfully for user: ${userId}`);
    return updatedUser;
  }

  /**
   * Update user profile image
   * @param userId User UUID
   * @param imageId File UUID
   */
  async updateProfileImage(userId: string, imageId: string): Promise<User> {
    this.logger.log(`Updating profile image for user: ${userId}, image: ${imageId}`);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { profileImageID: imageId },
      include: {
        profileImage: true,
      },
    });

    return user;
  }

  /**
   * Find all users with pagination, filtering, and sorting (Admin operation)
   * @param queryDto Query parameters for pagination, filtering, sorting
   * @returns Object with data array and total count
   */
  async findAll(queryDto: QueryUserDto): Promise<{ data: User[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      status,
      role,
      userType,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
    } = queryDto;

    this.logger.log(`Finding users (page: ${page}, limit: ${limit})`);

    // Build where clause
    const where: any = {
      deletedAt: null, // Exclude soft-deleted users
    };

    // Filter by status (active/inactive)
    if (status) {
      where.isActive = status === 'active';
    }

    // Filter by role via junction table
    if (role) {
      const normalizedRole = role.toLowerCase();
      where.role = {
        name: normalizedRole,
      };
    }

    // Filter by user type
    if (userType) {
      where.userType = userType;
    }

    // Search in firstName, lastName, phoneNumber (OR condition)
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
      ];
    }

    // Filter by createdAt date range
    if (createdFrom || createdTo) {
      where.createdAt = {
        ...(createdFrom ? { gte: createdFrom } : {}),
        ...(createdTo ? { lte: createdTo } : {}),
      };
    }

    // Filter by updatedAt date range
    if (updatedFrom || updatedTo) {
      where.updatedAt = {
        ...(updatedFrom ? { gte: updatedFrom } : {}),
        ...(updatedTo ? { lte: updatedTo } : {}),
      };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const take = limit;

    // Build orderBy
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Execute queries in parallel
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          role: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    this.logger.log(`Found ${data.length} users (total: ${total})`);
    return { data, total };
  }

  /**
   * Find all users
   * @returns Array of users
   */
  async findAllUsers(): Promise<User[]> {
    this.logger.log(`Finding all users`);

    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null, // Exclude soft-deleted users
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    this.logger.log(`Found ${users.length} users`);
    return users;
  }

  async getMyBookmarkedEvents(userId: string) {
    const bookmarks = await this.prisma.eventBookmark.findMany({
      where: { userID: userId },
      include: {
        event: {
          include: {
            primaryCategory: true,
            organizerCommunity: true,
            location: true,
            sessions: {
              orderBy: { startAt: 'asc' },
            },
            _count: {
              select: {
                attendances: true,
                bookmarks: true,
              },
            },
            attendances: {
              where: { userID: userId },
              take: 1,
            },
            bookmarks: {
              where: { userID: userId },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookmarks.map(({ event }) => ({
      ...event,
      attendeeCount: event._count.attendances,
      bookmarkCount: event._count.bookmarks,
      currentUserAttendanceStatus: event.attendances[0]?.status ?? null,
      currentUserAttendanceVisibility: event.attendances[0]?.visibility ?? null,
      isBookmarked: event.bookmarks.length > 0,
    }));
  }

  async getMyAttendingEvents(userId: string) {
    const attendances = await this.prisma.eventAttendance.findMany({
      where: {
        userID: userId,
        status: { in: ['APPROVED', 'PENDING', 'WAITLIST'] },
      },
      include: {
        event: {
          include: {
            primaryCategory: true,
            organizerCommunity: true,
            location: true,
            sessions: {
              orderBy: { startAt: 'asc' },
            },
            _count: {
              select: {
                attendances: true,
                bookmarks: true,
              },
            },
            bookmarks: {
              where: { userID: userId },
              take: 1,
            },
          },
        },
      },
      orderBy: { registeredAt: 'desc' },
    });

    return attendances.map(({ event, status, visibility }) => ({
      ...event,
      attendeeCount: event._count.attendances,
      bookmarkCount: event._count.bookmarks,
      currentUserAttendanceStatus: status,
      currentUserAttendanceVisibility: visibility,
      isBookmarked: event.bookmarks.length > 0,
    }));
  }

  async getMyCommunities(userId: string) {
    const memberships = await this.prisma.communityMember.findMany({
      where: {
        userID: userId,
        status: 'ACTIVE',
      },
      include: {
        community: {
          include: {
            _count: {
              select: {
                members: {
                  where: { status: 'ACTIVE' },
                },
                events: {
                  where: { deletedAt: null, status: 'PUBLISHED' },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return memberships.map(({ community, role, status }) => ({
      ...community,
      memberCount: community._count.members,
      activeEventCount: community._count.events,
      currentUserMembershipStatus: status,
      currentUserMembershipRole: role,
    }));
  }

  /**
   * Create a new user (Admin operation)
   * @param createUserDto User creation data
   * @returns Created user entity
   * @throws ConflictException if phoneNumber already exists
   * @throws BadRequestException if password required but not provided
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log(`Creating user (default role will be assigned automatically)`);

    // 1. Check phoneNumber uniqueness
    await this.ensurePhoneNumberUnique(createUserDto.phoneNumber, {
      errorKey: 'auth.PHONE_ALREADY_EXISTS',
    });

    // 2. Check VKN uniqueness if provided
    if (createUserDto.VKN) {
      const vknExists = await this.prisma.user.findFirst({
        where: {
          VKN: createUserDto.VKN,
          deletedAt: null,
        },
      });

      if (vknExists) {
        this.logger.warn(`VKN conflict: ${createUserDto.VKN}`);
        throw new ConflictException(await this.i18n.translate('auth.VKN_ALREADY_EXISTS'));
      }
    }

    // 3. Create user and default preferences in a transaction
    const legalEntityType = deriveLegalEntityType(createUserDto.VKN);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        // Create user (NOTE: password stored in UserProvider, not User)
        const newUser = await tx.user.create({
          data: {
            phoneNumber: createUserDto.phoneNumber,
            firstName: createUserDto.firstName,
            lastName: createUserDto.lastName,
            email: createUserDto.email,
            userType: createUserDto.userType || UserTypeEnum.USER,
            VKN: createUserDto.VKN,
            legalEntityType,
            phoneVerified: true, // New users start verified
            isActive: true, // New users start active
          },
        });

        this.logger.log(`User created successfully: ${newUser.id}`);

        // Create LOGIN provider if password provided
        if (createUserDto.password) {
          await this.userProviderService.createLoginProvider(
            newUser.id,
            newUser.phoneNumber,
            createUserDto.password,
            tx,
          );
          this.logger.log(`LOGIN provider created for user: ${newUser.id}`);
        }

        // Create default notification preferences (all channels enabled)
        try {
          const channels = [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.PUSH];

          await Promise.all(
            channels.map((channel) =>
              tx.notificationPreference.create({
                data: {
                  userID: newUser.id,
                  channel,
                  enabled: true, // All channels enabled by default
                },
              }),
            ),
          );

          this.logger.log(`Default notification preferences created for user: ${newUser.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to create default notification preferences for user: ${newUser.id}`,
            error instanceof Error ? error.stack : String(error),
          );
        }

        // 4. Role Assignment Logic
        let roleToAssign: string | null = createUserDto.roleID ?? null;

        // If no roleID provided, find default role for userType
        if (!roleToAssign) {
          const defaultRole = await tx.role.findFirst({
            where: {
              parentType: newUser.userType,
              isDefault: true,
            },
          });

          if (defaultRole) {
            roleToAssign = defaultRole.id;
            this.logger.log(
              `Auto-assigning default role '${defaultRole.name}' to user ${newUser.id} (userType: ${newUser.userType})`,
            );
          } else {
            this.logger.warn(
              `No default role found for userType ${newUser.userType}. User ${newUser.id} created without role.`,
            );
          }
        }

        // Assign role if we have one (provided or default)
        if (roleToAssign) {
          try {
            const role = await tx.role.findUnique({
              where: { id: roleToAssign },
            });

            if (!role) {
              throw new NotFoundException(await this.i18n.translate('errors.ROLE_NOT_FOUND'));
            }

            // Validate user type compatibility with role parentType
            if (role.parentType && role.parentType !== newUser.userType) {
              this.logger.warn(
                `Role type mismatch: user ${newUser.id} (${newUser.userType}) cannot have role ${role.id} (${role.parentType})`,
              );
              throw new BadRequestException(await this.i18n.translate('errors.ROLE_TYPE_MISMATCH'));
            }

            // Update user with roleID
            await tx.user.update({
              where: { id: newUser.id },
              data: { roleID: roleToAssign },
            });
            this.logger.log(`Assigned role ${role.name} to user ${newUser.id}`);
          } catch (error) {
            this.logger.error(
              `Failed to assign role ${roleToAssign} to user ${newUser.id}`,
              error instanceof Error ? error.stack : String(error),
            );
            throw error;
          }
        }

        return newUser;
      });

      return user;
    } catch (error) {
      // Handle unique constraint violations (race condition or soft-deleted records)
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = (error.meta?.target as string[]) || [];
        if (target.includes('phoneNumber')) {
          throw new ConflictException(await this.i18n.translate('auth.PHONE_ALREADY_EXISTS'));
        }
        if (target.includes('VKN')) {
          throw new ConflictException(await this.i18n.translate('auth.VKN_ALREADY_EXISTS'));
        }
      }
      // Re-throw other errors (NotFoundException, BadRequestException, etc.)
      throw error;
    }
  }

  /**
   * Update user (Admin operation)
   * @param id User UUID
   * @param updateUserDto Fields to update
   * @returns Updated user entity
   * @throws NotFoundException if user not found
   * @throws ConflictException if phoneNumber already exists
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    this.logger.log(`Updating user: ${id}`);

    // 1. Verify user exists
    const existingUser = await this.findOne(id);

    // 2. Check phoneNumber uniqueness if being updated
    if (updateUserDto.phoneNumber && updateUserDto.phoneNumber !== existingUser.phoneNumber) {
      await this.ensurePhoneNumberUnique(updateUserDto.phoneNumber, {
        excludeUserId: id,
      });
    }

    // 3. Update user (partial update)
    const legalEntityType = deriveLegalEntityType(updateUserDto.VKN);
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: updateUserDto.firstName,
        lastName: updateUserDto.lastName,
        phoneNumber: updateUserDto.phoneNumber,
        email: updateUserDto.email,
        isActive: updateUserDto.isActive,
        userType: updateUserDto.userType,
        VKN: updateUserDto.VKN,
        ...(legalEntityType ? { legalEntityType } : {}),
        // Role assignment logic during update
        ...(updateUserDto.roleID !== undefined ? { roleID: updateUserDto.roleID } : {}),
      },
    });

    // Explicitly validate Role if it was updated
    if (updateUserDto.roleID) {
      const role = await this.prisma.role.findUnique({ where: { id: updateUserDto.roleID } });
      if (!role) throw new NotFoundException(await this.i18n.translate('errors.ROLE_NOT_FOUND'));

      if (role.parentType && role.parentType !== existingUser.userType) {
        throw new BadRequestException(await this.i18n.translate('errors.ROLE_TYPE_MISMATCH'));
      }
    }

    this.logger.log(`User updated successfully: ${id}`);
    return updatedUser;
  }

  /**
   * Soft-delete user (Admin operation)
   * @param id User UUID
   * @throws NotFoundException if user not found
   */
  async softDelete(id: string): Promise<void> {
    this.logger.log(`Soft-deleting user: ${id}`);

    // 1. Verify user exists
    await this.findOne(id);

    // 2. Soft-delete user by setting deletedAt timestamp
    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false, // ensure status reflects deletion
      },
    });

    this.logger.log(`User soft-deleted successfully: ${id}`);
  }

  async restore(id: string): Promise<void> {
    this.logger.log(`Restoring user: ${id}`);

    // 1. Verify user exists
    await this.findOne(id);

    // 2. Restore user by setting deletedAt to null
    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: null,
      },
    });

    this.logger.log(`User restored successfully: ${id}`);
  }

  private async ensurePhoneNumberUnique(
    phoneNumber?: string,
    options?: { excludeUserId?: string; errorKey?: string },
  ): Promise<void> {
    if (!phoneNumber) {
      return;
    }

    const { excludeUserId, errorKey = 'common.ERROR' } = options ?? {};
    const where: Prisma.UserWhereInput = {
      phoneNumber,
      deletedAt: null,
    };

    if (excludeUserId) {
      where.id = { not: excludeUserId };
    }

    const existingUser = await this.prisma.user.findFirst({
      where,
    });

    if (existingUser) {
      this.logger.warn(`Phone number conflict: ${phoneNumber}`);
      throw new ConflictException(await this.i18n.translate(errorKey));
    }
  }

  /**
   * Assign role to user via UserRole junction table
   * @param userID User UUID
   * @param roleID Role UUID
   * @throws ConflictException if user already has this role
   */
  async assignRole(userID: string, roleID: string): Promise<void> {
    this.logger.log(`Assigning role ${roleID} to user ${userID}`);

    // 1. Verify user exists and get its type
    const user = await this.prisma.user.findFirst({
      where: {
        id: userID,
        deletedAt: null,
      },
      select: {
        id: true,
        userType: true,
        roleID: true,
      },
    });

    if (!user) {
      throw new NotFoundException(await this.i18n.translate('users.USER_NOT_FOUND'));
    }

    // 2. Verify role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleID },
    });

    if (!role) {
      throw new NotFoundException(await this.i18n.translate('errors.ROLE_NOT_FOUND'));
    }

    // 3. Validate user type compatibility with role parentType
    if (role.parentType && role.parentType !== user.userType) {
      this.logger.warn(
        `Role type mismatch: user ${userID} (${user.userType}) cannot have role ${roleID} (${role.parentType})`,
      );
      throw new BadRequestException(await this.i18n.translate('errors.ROLE_TYPE_MISMATCH'));
    }

    // 4. Check if user already has this role
    if (user.roleID === roleID) {
      throw new ConflictException(await this.i18n.translate('errors.ROLE_ALREADY_ASSIGNED'));
    }

    // 5. Assign role via roleID
    await this.prisma.user.update({
      where: { id: userID },
      data: {
        roleID: roleID,
      },
    });

    this.logger.log(`Role assigned successfully: user ${userID} -> role ${roleID}`);
  }

  /**
   * Revoke role from user
   * @param userID User UUID
   * @param roleID Role UUID
   */
  async revokeRole(userID: string, roleID: string): Promise<void> {
    this.logger.log(`Revoking role ${roleID} from user ${userID}`);

    // 1. Verify user exists
    await this.findOne(userID);

    // 2. Verify role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleID },
    });

    if (!role) {
      throw new NotFoundException(await this.i18n.translate('errors.ROLE_NOT_FOUND'));
    }

    // 3. Remove role by setting roleID to null
    await this.prisma.user.update({
      where: { id: userID },
      data: { roleID: null },
    });

    this.logger.log(`Role revoked successfully: user ${userID} <- role ${roleID}`);
  }

  /**
   * Get user's roles
   * @param userID User UUID
   * @returns Array of user roles
   */
  async getUserRoles(userID: string): Promise<any[]> {
    this.logger.log(`Getting roles for user ${userID}`);

    // 1. Verify user exists
    // 2. Get user with role
    const user = await this.prisma.user.findFirst({
      where: {
        id: userID,
        deletedAt: null,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException(await this.i18n.translate('users.USER_NOT_FOUND'));
    }

    if (!user.role) {
      return [];
    }

    return [
      {
        id: user.role.id,
        name: user.role.name,
        assignedAt: user.updatedAt,
      },
    ];
  }
}
