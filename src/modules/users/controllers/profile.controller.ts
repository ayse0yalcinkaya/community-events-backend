// Libraries
import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Patch,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiExtraModels } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

// DTOs
import { QueryUpcomingEventsDto } from '../dto/request/query-upcoming-events.dto';
import { QueryDiscoverPeopleDto } from '../dto/request/query-discover-people.dto';
import { UpdateProfileDto } from '../dto/request/update-profile.dto';
import { DiscoverPersonResDto } from '../dto/response/discover-person-res.dto';
import { PublicProfileResDto } from '../dto/response/public-profile-res.dto';
import { UserDashboardResDto } from '../dto/response/user-dashboard-res.dto';
import { UserResDto } from '../dto/response/user-res.dto';
import { UserRolePermissionsResDto } from '../dto/response/user-role-permissions.res.dto';
import { EventResDto } from '@/modules/events/dto/response/event-res.dto';
import { CommunityResDto } from '@/modules/communities/dto/response/community-res.dto';

// Services
import { UsersService } from '../services/users.service';
import { FilesService } from '../../files/services/files.service';
import { PermissionsService } from '../../permissions/services/permissions.service';
// Guards/Decorators
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { ApiEndpoint, ApiGetOne, ApiUpdate } from '@/common/decorators';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/common/guards/optional-jwt-auth.guard';

// Interfaces/Types
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@ApiTags('Profile')
@ApiExtraModels(UserResDto, EventResDto, CommunityResDto)
@Controller('users')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  private readonly logger = new Logger(ProfileController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly filesService: FilesService,
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * GET /users/me
   * Get current authenticated user's profile
   * @param user Current authenticated user from JWT (inherited from class-level guard)
   * @returns UserResDto with non-sensitive fields only
   */
  @ApiGetOne(UserResDto)
  @Get('me')
  async getProfile(@CurrentUser() user: JwtPayload): Promise<UserResDto> {
    this.logger.log(`Getting profile for user: ${user.sub}`);

    // Fetch user with soft-delete filtering
    const userData = await this.usersService.findOne(user.sub);

    // Transform to DTOs
    const userDto = plainToInstance(UserResDto, userData, {
      excludeExtraneousValues: true,
    });

    // If user has a profile image, generate a pre-signed download URL
    if (userData.profileImageID) {
      try {
        // We can skip permission check here since it's the user's own profile image
        // passing true for hasViewPermission
        const downloadRes = await this.filesService.generateDownloadUrl(userData.profileImageID, user.sub, true);
        userDto.profileImageUrl = downloadRes.downloadUrl;
      } catch (error) {
        this.logger.warn(`Failed to generate profile image URL for user ${user.sub}: ${error}`);
        // Continue without profile image URL
      }
    }

    return userDto;
  }

  /**
   * GET /users/me/roles
   * Get current user's role with permissions as CSV string
   */
  @ApiEndpoint('Kullanıcının kendi rol ve yetkilerini getir', { type: UserRolePermissionsResDto })
  @Get('me/roles')
  async getMyRolePermissions(@CurrentUser() user: JwtPayload): Promise<UserRolePermissionsResDto> {
    this.logger.log(`Getting role permissions for user: ${user.sub}`);

    const summary = await this.permissionsService.getUserRolePermissionsSummary(user.sub);
    return plainToInstance(UserRolePermissionsResDto, summary);
  }

  @ApiEndpoint('Kullanicinin dashboard ozetini getir', { type: UserDashboardResDto })
  @Get('me/dashboard')
  async getMyDashboard(@CurrentUser() user: JwtPayload) {
    return this.usersService.getMyDashboard(user.sub);
  }

  @ApiEndpoint('Kullanicinin kaydettigi etkinlikleri getir', { type: EventResDto })
  @Get('me/bookmarks')
  async getMyBookmarks(@CurrentUser() user: JwtPayload) {
    const bookmarks = await this.usersService.getMyBookmarkedEvents(user.sub);
    return bookmarks.map((item) => plainToInstance(EventResDto, item, { excludeExtraneousValues: true }));
  }

  @ApiEndpoint('Kullanicinin katildigi etkinlikleri getir', { type: EventResDto })
  @Get('me/attendances')
  async getMyAttendances(@CurrentUser() user: JwtPayload) {
    const attendances = await this.usersService.getMyAttendingEvents(user.sub);
    return attendances.map((item) => plainToInstance(EventResDto, item, { excludeExtraneousValues: true }));
  }

  @ApiEndpoint('Kullanicinin yaklasan etkinliklerini getir', { type: EventResDto })
  @Get('me/upcoming-events')
  async getMyUpcomingEvents(
    @CurrentUser() user: JwtPayload,
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: QueryUpcomingEventsDto,
  ) {
    const events = await this.usersService.getMyUpcomingEvents(user.sub, query.limit);
    return events.map((item) => plainToInstance(EventResDto, item, { excludeExtraneousValues: true }));
  }

  @ApiEndpoint('Kullanicinin topluluklarini getir', { type: CommunityResDto })
  @Get('me/communities')
  async getMyCommunities(@CurrentUser() user: JwtPayload) {
    const communities = await this.usersService.getMyCommunities(user.sub);
    return communities.map((item) => plainToInstance(CommunityResDto, item, { excludeExtraneousValues: true }));
  }

  /**
   * PATCH /users/me
   * Update current authenticated user's profile (including optional profile image)
   * @param user Current authenticated user from JWT (inherited from class-level guard)
   * @param updateProfileDto Fields to update
   * @param file Optional profile image file
   * @returns Updated UserResDto
   */
  @ApiUpdate(UserResDto)
  @Patch('me')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          nullable: true,
        },
        firstName: { type: 'string', nullable: true },
        lastName: { type: 'string', nullable: true },
        phoneNumber: { type: 'string', nullable: true },
        headline: { type: 'string', nullable: true },
        bio: { type: 'string', nullable: true },
        city: { type: 'string', nullable: true },
        website: { type: 'string', nullable: true },
        instagramUrl: { type: 'string', nullable: true },
        linkedinUrl: { type: 'string', nullable: true },
      },
    },
  })
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UserResDto> {
    this.logger.log(`Updating profile for user: ${user.sub}`);

    // 1. Update text fields if provided
    let updatedUser = await this.usersService.updateProfile(user.sub, updateProfileDto);

    // 2. Upload and assign profile image if provided
    if (file) {
      this.logger.log(`Uploading profile image for user: ${user.sub}`);
      // Upload file
      const uploadedFiles = await this.filesService.uploadFiles([file], user.sub);
      const profileImage = uploadedFiles[0];

      // Update user with new profile image
      updatedUser = await this.usersService.updateProfileImage(user.sub, profileImage.id);
    }

    // Transform to DTO
    const userDto = plainToInstance(UserResDto, updatedUser, {
      excludeExtraneousValues: true,
    });

    // Generate URL for the returned user dto if image exists (it should now)
    if (updatedUser.profileImageID) {
      try {
        const downloadRes = await this.filesService.generateDownloadUrl(updatedUser.profileImageID, user.sub, true);
        userDto.profileImageUrl = downloadRes.downloadUrl;
      } catch (error) {
        this.logger.warn(`Failed to generate profile image URL for user ${user.sub}: ${error}`);
      }
    }

    return userDto;
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('discover')
  @ApiEndpoint('Kisileri kesif listesinde getir', { type: DiscoverPersonResDto, isPublic: true, isPaginated: true })
  async discoverPeople(
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: QueryDiscoverPeopleDto,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.usersService.discoverPeople(query, user?.sub);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/profile')
  @ApiEndpoint('Kullanicinin public profilini getir', { type: PublicProfileResDto, params: [{ name: 'id' }] })
  async getPublicProfile(@Param('id') id: string, @CurrentUser() user?: JwtPayload) {
    const profile = await this.usersService.getPublicProfile(id, user?.sub);

    if (profile.profileImageID) {
      try {
        const downloadRes = await this.filesService.generateDownloadUrl(profile.profileImageID, 'system', true);
        profile.profileImageUrl = downloadRes.downloadUrl;
      } catch (error) {
        this.logger.warn(`Failed to generate profile image URL: ${error}`);
      }
    }

    return plainToInstance(PublicProfileResDto, profile, { excludeExtraneousValues: true });
  }
}
