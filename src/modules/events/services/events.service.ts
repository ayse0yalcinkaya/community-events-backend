// Libraries
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceStatus, AttendanceVisibility, EventStatus, EventVisibility, Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

// DTOs
import { CreateEventDraftDto } from '../dto/create-event-draft.dto';
import { QueryMyCalendarDto } from '../dto/query-my-calendar.dto';
import { CalendarEventResDto } from '../dto/response/calendar-event-res.dto';
import { QueryEventsDto } from '../dto/query-events.dto';
import { EventAttendanceResDto } from '../dto/response/event-attendance-res.dto';
import { EventNetworkRecommendationResDto } from '../dto/response/event-network-recommendation-res.dto';
import { EventResDto } from '../dto/response/event-res.dto';
import { EventSocialAttendeeResDto } from '../dto/response/event-social-attendee-res.dto';
import { OrganizerDashboardResDto } from '../dto/response/organizer-dashboard-res.dto';
import { UpdateEventBasicDto } from '../dto/update-event-basic.dto';
import { UpdateEventDetailsDto } from '../dto/update-event-details.dto';
import { UpdateEventLocationDto } from '../dto/update-event-location.dto';
import { UpdateEventScheduleDto } from '../dto/update-event-schedule.dto';

// Interfaces
import type { JwtPayload } from '@/modules/auth/interfaces/jwt-payload.interface';

// Services
import { PrismaService } from '@/database/prisma.service';
import { FilesService } from '@/modules/files/services/files.service';
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
        organizerUserID: dto.organizerCommunityID ? null : (event.organizerUserID ?? user.sub),
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
          title: session.title,
          description: session.description,
          speakerID: session.speakerID,
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

  async getMyEvents(userId: string) {
    const events = await this.prisma.event.findMany({
      where: {
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
      include: this.eventInclude(userId),
      orderBy: [{ updatedAt: 'desc' }],
    });

    return Promise.all(events.map((event) => this.toEventResponse(event, userId)));
  }

  async getOrganizerDashboard(userId: string) {
    const events = await this.prisma.event.findMany({
      where: {
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
      include: {
        ...this.eventInclude(userId),
        _count: {
          select: {
            attendances: true,
            bookmarks: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    const recentEvents = await Promise.all(events.slice(0, 5).map((event) => this.toEventResponse(event, userId)));

    const stats = events.reduce(
      (acc, event) => {
        acc.totalEvents += 1;
        acc.totalAttendees += event._count.attendances;
        acc.totalBookmarks += event._count.bookmarks;

        if (event.status === 'DRAFT') acc.draftEvents += 1;
        if (event.status === 'PUBLISHED') acc.publishedEvents += 1;
        if (event.status === 'CANCELLED') acc.cancelledEvents += 1;
        if (event.status === 'COMPLETED') acc.completedEvents += 1;

        return acc;
      },
      {
        totalEvents: 0,
        draftEvents: 0,
        publishedEvents: 0,
        cancelledEvents: 0,
        completedEvents: 0,
        totalAttendees: 0,
        totalBookmarks: 0,
      },
    );

    return plainToInstance(
      OrganizerDashboardResDto,
      {
        stats,
        recentEvents,
      },
      { excludeExtraneousValues: true },
    );
  }

  async getEventSalesReport(eventId: string, userId: string) {
    await this.ensureEventManageAccess(eventId, userId);

    const tickets = await this.prisma.eventTicket.findMany({
      where: { eventID: eventId },
      include: {
        purchases: {
          select: {
            id: true,
            quantity: true,
            totalPrice: true,
            currency: true,
            status: true,
            purchasedAt: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    const ticketSummaries = tickets.map((ticket) => {
      const completedPurchases = ticket.purchases.filter((p) => p.status === 'COMPLETED');
      const cancelledPurchases = ticket.purchases.filter((p) => p.status === 'CANCELLED' || p.status === 'REFUNDED');

      return {
        ticketId: ticket.id,
        ticketName: ticket.name,
        type: ticket.type,
        price: ticket.price ? Number(ticket.price) : 0,
        currency: ticket.currency,
        quota: ticket.quota,
        available: ticket.available,
        totalSold: completedPurchases.reduce((sum, p) => sum + p.quantity, 0),
        totalCancelled: cancelledPurchases.reduce((sum, p) => sum + p.quantity, 0),
        totalRevenue: completedPurchases.reduce((sum, p) => sum + Number(p.totalPrice), 0),
        purchaseCount: completedPurchases.length,
      };
    });

    return {
      eventId,
      totalRevenue: ticketSummaries.reduce((sum, t) => sum + t.totalRevenue, 0),
      totalTicketsSold: ticketSummaries.reduce((sum, t) => sum + t.totalSold, 0),
      totalTicketsCancelled: ticketSummaries.reduce((sum, t) => sum + t.totalCancelled, 0),
      currency: ticketSummaries[0]?.currency ?? 'TRY',
      tickets: ticketSummaries,
    };
  }

  async getMyCalendar(userId: string, query: QueryMyCalendarDto) {
    const attendances = await this.prisma.eventAttendance.findMany({
      where: {
        userID: userId,
        status: { in: [AttendanceStatus.APPROVED, AttendanceStatus.PENDING, AttendanceStatus.WAITLIST] },
        event: {
          deletedAt: null,
          status: EventStatus.PUBLISHED,
        },
      },
      include: {
        event: {
          include: {
            location: true,
            sessions: {
              where: {
                ...(query.dateFrom || query.dateTo
                  ? {
                      startAt: {
                        ...(query.dateFrom ? { gte: query.dateFrom } : {}),
                        ...(query.dateTo ? { lte: query.dateTo } : {}),
                      },
                    }
                  : {}),
              },
              orderBy: { startAt: 'asc' },
            },
          },
        },
      },
      orderBy: { registeredAt: 'asc' },
    });

    return attendances.flatMap(({ status, event }) =>
      event.sessions.map((session) =>
        plainToInstance(
          CalendarEventResDto,
          {
            eventID: event.id,
            slug: event.slug,
            title: event.title,
            startAt: session.startAt,
            endAt: session.endAt,
            format: event.format,
            city: event.location?.city ?? null,
            venueName: event.location?.venueName ?? null,
            meetingUrl: event.location?.meetingUrl ?? null,
            attendanceStatus: status,
          },
          { excludeExtraneousValues: true },
        ),
      ),
    );
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

  async findSimilarBySlug(slug: string) {
    const baseEvent = await this.prisma.event.findFirst({
      where: { slug, deletedAt: null, status: EventStatus.PUBLISHED },
      select: { id: true, primaryCategoryID: true, format: true, location: { select: { city: true } } },
    });

    if (!baseEvent) {
      throw new NotFoundException('Event not found');
    }

    const items = await this.prisma.event.findMany({
      where: {
        id: { not: baseEvent.id },
        deletedAt: null,
        status: EventStatus.PUBLISHED,
        visibility: EventVisibility.PUBLIC,
        OR: [
          { primaryCategoryID: baseEvent.primaryCategoryID },
          { format: baseEvent.format },
          ...(baseEvent.location?.city
            ? [{ location: { city: { equals: baseEvent.location.city, mode: 'insensitive' as const } } }]
            : []),
        ],
      },
      include: this.eventInclude(),
      take: 6,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return Promise.all(items.map((item) => this.toEventResponse(item)));
  }

  async generateCalendarInvite(eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        deletedAt: null,
        status: EventStatus.PUBLISHED,
      },
      include: {
        location: true,
        sessions: {
          orderBy: { startAt: 'asc' },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Published event not found');
    }

    if (!event.sessions.length) {
      throw new BadRequestException('Event has no sessions to export');
    }

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Community Events//Event Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    for (const session of event.sessions) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${event.id}-${session.id}@community-events`,
        `DTSTAMP:${this.toIcsDate(new Date())}`,
        `DTSTART:${this.toIcsDate(session.startAt)}`,
        `DTEND:${this.toIcsDate(session.endAt)}`,
        `SUMMARY:${this.escapeIcsText(event.title)}`,
        `DESCRIPTION:${this.escapeIcsText(event.description ?? event.shortDescription ?? event.title)}`,
        `LOCATION:${this.escapeIcsText(this.buildEventLocation(event))}`,
        'END:VEVENT',
      );
    }

    lines.push('END:VCALENDAR');

    return {
      filename: `${event.slug || event.id}.ics`,
      content: `${lines.join('\r\n')}\r\n`,
    };
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

  async getAttendances(eventId: string, userId: string, status?: AttendanceStatus) {
    await this.ensureEventManageAccess(eventId, userId);

    const attendances = await this.prisma.eventAttendance.findMany({
      where: {
        eventID: eventId,
        ...(status ? { status } : { status: { not: AttendanceStatus.CANCELLED } }),
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
      orderBy: [{ registeredAt: 'asc' }],
    });

    return attendances.map((attendance) => this.toAttendanceResponse(attendance));
  }

  async getSocialAttendees(eventId: string, userId: string) {
    await this.ensureEventNetworkingAccess(eventId, userId);

    const canManageEvent = await this.canManageEvent(eventId, userId);
    const [currentUserInterests, attendances] = await Promise.all([
      this.prisma.userInterest.findMany({
        where: { userID: userId },
        include: { interest: true },
      }),
      this.prisma.eventAttendance.findMany({
        where: {
          eventID: eventId,
          status: { in: [AttendanceStatus.APPROVED, AttendanceStatus.PENDING, AttendanceStatus.WAITLIST] },
          ...(canManageEvent
            ? {}
            : {
                OR: [
                  { visibility: AttendanceVisibility.PUBLIC },
                  { visibility: AttendanceVisibility.ATTENDEES_ONLY },
                  { userID: userId },
                ],
              }),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              headline: true,
              city: true,
              profileImageID: true,
              interests: {
                include: {
                  interest: true,
                },
              },
            },
          },
        },
        orderBy: [{ registeredAt: 'asc' }],
      }),
    ]);

    const currentInterestIds = new Set(currentUserInterests.map((item) => item.interestID));
    const candidateUserIds = attendances
      .filter((attendance) => attendance.userID !== userId)
      .map((attendance) => attendance.userID);
    const connections = candidateUserIds.length
      ? await this.prisma.userConnection.findMany({
          where: {
            OR: [
              { requesterUserID: userId, addresseeUserID: { in: candidateUserIds } },
              { addresseeUserID: userId, requesterUserID: { in: candidateUserIds } },
            ],
          },
        })
      : [];

    const connectionMap = new Map<string, string>();
    for (const connection of connections) {
      const otherUserId =
        connection.requesterUserID === userId ? connection.addresseeUserID : connection.requesterUserID;
      connectionMap.set(otherUserId, connection.status);
    }

    return attendances
      .map((attendance) => {
        const sharedInterests = attendance.user.interests
          .filter((item) => currentInterestIds.has(item.interestID))
          .map((item) => item.interest.name);

        return plainToInstance(
          EventSocialAttendeeResDto,
          {
            userID: attendance.userID,
            firstName: attendance.user.firstName,
            lastName: attendance.user.lastName,
            headline: attendance.user.headline,
            city: attendance.user.city,
            profileImageID: attendance.user.profileImageID,
            attendanceStatus: attendance.status,
            attendanceVisibility: attendance.visibility,
            connectionStatus: attendance.userID === userId ? null : (connectionMap.get(attendance.userID) ?? null),
            sharedInterestCount: sharedInterests.length,
            sharedInterests,
            isCurrentUser: attendance.userID === userId,
          },
          { excludeExtraneousValues: true },
        );
      })
      .sort((a, b) => {
        if (a.isCurrentUser) return -1;
        if (b.isCurrentUser) return 1;
        return b.sharedInterestCount - a.sharedInterestCount;
      });
  }

  async getNetworkRecommendations(eventId: string, userId: string) {
    await this.ensureEventNetworkingAccess(eventId, userId);

    const [currentUserInterests, attendances] = await Promise.all([
      this.prisma.userInterest.findMany({
        where: { userID: userId },
        include: { interest: true },
      }),
      this.prisma.eventAttendance.findMany({
        where: {
          eventID: eventId,
          status: { in: [AttendanceStatus.APPROVED, AttendanceStatus.PENDING, AttendanceStatus.WAITLIST] },
          userID: { not: userId },
          visibility: { in: [AttendanceVisibility.PUBLIC, AttendanceVisibility.ATTENDEES_ONLY] },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              headline: true,
              city: true,
              profileImageID: true,
              interests: {
                include: {
                  interest: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const currentInterestIds = new Set(currentUserInterests.map((item) => item.interestID));
    const candidateUserIds = attendances.map((attendance) => attendance.userID);
    const connections = candidateUserIds.length
      ? await this.prisma.userConnection.findMany({
          where: {
            OR: [
              { requesterUserID: userId, addresseeUserID: { in: candidateUserIds } },
              { addresseeUserID: userId, requesterUserID: { in: candidateUserIds } },
            ],
          },
        })
      : [];

    const connectionMap = new Map<string, string>();
    for (const connection of connections) {
      const otherUserId =
        connection.requesterUserID === userId ? connection.addresseeUserID : connection.requesterUserID;
      connectionMap.set(otherUserId, connection.status);
    }

    return attendances
      .map((attendance) => {
        const sharedInterests = attendance.user.interests
          .filter((item) => currentInterestIds.has(item.interestID))
          .map((item) => item.interest.name);

        return plainToInstance(
          EventNetworkRecommendationResDto,
          {
            userID: attendance.userID,
            firstName: attendance.user.firstName,
            lastName: attendance.user.lastName,
            headline: attendance.user.headline,
            city: attendance.user.city,
            profileImageID: attendance.user.profileImageID,
            attendanceStatus: attendance.status,
            attendanceVisibility: attendance.visibility,
            connectionStatus: connectionMap.get(attendance.userID) ?? null,
            sharedInterestCount: sharedInterests.length,
            sharedInterests,
          },
          { excludeExtraneousValues: true },
        );
      })
      .sort((a, b) => {
        const connectionPriority = (status?: string | null) => {
          if (!status) return 0;
          if (status === 'PENDING') return 1;
          if (status === 'ACCEPTED') return 2;
          return 3;
        };

        return a.sharedInterestCount - b.sharedInterestCount !== 0
          ? b.sharedInterestCount - a.sharedInterestCount
          : connectionPriority(a.connectionStatus) - connectionPriority(b.connectionStatus);
      });
  }

  async approveAttendance(eventId: string, attendanceId: string, userId: string) {
    await this.ensureEventManageAccess(eventId, userId);

    const attendance = await this.ensureAttendanceBelongsToEvent(eventId, attendanceId);

    if (attendance.status === AttendanceStatus.CANCELLED) {
      throw new BadRequestException('Cancelled attendances cannot be approved');
    }

    const updated = await this.prisma.eventAttendance.update({
      where: { id: attendance.id },
      data: {
        status: AttendanceStatus.APPROVED,
        approvedAt: new Date(),
        cancelledAt: null,
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
    });

    return this.toAttendanceResponse(updated);
  }

  async rejectAttendance(eventId: string, attendanceId: string, userId: string) {
    await this.ensureEventManageAccess(eventId, userId);

    const attendance = await this.ensureAttendanceBelongsToEvent(eventId, attendanceId);

    if (attendance.status === AttendanceStatus.CANCELLED) {
      throw new BadRequestException('Cancelled attendances cannot be rejected');
    }

    const updated = await this.prisma.eventAttendance.update({
      where: { id: attendance.id },
      data: {
        status: AttendanceStatus.REJECTED,
        approvedAt: null,
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
    });

    return this.toAttendanceResponse(updated);
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

  async addGalleryItem(eventId: string, userId: string, fileID: string, caption?: string, order?: number) {
    await this.ensureEventManageAccess(eventId, userId);

    const file = await this.prisma.file.findFirst({
      where: {
        id: fileID,
        userID: userId,
        deletedAt: null,
      },
    });

    if (!file) {
      throw new BadRequestException('Gallery file not found or not owned by current user');
    }

    await this.prisma.eventGallery.create({
      data: {
        eventID: eventId,
        fileID,
        caption,
        order: order ?? 0,
      },
    });

    return this.findEventForUser(eventId, userId);
  }

  async removeGalleryItem(eventId: string, userId: string, galleryId: string) {
    await this.ensureEventManageAccess(eventId, userId);

    const galleryItem = await this.prisma.eventGallery.findFirst({
      where: {
        id: galleryId,
        eventID: eventId,
      },
    });

    if (!galleryItem) {
      throw new NotFoundException('Gallery item not found for this event');
    }

    await this.prisma.eventGallery.delete({
      where: { id: galleryItem.id },
    });

    return this.findEventForUser(eventId, userId);
  }

  async reorderGallery(eventId: string, userId: string, galleryOrders: { id: string; order: number }[]) {
    await this.ensureEventManageAccess(eventId, userId);

    const uniqueGalleryIds = new Set(galleryOrders.map(({ id }) => id));

    if (uniqueGalleryIds.size !== galleryOrders.length) {
      throw new BadRequestException('Gallery item ids must be unique');
    }

    const galleryItems = await this.prisma.eventGallery.findMany({
      where: {
        eventID: eventId,
        id: { in: galleryOrders.map(({ id }) => id) },
      },
      select: { id: true },
    });

    if (galleryItems.length !== galleryOrders.length) {
      throw new BadRequestException('One or more gallery items do not belong to this event');
    }

    await this.prisma.$transaction(
      galleryOrders.map(({ id, order }) =>
        this.prisma.eventGallery.update({
          where: { id },
          data: { order },
        }),
      ),
    );

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

  private async ensureAttendanceBelongsToEvent(eventId: string, attendanceId: string) {
    const attendance = await this.prisma.eventAttendance.findFirst({
      where: {
        id: attendanceId,
        eventID: eventId,
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
    });

    if (!attendance) {
      throw new NotFoundException('Attendance not found for this event');
    }

    return attendance;
  }

  private async canManageEvent(eventId: string, userId: string) {
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
      select: { id: true },
    });

    return Boolean(event);
  }

  private async ensureEventNetworkingAccess(eventId: string, userId: string) {
    const manageableEvent = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        deletedAt: null,
        OR: [
          { organizerUserID: userId },
          {
            organizerCommunity: {
              OR: [
                { createdByUserID: userId },
                { members: { some: { userID: userId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] } } } },
              ],
            },
          },
        ],
      },
      select: { id: true },
    });

    if (manageableEvent) {
      return;
    }

    const attendance = await this.prisma.eventAttendance.findFirst({
      where: {
        eventID: eventId,
        userID: userId,
        status: { in: [AttendanceStatus.APPROVED, AttendanceStatus.PENDING, AttendanceStatus.WAITLIST] },
      },
      select: { id: true },
    });

    if (!attendance) {
      throw new NotFoundException('Event not found or not accessible for networking');
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
        tickets: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const errors: string[] = [];

    if (!event.title || !event.primaryCategoryID) {
      errors.push('Event basic information (title, category) is incomplete');
    }

    if (!event.description || event.description.trim().length < 10) {
      errors.push('Event description is required (min 10 characters)');
    }

    if (!event.sessions.length) {
      errors.push('At least one session is required');
    }

    const now = new Date();
    const futureSessions = event.sessions.filter((s) => s.startAt > now);
    if (event.sessions.length > 0 && futureSessions.length === 0) {
      errors.push('At least one session must be in the future');
    }

    if (event.format === 'ONLINE' && !event.location?.meetingUrl) {
      errors.push('Online events require a meeting URL');
    }

    if ((event.format === 'PHYSICAL' || event.format === 'HYBRID') && !event.location?.city) {
      errors.push('Physical or hybrid events require city information');
    }

    if (event.isPaid && event.tickets.length === 0) {
      errors.push('Paid events require at least one ticket type');
    }

    if (event.tickets.length > 0) {
      const hasAvailable = event.tickets.some((t) => t.available > 0 || t.quota === null);
      if (!hasAvailable) {
        errors.push('At least one ticket must have available quota');
      }
    }

    if (event.capacity != null && event.capacity <= 0) {
      errors.push('Event capacity must be a positive number');
    }

    if (errors.length > 0) {
      throw new BadRequestException({ message: 'Event cannot be published', errors });
    }
  }

  async getEventCompleteness(eventId: string, userId: string) {
    await this.ensureEventManageAccess(eventId, userId);

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        sessions: true,
        location: true,
        speakers: true,
        sponsors: true,
        gallery: true,
        tickets: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const now = new Date();

    const steps = {
      basicInfo: {
        complete: !!(event.title && event.primaryCategoryID && event.shortDescription),
        fields: {
          title: !!event.title,
          category: !!event.primaryCategoryID,
          shortDescription: !!event.shortDescription,
          format: !!event.format,
        },
      },
      schedule: {
        complete: event.sessions.length > 0 && event.sessions.some((s) => s.startAt > now),
        fields: {
          hasSessions: event.sessions.length > 0,
          hasFutureSessions: event.sessions.some((s) => s.startAt > now),
          sessionCount: event.sessions.length,
        },
      },
      location: {
        complete:
          event.format === 'ONLINE'
            ? !!event.location?.meetingUrl
            : event.format === 'HYBRID'
              ? !!(event.location?.city && event.location?.meetingUrl)
              : !!event.location?.city,
        fields: {
          hasLocation: !!event.location,
          city: event.location?.city ?? null,
          meetingUrl: !!event.location?.meetingUrl,
        },
      },
      details: {
        complete: !!(event.description && event.description.trim().length >= 10),
        fields: {
          description: !!(event.description && event.description.trim().length >= 10),
          coverImage: !!event.coverImageFileID,
        },
      },
      speakers: {
        complete: true,
        fields: {
          count: event.speakers.length,
        },
      },
      sponsors: {
        complete: true,
        fields: {
          count: event.sponsors.length,
        },
      },
      tickets: {
        complete: event.isPaid ? event.tickets.length > 0 : true,
        fields: {
          isPaid: event.isPaid,
          count: event.tickets.length,
          hasAvailable: event.tickets.some((t) => t.available > 0 || t.quota === null),
        },
      },
      gallery: {
        complete: true,
        fields: {
          count: event.gallery.length,
        },
      },
    };

    const requiredSteps = ['basicInfo', 'schedule', 'location', 'details', 'tickets'] as const;
    const completedRequired = requiredSteps.filter((s) => steps[s].complete).length;
    const allStepsComplete = requiredSteps.every((s) => steps[s].complete);

    return {
      eventId: event.id,
      status: event.status,
      canPublish: allStepsComplete,
      completionPercentage: Math.round((completedRequired / requiredSteps.length) * 100),
      steps,
    };
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

  private buildEventLocation(event: any) {
    if (event.format === 'ONLINE') {
      return event.location?.meetingUrl ?? 'Online';
    }

    const parts = [event.location?.venueName, event.location?.address, event.location?.city].filter(Boolean);
    return parts.length ? parts.join(', ') : 'TBD';
  }

  private toIcsDate(date: Date) {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');
  }

  private escapeIcsText(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  private eventInclude(userId?: string) {
    return {
      primaryCategory: true,
      organizerCommunity: true,
      location: true,
      sessions: {
        orderBy: { startAt: 'asc' as const },
        include: {
          speaker: true,
        },
      },
      speakers: {
        orderBy: { order: 'asc' as const },
      },
      sponsors: {
        orderBy: { order: 'asc' as const },
      },
      gallery: {
        orderBy: { order: 'asc' as const },
      },
      tickets: {
        orderBy: { order: 'asc' as const },
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
    const currentAttendance = userId ? (event.attendances?.[0] ?? null) : null;
    const currentBookmark = userId ? (event.bookmarks?.length ?? 0) > 0 : false;
    const coverImageUrl = event.coverImageFileID
      ? (
          await this.filesService.generateDownloadUrl(
            event.coverImageFileID,
            userId ?? event.organizerUserID ?? 'system',
            true,
          )
        ).downloadUrl
      : null;

    const speakers = await Promise.all(
      (event.speakers || []).map(async (speaker: any) => ({
        id: speaker.id,
        name: speaker.name,
        title: speaker.title,
        bio: speaker.bio,
        photoUrl: speaker.photoFileID
          ? (
              await this.filesService.generateDownloadUrl(
                speaker.photoFileID,
                userId ?? event.organizerUserID ?? 'system',
                true,
              )
            ).downloadUrl
          : null,
        order: speaker.order,
      })),
    );

    const sponsors = await Promise.all(
      (event.sponsors || []).map(async (sponsor: any) => ({
        id: sponsor.id,
        name: sponsor.name,
        logoUrl: sponsor.logoFileID
          ? (
              await this.filesService.generateDownloadUrl(
                sponsor.logoFileID,
                userId ?? event.organizerUserID ?? 'system',
                true,
              )
            ).downloadUrl
          : null,
        websiteUrl: sponsor.websiteUrl,
        tier: sponsor.tier,
        order: sponsor.order,
      })),
    );

    const gallery = await Promise.all(
      (event.gallery || []).map(async (item: any) => ({
        id: item.id,
        fileID: item.fileID,
        fileUrl: (
          await this.filesService.generateDownloadUrl(item.fileID, userId ?? event.organizerUserID ?? 'system', true)
        ).downloadUrl,
        caption: item.caption,
        order: item.order,
      })),
    );

    const tickets = (event.tickets || []).map((ticket: any) => ({
      id: ticket.id,
      name: ticket.name,
      type: ticket.type,
      price: ticket.price ? Number(ticket.price) : undefined,
      currency: ticket.currency,
      quota: ticket.quota,
      available: ticket.available,
      salesStart: ticket.salesStart,
      salesEnd: ticket.salesEnd,
      description: ticket.description,
      order: ticket.order,
    }));

    const sessions = (event.sessions || []).map((session: any) => ({
      id: session.id,
      title: session.title,
      description: session.description,
      speakerID: session.speakerID,
      speakerName: session.speaker?.name ?? null,
      startAt: session.startAt,
      endAt: session.endAt,
    }));

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
        sessions,
        speakers,
        sponsors,
        gallery,
        tickets,
      },
      { excludeExtraneousValues: true },
    );
  }

  private toAttendanceResponse(attendance: any) {
    return plainToInstance(
      EventAttendanceResDto,
      {
        ...attendance,
        firstName: attendance.user.firstName,
        lastName: attendance.user.lastName,
        profileImageID: attendance.user.profileImageID,
      },
      { excludeExtraneousValues: true },
    );
  }
}
