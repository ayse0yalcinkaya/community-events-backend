import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AttendanceStatus, EventStatus } from '@prisma/client';

import { PrismaService } from '@/database/prisma.service';

import { NotificationType } from '../enums/notification-type.enum';
import { NotificationService } from './notification.service';

@Injectable()
export class EventReminderService {
  private readonly logger = new Logger(EventReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sendEventReminders() {
    this.logger.log('Running event reminder check...');

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    try {
      const upcomingSessions = await this.prisma.eventSession.findMany({
        where: {
          startAt: {
            gte: in24Hours,
            lt: in25Hours,
          },
          event: {
            deletedAt: null,
            status: EventStatus.PUBLISHED,
          },
        },
        include: {
          event: {
            include: {
              attendances: {
                where: {
                  status: { in: [AttendanceStatus.APPROVED, AttendanceStatus.PENDING] },
                },
                select: { userID: true },
              },
            },
          },
        },
      });

      let sentCount = 0;

      for (const session of upcomingSessions) {
        const userIds = session.event.attendances.map((a) => a.userID);

        for (const userId of userIds) {
          try {
            await this.notificationService.send(
              userId,
              NotificationType.EVENT_REMINDER,
              'Etkinlik Hatirlatma',
              `"${session.event.title}" etkinligi 24 saat icinde basliyor!`,
              { eventId: session.event.id, sessionId: session.id },
            );
            sentCount++;
          } catch (error) {
            this.logger.warn(`Failed to send reminder to user ${userId}: ${error}`);
          }
        }
      }

      this.logger.log(
        `Event reminder check complete. Sent ${sentCount} reminders for ${upcomingSessions.length} sessions.`,
      );
    } catch (error) {
      this.logger.error('Event reminder cron failed', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendWeeklyEventRecommendations() {
    this.logger.log('Running weekly event recommendations...');

    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    try {
      const usersWithInterests = await this.prisma.user.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          interests: { some: {} },
        },
        select: {
          id: true,
          city: true,
          interests: {
            select: {
              interest: { select: { categoryID: true } },
            },
          },
        },
        take: 500,
      });

      let sentCount = 0;

      for (const user of usersWithInterests) {
        const categoryIds = [
          ...new Set(user.interests.map((ui) => ui.interest.categoryID).filter(Boolean)),
        ] as string[];

        const matchingEventCount = await this.prisma.event.count({
          where: {
            deletedAt: null,
            status: EventStatus.PUBLISHED,
            visibility: 'PUBLIC',
            primaryCategoryID: { in: categoryIds },
            sessions: { some: { startAt: { gte: now, lte: nextWeek } } },
          },
        });

        if (matchingEventCount > 0) {
          try {
            await this.notificationService.send(
              user.id,
              NotificationType.EVENT_RECOMMENDATION,
              'Haftalik Etkinlik Onerileri',
              `Ilgi alanlariniza uygun ${matchingEventCount} yeni etkinlik var!`,
              { matchingEventCount },
            );
            sentCount++;
          } catch (error) {
            this.logger.warn(`Failed to send recommendation to user ${user.id}: ${error}`);
          }
        }
      }

      this.logger.log(`Weekly recommendations complete. Notified ${sentCount} users.`);
    } catch (error) {
      this.logger.error('Weekly recommendation cron failed', error);
    }
  }
}
