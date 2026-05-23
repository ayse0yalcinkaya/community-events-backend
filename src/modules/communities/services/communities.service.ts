// Libraries
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CommunityMemberRole, CommunityMemberStatus, CommunityStatus, EventStatus, Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

// DTOs
import { CreateCommunityAnnouncementDto } from '../dto/request/create-community-announcement.dto';
import { CreateCommunityDto } from '../dto/create-community.dto';
import { QueryCommunitiesDto } from '../dto/query-communities.dto';
import { CommunityResDto } from '../dto/response/community-res.dto';
import { UpdateCommunityDto } from '../dto/update-community.dto';

// Enums
import { NotificationType } from '@/modules/notifications/enums/notification-type.enum';

// Services
import { PrismaService } from '@/database/prisma.service';
import { FilesService } from '@/modules/files/services/files.service';
import { AnnouncementsService } from '@/modules/announcements/services/announcements.service';
import { NotificationService } from '@/modules/notifications/services/notification.service';
@Injectable()
export class CommunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly announcementsService: AnnouncementsService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(userId: string, dto: CreateCommunityDto) {
    const created = await this.prisma.community.create({
      data: {
        name: dto.name,
        slug: await this.generateUniqueSlug(dto.name),
        shortDescription: dto.shortDescription,
        description: dto.description,
        city: dto.city,
        website: dto.website,
        instagramUrl: dto.instagramUrl,
        linkedinUrl: dto.linkedinUrl,
        createdByUserID: userId,
        status: CommunityStatus.ACTIVE,
        members: {
          create: {
            userID: userId,
            role: 'OWNER',
            status: 'ACTIVE',
            joinedAt: new Date(),
          },
        },
      },
      include: this.communityInclude(userId),
    });

    return this.toCommunityResponse(created, userId);
  }

  async findAll(query: QueryCommunitiesDto) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 10, 1), 50);
    const skip = (page - 1) * limit;

    const where: Prisma.CommunityWhereInput = {
      deletedAt: null,
      status: CommunityStatus.ACTIVE,
      ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { shortDescription: { contains: query.q, mode: 'insensitive' } },
              { description: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, count] = await Promise.all([
      this.prisma.community.findMany({
        where,
        skip,
        take: limit,
        include: this.communityInclude(),
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.community.count({ where }),
    ]);

    return {
      items: await Promise.all(items.map((item) => this.toCommunityResponse(item))),
      count,
    };
  }

  async findOneBySlug(slug: string, userId?: string) {
    const community = await this.prisma.community.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
      include: this.communityInclude(userId),
    });

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    return this.toCommunityResponse(community, userId);
  }

  async update(id: string, userId: string, dto: UpdateCommunityDto) {
    const community = await this.ensureManageAccess(id, userId);

    const updated = await this.prisma.community.update({
      where: { id: community.id },
      data: {
        name: dto.name,
        ...(dto.name ? { slug: await this.generateUniqueSlug(dto.name, community.id) } : {}),
        shortDescription: dto.shortDescription,
        description: dto.description,
        city: dto.city,
        website: dto.website,
        instagramUrl: dto.instagramUrl,
        linkedinUrl: dto.linkedinUrl,
      },
      include: this.communityInclude(userId),
    });

    return this.toCommunityResponse(updated, userId);
  }

  async updateLogo(id: string, userId: string, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Logo file is required');
    }

    await this.ensureManageAccess(id, userId);
    const uploaded = await this.filesService.uploadFiles([file], userId);
    const updated = await this.prisma.community.update({
      where: { id },
      data: { logoFileID: uploaded[0].id },
      include: this.communityInclude(userId),
    });

    return this.toCommunityResponse(updated, userId);
  }

  async updateCoverImage(id: string, userId: string, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Cover image file is required');
    }

    await this.ensureManageAccess(id, userId);
    const uploaded = await this.filesService.uploadFiles([file], userId);
    const updated = await this.prisma.community.update({
      where: { id },
      data: { coverImageFileID: uploaded[0].id },
      include: this.communityInclude(userId),
    });

    return this.toCommunityResponse(updated, userId);
  }

  async join(id: string, userId: string) {
    const community = await this.ensureActiveCommunity(id);

    await this.prisma.communityMember.upsert({
      where: {
        communityID_userID: {
          communityID: community.id,
          userID: userId,
        },
      },
      create: {
        communityID: community.id,
        userID: userId,
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
      update: {
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
    });

    return this.findOneById(community.id, userId);
  }

  async leave(id: string, userId: string) {
    const community = await this.ensureActiveCommunity(id);
    const membership = await this.prisma.communityMember.findUnique({
      where: {
        communityID_userID: {
          communityID: community.id,
          userID: userId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Community membership not found');
    }

    if (membership.role === 'OWNER') {
      throw new BadRequestException('Community owner cannot leave the community');
    }

    await this.prisma.communityMember.update({
      where: {
        communityID_userID: {
          communityID: community.id,
          userID: userId,
        },
      },
      data: {
        status: CommunityMemberStatus.LEFT,
      },
    });

    return this.findOneById(community.id, userId);
  }

  async getMembers(id: string) {
    await this.ensureActiveCommunity(id);

    return this.prisma.communityMember.findMany({
      where: {
        communityID: id,
        status: CommunityMemberStatus.ACTIVE,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageID: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async updateMemberRole(id: string, memberId: string, currentUserId: string, role: CommunityMemberRole) {
    const manager = await this.ensureManageMembershipAccess(id, currentUserId);
    const membership = await this.ensureActiveMembership(id, memberId);

    if (membership.userID === currentUserId && role !== CommunityMemberRole.OWNER) {
      throw new BadRequestException('You cannot change your own role unless transferring ownership');
    }

    if (role === CommunityMemberRole.OWNER) {
      if (manager.role !== CommunityMemberRole.OWNER && manager.community.createdByUserID !== currentUserId) {
        throw new BadRequestException('Only the current owner can transfer ownership');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.communityMember.update({
          where: {
            communityID_userID: {
              communityID: id,
              userID: currentUserId,
            },
          },
          data: { role: CommunityMemberRole.ADMIN },
        });

        await tx.communityMember.update({
          where: {
            communityID_userID: {
              communityID: id,
              userID: memberId,
            },
          },
          data: { role: CommunityMemberRole.OWNER },
        });

        await tx.community.update({
          where: { id },
          data: { createdByUserID: memberId },
        });
      });

      return this.findOneById(id, currentUserId);
    }

    if (membership.role === CommunityMemberRole.OWNER) {
      throw new BadRequestException('Owner role can only be changed through ownership transfer');
    }

    await this.prisma.communityMember.update({
      where: {
        communityID_userID: {
          communityID: id,
          userID: memberId,
        },
      },
      data: { role },
    });

    return this.findOneById(id, currentUserId);
  }

  async removeMember(id: string, memberId: string, currentUserId: string) {
    const manager = await this.ensureManageMembershipAccess(id, currentUserId);
    const membership = await this.ensureActiveMembership(id, memberId);

    if (membership.role === CommunityMemberRole.OWNER) {
      throw new BadRequestException('Owner cannot be removed from the community');
    }

    if (manager.role === CommunityMemberRole.ADMIN && membership.role === CommunityMemberRole.ADMIN) {
      throw new BadRequestException('Admins cannot remove another admin');
    }

    await this.prisma.communityMember.update({
      where: {
        communityID_userID: {
          communityID: id,
          userID: memberId,
        },
      },
      data: {
        status: CommunityMemberStatus.LEFT,
      },
    });

    return this.findOneById(id, currentUserId);
  }

  async getEvents(id: string) {
    await this.ensureActiveCommunity(id);

    return this.prisma.event.findMany({
      where: {
        organizerCommunityID: id,
        deletedAt: null,
        status: EventStatus.PUBLISHED,
      },
      include: {
        primaryCategory: true,
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
      },
      orderBy: [{ publishedAt: 'desc' }],
    });
  }

  async getGallery(id: string) {
    await this.ensureActiveCommunity(id);

    const items = await this.prisma.communityGallery.findMany({
      where: { communityID: id },
      include: { file: { select: { id: true, mimeType: true, originalName: true, size: true } } },
      orderBy: { order: 'asc' },
    });

    const gallery = await Promise.all(
      items.map(async (item) => {
        const { downloadUrl } = await this.filesService.generateDownloadUrl(item.fileID, '', true);
        return {
          id: item.id,
          fileId: item.fileID,
          caption: item.caption,
          order: item.order,
          url: downloadUrl,
          file: item.file,
          createdAt: item.createdAt,
        };
      }),
    );

    return gallery;
  }

  async addGalleryItem(id: string, userId: string, file: Express.Multer.File, caption?: string) {
    await this.ensureManageAccess(id, userId);

    const uploaded = await this.filesService.uploadFiles([file], userId);
    const maxOrder = await this.prisma.communityGallery.aggregate({
      where: { communityID: id },
      _max: { order: true },
    });

    const item = await this.prisma.communityGallery.create({
      data: {
        communityID: id,
        fileID: uploaded[0].id,
        caption: caption ?? null,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    return {
      id: item.id,
      fileId: item.fileID,
      caption: item.caption,
      order: item.order,
      createdAt: item.createdAt,
    };
  }

  async removeGalleryItem(id: string, galleryId: string, userId: string) {
    await this.ensureManageAccess(id, userId);

    const item = await this.prisma.communityGallery.findFirst({
      where: { id: galleryId, communityID: id },
    });

    if (!item) {
      throw new NotFoundException('Gallery item not found');
    }

    await this.prisma.communityGallery.delete({
      where: { id: galleryId },
    });

    return { deleted: true };
  }

  async getSummary(id: string, userId?: string) {
    const community = await this.prisma.community.findFirst({
      where: { id, deletedAt: null, status: CommunityStatus.ACTIVE },
      include: {
        ...this.communityInclude(userId),
        gallery: { orderBy: { order: 'asc' }, take: 6 },
      },
    });

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    const [upcomingEvents, recentAnnouncements, memberCount, galleryCount] = await Promise.all([
      this.prisma.event.count({
        where: {
          organizerCommunityID: id,
          deletedAt: null,
          status: EventStatus.PUBLISHED,
          sessions: { some: { startAt: { gte: new Date() } } },
        },
      }),
      this.prisma.announcement.count({
        where: { communityID: id },
      }),
      this.prisma.communityMember.count({
        where: { communityID: id, status: CommunityMemberStatus.ACTIVE },
      }),
      this.prisma.communityGallery.count({
        where: { communityID: id },
      }),
    ]);

    const communityRes = await this.toCommunityResponse(community, userId);

    return {
      community: communityRes,
      tabs: {
        events: { count: community._count?.events ?? 0, upcomingCount: upcomingEvents },
        members: { count: memberCount },
        announcements: { count: recentAnnouncements },
        gallery: { count: galleryCount, previewCount: community.gallery.length },
      },
    };
  }

  async getAnnouncements(id: string, page = 1, limit = 10) {
    await this.ensureActiveCommunity(id);
    return this.announcementsService.findByCommunity(id, page, limit);
  }

  async createAnnouncement(id: string, userId: string, dto: CreateCommunityAnnouncementDto) {
    await this.ensureManageAccess(id, userId);

    if (dto.communityID !== id) {
      throw new BadRequestException('Community id mismatch');
    }

    const announcement = await this.announcementsService.createCommunityAnnouncement(dto, userId);

    this.broadcastAnnouncementNotification(id, dto.title, userId).catch(() => {});

    return announcement;
  }

  private async broadcastAnnouncementNotification(communityId: string, title: string, excludeUserId: string) {
    const members = await this.prisma.communityMember.findMany({
      where: {
        communityID: communityId,
        status: CommunityMemberStatus.ACTIVE,
        userID: { not: excludeUserId },
      },
      select: { userID: true },
    });

    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      select: { name: true },
    });

    for (const member of members) {
      try {
        await this.notificationService.send(
          member.userID,
          NotificationType.COMMUNITY_ANNOUNCEMENT,
          `${community?.name ?? 'Topluluk'} - Yeni Duyuru`,
          title,
          { communityId },
        );
      } catch {
        // fire-and-forget
      }
    }
  }

  private async findOneById(id: string, userId?: string) {
    const community = await this.prisma.community.findUniqueOrThrow({
      where: { id },
      include: this.communityInclude(userId),
    });

    return this.toCommunityResponse(community, userId);
  }

  private async ensureActiveCommunity(id: string) {
    const community = await this.prisma.community.findFirst({
      where: {
        id,
        deletedAt: null,
        status: CommunityStatus.ACTIVE,
      },
    });

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    return community;
  }

  private async ensureActiveMembership(communityId: string, userId: string) {
    const membership = await this.prisma.communityMember.findFirst({
      where: {
        communityID: communityId,
        userID: userId,
        status: CommunityMemberStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new NotFoundException('Community membership not found');
    }

    return membership;
  }

  private async ensureManageMembershipAccess(communityId: string, userId: string) {
    const community = await this.ensureManageAccess(communityId, userId);
    const membership = await this.ensureActiveMembership(communityId, userId);
    return { community, role: membership.role };
  }

  private async ensureManageAccess(id: string, userId: string) {
    const community = await this.prisma.community.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { createdByUserID: userId },
          {
            members: {
              some: {
                userID: userId,
                status: CommunityMemberStatus.ACTIVE,
                role: { in: ['OWNER', 'ADMIN'] },
              },
            },
          },
        ],
      },
    });

    if (!community) {
      throw new NotFoundException('Community not found or not manageable by current user');
    }

    return community;
  }

  private communityInclude(userId?: string) {
    return {
      _count: {
        select: {
          members: {
            where: { status: CommunityMemberStatus.ACTIVE },
          },
          events: {
            where: { deletedAt: null, status: EventStatus.PUBLISHED },
          },
        },
      },
      ...(userId
        ? {
            members: {
              where: { userID: userId },
              take: 1,
            },
          }
        : {}),
    };
  }

  private async generateUniqueSlug(name: string, excludeCommunityId?: string) {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 160);

    let slug = baseSlug || 'community';
    let counter = 1;

    while (
      await this.prisma.community.findFirst({
        where: {
          slug,
          ...(excludeCommunityId ? { id: { not: excludeCommunityId } } : {}),
        },
      })
    ) {
      slug = `${baseSlug || 'community'}-${counter}`;
      counter += 1;
    }

    return slug;
  }

  private async toCommunityResponse(community: any, userId?: string) {
    const currentMembership = userId ? (community.members?.[0] ?? null) : null;
    const logoUrl = community.logoFileID
      ? (await this.filesService.generateDownloadUrl(community.logoFileID, userId ?? community.createdByUserID, true))
          .downloadUrl
      : null;
    const coverImageUrl = community.coverImageFileID
      ? (
          await this.filesService.generateDownloadUrl(
            community.coverImageFileID,
            userId ?? community.createdByUserID,
            true,
          )
        ).downloadUrl
      : null;

    return plainToInstance(
      CommunityResDto,
      {
        ...community,
        memberCount: community._count?.members ?? 0,
        activeEventCount: community._count?.events ?? 0,
        currentUserMembershipStatus: currentMembership?.status ?? null,
        currentUserMembershipRole: currentMembership?.role ?? null,
        logoUrl,
        coverImageUrl,
      },
      { excludeExtraneousValues: true },
    );
  }
}
