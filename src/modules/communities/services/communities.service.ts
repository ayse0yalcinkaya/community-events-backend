import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CommunityMemberStatus, CommunityStatus, EventStatus, Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

import { PrismaService } from '@/database/prisma.service';
import { FilesService } from '@/modules/files/services/files.service';

import { CreateCommunityDto } from '../dto/create-community.dto';
import { QueryCommunitiesDto } from '../dto/query-communities.dto';
import { CommunityResDto } from '../dto/response/community-res.dto';
import { UpdateCommunityDto } from '../dto/update-community.dto';

@Injectable()
export class CommunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
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
    const currentMembership = userId ? community.members?.[0] ?? null : null;
    const logoUrl = community.logoFileID
      ? (await this.filesService.generateDownloadUrl(community.logoFileID, userId ?? community.createdByUserID, true)).downloadUrl
      : null;
    const coverImageUrl = community.coverImageFileID
      ? (await this.filesService.generateDownloadUrl(community.coverImageFileID, userId ?? community.createdByUserID, true))
          .downloadUrl
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
