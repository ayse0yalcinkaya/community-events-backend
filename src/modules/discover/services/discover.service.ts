import { Injectable } from '@nestjs/common';
import { EventStatus, EventVisibility, Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

import { PrismaService } from '@/database/prisma.service';
import { EventResDto } from '@/modules/events/dto/response/event-res.dto';

import { QueryDiscoverSearchDto } from '../dto/query-discover-search.dto';
import { DiscoverHomeResDto } from '../dto/response/discover-home-res.dto';

@Injectable()
export class DiscoverService {
  constructor(private readonly prisma: PrismaService) {}

  async getHome() {
    const now = new Date();

    const [featuredEvents, upcomingEvents, popularCategories, featuredCommunities] = await Promise.all([
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
    ]);

    return plainToInstance(
      DiscoverHomeResDto,
      {
        featuredEvents: featuredEvents.map((event) => ({
          id: event.id,
          title: event.title,
          slug: event.slug,
          shortDescription: event.shortDescription,
          format: event.format,
          city: event.location?.city ?? null,
          publishedAt: event.publishedAt,
          nextSessionStartAt: event.sessions[0]?.startAt ?? null,
          attendeeCount: event._count.attendances,
        })),
        upcomingEvents: upcomingEvents.map((event) => ({
          id: event.id,
          title: event.title,
          slug: event.slug,
          shortDescription: event.shortDescription,
          format: event.format,
          city: event.location?.city ?? null,
          publishedAt: event.publishedAt,
          nextSessionStartAt: event.sessions[0]?.startAt ?? null,
          attendeeCount: event._count.attendances,
        })),
        popularCategories: popularCategories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          icon: category.icon,
          eventCount: category._count.primaryEvents,
        })),
        featuredCommunities: featuredCommunities.map((community) => ({
          id: community.id,
          name: community.name,
          slug: community.slug,
          shortDescription: community.shortDescription,
          city: community.city,
          memberCount: community._count.members,
        })),
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
      ...((query.dateFrom || query.dateTo)
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
}
