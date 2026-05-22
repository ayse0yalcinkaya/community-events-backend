import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceStatus, AttendanceVisibility, EventStatus, EventVisibility, Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

import { PrismaService } from '@/database/prisma.service';
import type { JwtPayload } from '@/modules/auth/interfaces/jwt-payload.interface';
import { FilesService } from '@/modules/files/services/files.service';

import { CreateEventDraftDto } from '../dto/create-event-draft.dto';
import { QueryEventsDto } from '../dto/query-events.dto';
import { EventResDto } from '../dto/response/event-res.dto';
import { UpdateEventBasicDto } from '../dto/update-event-basic.dto';
import { UpdateEventDetailsDto } from '../dto/update-event-details.dto';
import { UpdateEventLocationDto } from '../dto/update-event-location.dto';
import { UpdateEventScheduleDto } from '../dto/update-event-schedule.dto';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  async createDraft(user: JwtPayload, dto: CreateEventDraftDto) {
    await this.ensureCategoryExists(dto.primaryCategoryID);

    if (dto.organizerCommunityID) {
      await this.ensureCommunityManageAccess(user.sub, dto.organizerCommunityID);
    }

    const created = await this.prisma.event.create({
      data: {
        title: dto.title,
        slug: await this.generateUniqueSlug(dto.title),
        shortDescription: dto.shortDescription,
        description: dto.description,
        organizerUserID: dto.organizerCommunityID ? null : user.sub,
        organizerCommunityID: dto.organizerCommunityID,
        primaryCategoryID: dto.primaryCategoryID,
        format: dto.format,
        visibility: dto.visibility ?? EventVisibility.PUBLIC,
        approvalMode: dto.approvalMode,
        language: dto.language,
        capacity: dto.capacity,
        isPaid: dto.isPaid ?? false,
        externalRegistrationUrl: dto.externalRegistrationUrl,
        status: EventStatus.DRAFT,
      },
      include: this.eventInclude(),
    });

    return this.toEventResponse(created);
  }

  async updateBasic(id: string, user: JwtPayload, dto: UpdateEventBasicDto) {
    const event = await this.ensureEventManageAccess(id, user.sub);

    if (dto.primaryCategoryID) {
      await this.ensureCategoryExists(dto.primaryCategoryID);
    }

    if (dto.organizerCommunityID) {
      await this.ensureCommunityManageAccess(user.sub, dto.organizerCommunityID);
    }

    const updated = await this.prisma.event.update({
      where: { id: event.id },
      data: {
        title: dto.title,
        ...(dto.title ? { slug: await this.generateUniqueSlug(dto.title, event.id) } : {}),
        shortDescription: dto.shortDescription,
        primaryCategoryID: dto.primaryCategoryID,
        organizerCommunityID: dto.organizerCommunityID ?? undefined,
        organizerUserID: dto.organizerCommunityID ? null : event.organizerUserID ?? user.sub,
      },
      include: this.eventInclude(),
    });

    return this.toEventResponse(updated);
  }

  async updateSchedule(id: string, user: JwtPayload, dto: UpdateEventScheduleDto) {
    await this.ensureEventManageAccess(id, user.sub);

    dto.sessions.forEach((session) => {
      if (session.startAt >= session.endAt) {
        throw new BadRequestException('Session end time must be after start time');
      }
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.eventSession.deleteMany({ where: { eventID: id } });
      await tx.eventSession.createMany({
        data: dto.sessions.map((session) => ({
          eventID: id,
          startAt: session.startAt,
          endAt: session.endAt,
        })),
      });
    });

    const updated = await this.prisma.event.findUniqueOrThrow({
      where: { id },
      include: this.eventInclude(),
    });

    return this.toEventResponse(updated);
  }

  async updateLocation(id: string, user: JwtPayload, dto: UpdateEventLocationDto) {
    await this.ensureEventManageAccess(id, user.sub);

    await this.prisma.eventLocation.upsert({
      where: { eventID: id },
      create: {
        eventID: id,
        venueName: dto.venueName,
        address: dto.address,
        city: dto.city,
        district: dto.district,
        latitude: dto.latitude ? new Prisma.Decimal(dto.latitude) : undefined,
        longitude: dto.longitude ? new Prisma.Decimal(dto.longitude) : undefined,
        meetingUrl: dto.meetingUrl,
      },
      update: {
        venueName: dto.venueName,
        address: dto.address,
        city: dto.city,
        district: dto.district,
        latitude: dto.latitude ? new Prisma.Decimal(dto.latitude) : null,
        longitude: dto.longitude ? new Prisma.Decimal(dto.longitude) : null,
        meetingUrl: dto.meetingUrl,
      },
    });

    const updated = await this.prisma.event.findUniqueOrThrow({
      where: { id },
      include: this.eventInclude(),
    });

    return this.toEventResponse(updated);
  }

  async updateDetails(id: string, user: JwtPayload, dto: UpdateEventDetailsDto) {
    await this.ensureEventManageAccess(id, user.sub);

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        description: dto.description,
        format: dto.format,
        visibility: dto.visibility,
        approvalMode: dto.approvalMode,
        language: dto.language,
        capacity: dto.capacity,
        isPaid: dto.isPaid,
        externalRegistrationUrl: dto.externalRegistrationUrl,
      },
      include: this.eventInclude(),
    });

    return this.toEventResponse(updated);
  }

  async publish(id: string, user: JwtPayload) {
    const event = await this.ensureEventManageAccess(id, user.sub);
    await this.validateEventPublishable(event.id);

    const published = await this.prisma.event.update({
      where: { id: event.id },
      data: {
        status: EventStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      include: this.eventInclude(),
    });

    return this.toEventResponse(published);
  }

  async updateCoverImage(eventId: string, userId: string, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Cover image file is required');
    }

    await this.ensureEventManageAccess(eventId, userId);
    const uploaded = await this.filesService.uploadFiles([file], userId);
    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: { coverImageFileID: uploaded[0].id },
      include: this.eventInclude(userId),
    });

    return this.toEventResponse(updated, userId);
  }

  async findAll(query: QueryEventsDto) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 10, 1), 50);
    const skip = (page - 1) * limit;

    const where: Prisma.EventWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : { status: EventStatus.PUBLISHED }),
      ...(query.visibility ? { visibility: query.visibility } : { visibility: EventVisibility.PUBLIC }),
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
    };

    const [items, count] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        include: this.eventInclude(),
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      items: await Promise.all(items.map((item) => this.toEventResponse(item))),
      count,
    };
  }

  async findOneBySlug(slug: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
      include: this.eventInclude(),
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return this.toEventResponse(event);
  }

  async attend(eventId: string, userId: string) {
    const event = await this.ensureJoinableEvent(eventId);

    const existingAttendance = await this.prisma.eventAttendance.findUnique({
      where: {
        eventID_userID: {
          eventID: event.id,
          userID: userId,
        },
      },
    });

    if (existingAttendance && existingAttendance.status !== AttendanceStatus.CANCELLED) {
      return this.findEventForUser(event.id, userId);
    }

    await this.prisma.eventAttendance.upsert({
      where: {
        eventID_userID: {
          eventID: event.id,
          userID: userId,
        },
      },
      create: {
        eventID: event.id,
        userID: userId,
        status: event.approvalMode === 'OPEN' ? AttendanceStatus.APPROVED : AttendanceStatus.PENDING,
        visibility: AttendanceVisibility.PUBLIC,
        approvedAt: event.approvalMode === 'OPEN' ? new Date() : null,
      },
      update: {
        status: event.approvalMode === 'OPEN' ? AttendanceStatus.APPROVED : AttendanceStatus.PENDING,
        visibility: AttendanceVisibility.PUBLIC,
        cancelledAt: null,
        approvedAt: event.approvalMode === 'OPEN' ? new Date() : null,
      },
    });

    return this.findEventForUser(event.id, userId);
  }

  async updateAttendance(eventId: string, userId: string, visibility: AttendanceVisibility) {
    await this.ensureJoinableEvent(eventId);

    await this.prisma.eventAttendance.update({
      where: {
        eventID_userID: {
          eventID: eventId,
          userID: userId,
        },
      },
      data: { visibility },
    });

    return this.findEventForUser(eventId, userId);
  }

  async leave(eventId: string, userId: string) {
    await this.ensureJoinableEvent(eventId);

    await this.prisma.eventAttendance.update({
      where: {
        eventID_userID: {
          eventID: eventId,
          userID: userId,
        },
      },
      data: {
        status: AttendanceStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    return this.findEventForUser(eventId, userId);
  }

  async bookmark(eventId: string, userId: string) {
    await this.ensureJoinableEvent(eventId);

    await this.prisma.eventBookmark.upsert({
      where: {
        eventID_userID: {
          eventID: eventId,
          userID: userId,
        },
      },
      create: {
        eventID: eventId,
        userID: userId,
      },
      update: {},
    });

    return this.findEventForUser(eventId, userId);
  }

  async unbookmark(eventId: string, userId: string) {
    await this.ensureJoinableEvent(eventId);

    await this.prisma.eventBookmark.deleteMany({
      where: {
        eventID: eventId,
        userID: userId,
      },
    });

    return this.findEventForUser(eventId, userId);
  }

  private async ensureCategoryExists(categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        status: 'ACTIVE',
      },
    });

    if (!category) {
      throw new BadRequestException('Primary category is invalid');
    }
  }

  private async ensureCommunityManageAccess(userId: string, communityId: string) {
    const community = await this.prisma.community.findFirst({
      where: {
        id: communityId,
        deletedAt: null,
        OR: [
          { createdByUserID: userId },
          {
            members: {
              some: {
                userID: userId,
                status: 'ACTIVE',
                role: { in: ['OWNER', 'ADMIN'] },
              },
            },
          },
        ],
      },
    });

    if (!community) {
      throw new BadRequestException('Community not found or not manageable by current user');
    }
  }

  private async ensureEventManageAccess(eventId: string, userId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        deletedAt: null,
        OR: [
          { organizerUserID: userId },
          {
            organizerCommunity: {
              OR: [
                { createdByUserID: userId },
                {
                  members: {
                    some: {
                      userID: userId,
                      status: 'ACTIVE',
                      role: { in: ['OWNER', 'ADMIN'] },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found or not manageable by current user');
    }

    return event;
  }

  private async validateEventPublishable(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        sessions: true,
        location: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (!event.title || !event.primaryCategoryID) {
      throw new BadRequestException('Event basic information is incomplete');
    }

    if (!event.description || event.description.trim().length < 10) {
      throw new BadRequestException('Event description is required before publish');
    }

    if (!event.sessions.length) {
      throw new BadRequestException('At least one session is required before publish');
    }

    if (event.format === 'ONLINE' && !event.location?.meetingUrl) {
      throw new BadRequestException('Online events require a meeting URL');
    }

    if ((event.format === 'PHYSICAL' || event.format === 'HYBRID') && !event.location?.city) {
      throw new BadRequestException('Physical or hybrid events require city information');
    }
  }

  private async ensureJoinableEvent(eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        deletedAt: null,
        status: EventStatus.PUBLISHED,
      },
    });

    if (!event) {
      throw new NotFoundException('Published event not found');
    }

    return event;
  }

  private async findEventForUser(eventId: string, userId?: string) {
    const event = await this.prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      include: this.eventInclude(userId),
    });

    return this.toEventResponse(event, userId);
  }

  private async generateUniqueSlug(title: string, excludeEventId?: string) {
    const baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 180);

    let slug = baseSlug || 'event';
    let counter = 1;

    while (
      await this.prisma.event.findFirst({
        where: {
          slug,
          ...(excludeEventId ? { id: { not: excludeEventId } } : {}),
        },
      })
    ) {
      slug = `${baseSlug || 'event'}-${counter}`;
      counter += 1;
    }

    return slug;
  }

  private eventInclude(userId?: string) {
    return {
      primaryCategory: true,
      organizerCommunity: true,
      location: true,
      sessions: {
        orderBy: { startAt: 'asc' as const },
      },
      _count: {
        select: {
          attendances: true,
          bookmarks: true,
        },
      },
      ...(userId
        ? {
            attendances: {
              where: { userID: userId },
              take: 1,
            },
            bookmarks: {
              where: { userID: userId },
              take: 1,
            },
          }
        : {}),
    };
  }

  private async toEventResponse(event: any, userId?: string) {
    const currentAttendance = userId ? event.attendances?.[0] ?? null : null;
    const currentBookmark = userId ? (event.bookmarks?.length ?? 0) > 0 : false;
    const coverImageUrl = event.coverImageFileID
      ? (await this.filesService.generateDownloadUrl(event.coverImageFileID, userId ?? event.organizerUserID ?? 'system', true))
          .downloadUrl
      : null;

    return plainToInstance(
      EventResDto,
      {
        ...event,
        attendeeCount: event._count?.attendances ?? 0,
        bookmarkCount: event._count?.bookmarks ?? 0,
        currentUserAttendanceStatus: currentAttendance?.status ?? null,
        currentUserAttendanceVisibility: currentAttendance?.visibility ?? null,
        isBookmarked: currentBookmark,
        coverImageUrl,
      },
      { excludeExtraneousValues: true },
    );
  }
}
