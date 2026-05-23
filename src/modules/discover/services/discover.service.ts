// Libraries
import { Injectable } from '@nestjs/common';
import { EventStatus, EventVisibility, Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

// DTOs
import { EventResDto } from '@/modules/events/dto/response/event-res.dto';
import { QueryDiscoverSearchDto } from '../dto/query-discover-search.dto';
import { DiscoverHomeResDto } from '../dto/response/discover-home-res.dto';
import { DiscoverUnifiedSearchResDto } from '../dto/response/discover-unified-search-res.dto';

// Services
import { PrismaService } from '@/database/prisma.service';
@Injectable()
export class DiscoverService {
  constructor(private readonly prisma: PrismaService) {}

  async getHome() {
    const now = new Date();

    const [
      featuredEvents,
      upcomingEvents,
      popularCategories,
      featuredCommunities,
      recommendedEvents,
      trendingCommunities,
      publishedEventCount,
      activeCommunityCount,
      rootCategoryCount,
    ] = await Promise.all([
      this.prisma.event.findMany({
        where: {
          deletedAt: null,
          status: EventStatus.PUBLISHED,
          visibility: 'PUBLIC',
        },
        include: {
          location: true,
          sessions: {
            where: { startAt: { gte: now } },
            orderBy: { startAt: 'asc' },
            take: 1,
          },
          _count: {
            select: { attendances: true },
          },
        },
        orderBy: [{ publishedAt: 'desc' }],
        take: 6,
      }),
      this.prisma.event.findMany({
        where: {
          deletedAt: null,
          status: EventStatus.PUBLISHED,
          visibility: 'PUBLIC',
          sessions: {
            some: { startAt: { gte: now } },
          },
        },
        include: {
          location: true,
          sessions: {
            where: { startAt: { gte: now } },
            orderBy: { startAt: 'asc' },
            take: 1,
          },
          _count: {
            select: { attendances: true },
          },
        },
        orderBy: [{ sessions: { _count: 'desc' } }, { publishedAt: 'desc' }],
        take: 6,
      }),
      this.prisma.category.findMany({
        where: {
          status: 'ACTIVE',
          parentID: null,
        },
        include: {
          _count: {
            select: { primaryEvents: true },
          },
        },
        orderBy: [{ primaryEvents: { _count: 'desc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
        take: 8,
      }),
      this.prisma.community.findMany({
        where: {
          deletedAt: null,
          status: 'ACTIVE',
        },
        include: {
          _count: {
            select: {
              members: true,
            },
          },
        },
        orderBy: [{ members: { _count: 'desc' } }, { createdAt: 'desc' }],
        take: 6,
      }),
      this.prisma.event.findMany({
        where: {
          deletedAt: null,
          status: EventStatus.PUBLISHED,
          visibility: 'PUBLIC',
        },
        include: {
          location: true,
          sessions: {
            where: { startAt: { gte: now } },
            orderBy: { startAt: 'asc' },
            take: 1,
          },
          _count: {
            select: { attendances: true },
          },
        },
        orderBy: [{ attendances: { _count: 'desc' } }, { publishedAt: 'desc' }],
        take: 6,
      }),
      this.prisma.community.findMany({
        where: {
          deletedAt: null,
          status: 'ACTIVE',
        },
        include: {
          _count: {
            select: {
              members: true,
              events: {
                where: {
                  deletedAt: null,
                  status: EventStatus.PUBLISHED,
                },
              },
            },
          },
        },
        orderBy: [{ events: { _count: 'desc' } }, { members: { _count: 'desc' } }, { createdAt: 'desc' }],
        take: 6,
      }),
      this.prisma.event.count({
        where: {
          deletedAt: null,
          status: EventStatus.PUBLISHED,
          visibility: 'PUBLIC',
        },
      }),
      this.prisma.community.count({
        where: {
          deletedAt: null,
          status: 'ACTIVE',
        },
      }),
      this.prisma.category.count({
        where: {
          status: 'ACTIVE',
          parentID: null,
        },
      }),
    ]);

    const mapEvent = (event: (typeof featuredEvents)[number]) => ({
      id: event.id,
      title: event.title,
      slug: event.slug,
      shortDescription: event.shortDescription,
      format: event.format,
      city: event.location?.city ?? null,
      publishedAt: event.publishedAt,
      nextSessionStartAt: event.sessions[0]?.startAt ?? null,
      attendeeCount: event._count.attendances,
    });

    const mapCommunity = (
      community: (typeof featuredCommunities)[number] & { _count?: { members: number; events?: number } },
    ) => ({
      id: community.id,
      name: community.name,
      slug: community.slug,
      shortDescription: community.shortDescription,
      city: community.city,
      memberCount: community._count?.members ?? 0,
      activeEventCount: community._count?.events ?? 0,
    });

    return plainToInstance(
      DiscoverHomeResDto,
      {
        featuredEvents: featuredEvents.map(mapEvent),
        upcomingEvents: upcomingEvents.map(mapEvent),
        popularCategories: popularCategories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          icon: category.icon,
          eventCount: category._count.primaryEvents,
        })),
        featuredCommunities: featuredCommunities.map(mapCommunity),
        recommendedEvents: recommendedEvents.map(mapEvent),
        trendingCommunities: trendingCommunities.map(mapCommunity),
        stats: {
          totalPublishedEvents: publishedEventCount,
          totalActiveCommunities: activeCommunityCount,
          totalRootCategories: rootCategoryCount,
        },
      },
      { excludeExtraneousValues: true },
    );
  }

  async search(query: QueryDiscoverSearchDto) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 10, 1), 50);
    const skip = (page - 1) * limit;

    const where: Prisma.EventWhereInput = {
      deletedAt: null,
      status: EventStatus.PUBLISHED,
      visibility: EventVisibility.PUBLIC,
      ...(query.categoryId ? { primaryCategoryID: query.categoryId } : {}),
      ...(query.format ? { format: query.format } : {}),
      ...(query.city
        ? {
            location: {
              city: {
                equals: query.city,
                mode: 'insensitive',
              },
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { shortDescription: { contains: query.q, mode: 'insensitive' } },
              { description: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            sessions: {
              some: {
                ...(query.dateFrom ? { startAt: { gte: query.dateFrom } } : {}),
                ...(query.dateTo ? { endAt: { lte: query.dateTo } } : {}),
              },
            },
          }
        : {}),
    };

    const [items, count] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
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
        },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      items: items.map((event) =>
        plainToInstance(
          EventResDto,
          {
            ...event,
            attendeeCount: event._count.attendances,
            bookmarkCount: event._count.bookmarks,
          },
          { excludeExtraneousValues: true },
        ),
      ),
      count,
      page,
      limit,
    };
  }

  async unifiedSearch(query: QueryDiscoverSearchDto) {
    const searchTerm = query.q?.trim();
    const limit = Math.min(Math.max(query.limit ?? 5, 1), 20);

    if (!searchTerm) {
      return plainToInstance(
        DiscoverUnifiedSearchResDto,
        {
          query: '',
          events: { meta: { count: 0 }, items: [] },
          communities: { meta: { count: 0 }, items: [] },
          users: { meta: { count: 0 }, items: [] },
          categories: { meta: { count: 0 }, items: [] },
        },
        { excludeExtraneousValues: true },
      );
    }

    const eventWhere: Prisma.EventWhereInput = {
      deletedAt: null,
      status: EventStatus.PUBLISHED,
      visibility: EventVisibility.PUBLIC,
      ...(query.categoryId ? { primaryCategoryID: query.categoryId } : {}),
      ...(query.format ? { format: query.format } : {}),
      ...(query.city
        ? {
            location: {
              city: {
                equals: query.city,
                mode: 'insensitive',
              },
            },
          }
        : {}),
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { shortDescription: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ],
    };

    const communityWhere: Prisma.CommunityWhereInput = {
      deletedAt: null,
      status: 'ACTIVE',
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { shortDescription: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ],
      ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
    };

    const userWhere: Prisma.UserWhereInput = {
      deletedAt: null,
      isActive: true,
      OR: [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { headline: { contains: searchTerm, mode: 'insensitive' } },
        { bio: { contains: searchTerm, mode: 'insensitive' } },
      ],
      ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
    };

    const categoryWhere: Prisma.CategoryWhereInput = {
      status: 'ACTIVE',
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ],
    };

    const [events, eventCount, communities, communityCount, users, userCount, categories, categoryCount] =
      await Promise.all([
        this.prisma.event.findMany({
          where: eventWhere,
          take: limit,
          include: {
            primaryCategory: true,
            organizerCommunity: true,
            location: true,
            sessions: { orderBy: { startAt: 'asc' } },
            _count: { select: { attendances: true, bookmarks: true } },
          },
          orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        }),
        this.prisma.event.count({ where: eventWhere }),
        this.prisma.community.findMany({
          where: communityWhere,
          take: limit,
          include: {
            _count: {
              select: {
                members: { where: { status: 'ACTIVE' } },
              },
            },
          },
          orderBy: [{ createdAt: 'desc' }],
        }),
        this.prisma.community.count({ where: communityWhere }),
        this.prisma.user.findMany({
          where: userWhere,
          take: limit,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            headline: true,
            city: true,
          },
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        }),
        this.prisma.user.count({ where: userWhere }),
        this.prisma.category.findMany({
          where: categoryWhere,
          take: limit,
          include: {
            _count: { select: { primaryEvents: true } },
          },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        }),
        this.prisma.category.count({ where: categoryWhere }),
      ]);

    return plainToInstance(
      DiscoverUnifiedSearchResDto,
      {
        query: searchTerm,
        events: {
          meta: { count: eventCount },
          items: events.map((event) =>
            plainToInstance(
              EventResDto,
              {
                ...event,
                attendeeCount: event._count.attendances,
                bookmarkCount: event._count.bookmarks,
              },
              { excludeExtraneousValues: true },
            ),
          ),
        },
        communities: {
          meta: { count: communityCount },
          items: communities.map((community) => ({
            id: community.id,
            name: community.name,
            slug: community.slug,
            shortDescription: community.shortDescription,
            city: community.city,
            memberCount: community._count.members,
          })),
        },
        users: {
          meta: { count: userCount },
          items: users,
        },
        categories: {
          meta: { count: categoryCount },
          items: categories.map((category) => ({
            id: category.id,
            name: category.name,
            slug: category.slug,
            icon: category.icon,
            eventCount: category._count.primaryEvents,
          })),
        },
      },
      { excludeExtraneousValues: true },
    );
  }

  async getPersonalizedFeed(userId?: string) {
    const now = new Date();

    // If no user, return generic home feed
    if (!userId) {
      return this.getHome();
    }

    // Get user's city and interest-based category IDs
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        city: true,
        interests: {
          select: { interest: { select: { categoryID: true } } },
        },
      },
    });

    if (!user) {
      return this.getHome();
    }

    const userCategoryIds = [
      ...new Set(user.interests.map((ui) => ui.interest.categoryID).filter(Boolean)),
    ] as string[];
    const userCity = user.city;

    // Build personalized filters
    const baseWhere: Prisma.EventWhereInput = {
      deletedAt: null,
      status: EventStatus.PUBLISHED,
      visibility: EventVisibility.PUBLIC,
    };

    const [forYouEvents, nearbyEvents, interestEvents, popularCategories, yourCommunityEvents] = await Promise.all([
      // Events matching user interests
      userCategoryIds.length > 0
        ? this.prisma.event.findMany({
            where: {
              ...baseWhere,
              primaryCategoryID: { in: userCategoryIds },
              sessions: { some: { startAt: { gte: now } } },
            },
            include: {
              location: true,
              sessions: { where: { startAt: { gte: now } }, orderBy: { startAt: 'asc' }, take: 1 },
              _count: { select: { attendances: true } },
            },
            orderBy: [{ attendances: { _count: 'desc' } }, { publishedAt: 'desc' }],
            take: 6,
          })
        : [],
      // Events in user's city
      userCity
        ? this.prisma.event.findMany({
            where: {
              ...baseWhere,
              location: { city: { equals: userCity, mode: 'insensitive' } },
              sessions: { some: { startAt: { gte: now } } },
            },
            include: {
              location: true,
              sessions: { where: { startAt: { gte: now } }, orderBy: { startAt: 'asc' }, take: 1 },
              _count: { select: { attendances: true } },
            },
            orderBy: [{ publishedAt: 'desc' }],
            take: 6,
          })
        : [],
      // Events from interests (broader: upcoming)
      this.prisma.event.findMany({
        where: {
          ...baseWhere,
          sessions: { some: { startAt: { gte: now } } },
        },
        include: {
          location: true,
          sessions: { where: { startAt: { gte: now } }, orderBy: { startAt: 'asc' }, take: 1 },
          _count: { select: { attendances: true } },
        },
        orderBy: [{ attendances: { _count: 'desc' } }, { publishedAt: 'desc' }],
        take: 6,
      }),
      // Popular categories
      this.prisma.category.findMany({
        where: { status: 'ACTIVE', parentID: null },
        include: { _count: { select: { primaryEvents: true } } },
        orderBy: [{ primaryEvents: { _count: 'desc' } }, { sortOrder: 'asc' }],
        take: 8,
      }),
      // Events from user's communities
      this.prisma.event.findMany({
        where: {
          ...baseWhere,
          sessions: { some: { startAt: { gte: now } } },
          organizerCommunity: {
            members: { some: { userID: userId, status: 'ACTIVE' } },
          },
        },
        include: {
          location: true,
          sessions: { where: { startAt: { gte: now } }, orderBy: { startAt: 'asc' }, take: 1 },
          _count: { select: { attendances: true } },
        },
        orderBy: [{ publishedAt: 'desc' }],
        take: 6,
      }),
    ]);

    const mapEvent = (event: any) => ({
      id: event.id,
      title: event.title,
      slug: event.slug,
      shortDescription: event.shortDescription,
      format: event.format,
      city: event.location?.city ?? null,
      publishedAt: event.publishedAt,
      nextSessionStartAt: event.sessions[0]?.startAt ?? null,
      attendeeCount: event._count.attendances,
    });

    return plainToInstance(
      DiscoverHomeResDto,
      {
        featuredEvents: forYouEvents.map(mapEvent),
        upcomingEvents: nearbyEvents.map(mapEvent),
        recommendedEvents: interestEvents.map(mapEvent),
        popularCategories: popularCategories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          icon: category.icon,
          eventCount: category._count.primaryEvents,
        })),
        featuredCommunities: [],
        trendingCommunities: [],
        communityEvents: yourCommunityEvents.map(mapEvent),
        stats: {
          totalPublishedEvents: 0,
          totalActiveCommunities: 0,
          totalRootCategories: popularCategories.length,
        },
      },
      { excludeExtraneousValues: true },
    );
  }
}
