// Libraries
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventStatus } from '@prisma/client';

// Services
import { PrismaService } from '@/database/prisma.service';
export interface TrendingEvent {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  city: string | null;
  attendeeCount: number;
  recentAttendeeCount: number;
  score: number;
}

export interface TrendingCommunity {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  city: string | null;
  memberCount: number;
  recentMemberCount: number;
  eventCount: number;
  score: number;
}

@Injectable()
export class TrendingService {
  private readonly logger = new Logger(TrendingService.name);

  private trendingEvents: TrendingEvent[] = [];
  private trendingCommunities: TrendingCommunity[] = [];
  private lastComputedAt: Date | null = null;

  constructor(private readonly prisma: PrismaService) {}

  getTrendingEvents(limit = 10): TrendingEvent[] {
    return this.trendingEvents.slice(0, limit);
  }

  getTrendingCommunities(limit = 10): TrendingCommunity[] {
    return this.trendingCommunities.slice(0, limit);
  }

  getLastComputedAt(): Date | null {
    return this.lastComputedAt;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async computeTrending() {
    this.logger.log('Computing trending events and communities...');

    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    try {
      await Promise.all([
        this.computeTrendingEvents(now, last7Days, last30Days),
        this.computeTrendingCommunities(now, last7Days, last30Days),
      ]);

      this.lastComputedAt = now;
      this.logger.log(
        `Trending computed: ${this.trendingEvents.length} events, ${this.trendingCommunities.length} communities`,
      );
    } catch (error) {
      this.logger.error('Failed to compute trending', error);
    }
  }

  private async computeTrendingEvents(now: Date, last7Days: Date, _last30Days: Date) {
    const events = await this.prisma.event.findMany({
      where: {
        deletedAt: null,
        status: EventStatus.PUBLISHED,
        visibility: 'PUBLIC',
        sessions: { some: { startAt: { gte: now } } },
      },
      include: {
        location: true,
        _count: { select: { attendances: true, bookmarks: true } },
        attendances: {
          where: { registeredAt: { gte: last7Days } },
          select: { id: true },
        },
      },
      take: 100,
      orderBy: { attendances: { _count: 'desc' } },
    });

    this.trendingEvents = events
      .map((event) => {
        const totalAttendees = event._count.attendances;
        const recentAttendees = event.attendances.length;
        const bookmarks = event._count.bookmarks;

        // Score: recent activity weighted more heavily
        const score = recentAttendees * 3 + totalAttendees + bookmarks * 0.5;

        return {
          id: event.id,
          title: event.title,
          slug: event.slug,
          shortDescription: event.shortDescription,
          city: event.location?.city ?? null,
          attendeeCount: totalAttendees,
          recentAttendeeCount: recentAttendees,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }

  private async computeTrendingCommunities(_now: Date, last7Days: Date, _last30Days: Date) {
    const communities = await this.prisma.community.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
        _count: {
          select: {
            members: true,
            events: {
              where: { deletedAt: null, status: EventStatus.PUBLISHED },
            },
          },
        },
        members: {
          where: { createdAt: { gte: last7Days } },
          select: { communityID: true },
        },
      },
      take: 100,
      orderBy: { members: { _count: 'desc' } },
    });

    this.trendingCommunities = communities
      .map((community) => {
        const totalMembers = community._count.members;
        const recentMembers = community.members.length;
        const eventCount = community._count.events;

        // Score: recent member growth + total community size + event activity
        const score = recentMembers * 4 + totalMembers + eventCount * 2;

        return {
          id: community.id,
          name: community.name,
          slug: community.slug,
          shortDescription: community.shortDescription,
          city: community.city,
          memberCount: totalMembers,
          recentMemberCount: recentMembers,
          eventCount,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }
}
