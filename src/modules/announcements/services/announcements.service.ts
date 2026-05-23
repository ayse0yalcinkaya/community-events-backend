// Libraries
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';

// DTOs
import { AnnouncementReqDto } from '../dto/request/announcement.dto';
import { QueryAnnouncementDto } from '../dto/request/query-announcement.dto';
import { UpdateAnnouncementDto } from '../dto/request/update-announcement.dto';

// Interfaces
import { JwtPayload } from '@/modules/auth/interfaces/jwt-payload.interface';
import { NotificationType } from '@/modules/notifications/enums/notification-type.enum';

// Enums
import { AnnouncementStatus } from '../enums/announcement.enum';

// Services
import { PrismaService } from '@/database/prisma.service';
import { FilesService } from '@/modules/files/services/files.service';
import { NotificationService } from '@/modules/notifications/services/notification.service';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  async create(dto: AnnouncementReqDto, currentUser: JwtPayload, file?: Express.Multer.File) {
    this.validateDateRange(dto.start_date, dto.end_date);

    let imageFileID: string | null = null;
    if (file) {
      const uploaded = await this.filesService.uploadFiles([file], currentUser.sub);
      imageFileID = uploaded[0]?.id ?? null;
    }

    try {
      const created = await this.prisma.announcement.create({
        data: {
          ...dto,
          imageFileID,
          createdBy: currentUser.sub,
        },
        include: { imageFile: true },
      });
      return this.mapAnnouncement(created);
    } catch (error) {
      throw new BadRequestException(
        this.i18n.t('announcement.CREATE_FAILED', { defaultValue: 'announcement.CREATE_FAILED' }),
      );
    }
  }

  async findOne(id: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, deletedAt: null },
      include: { imageFile: true },
    });
    if (!announcement) {
      throw new NotFoundException(this.i18n.t('announcement.NOT_FOUND', { defaultValue: 'announcement.NOT_FOUND' }));
    }
    return this.mapAnnouncement(announcement);
  }

  async findAll(query: QueryAnnouncementDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.type !== undefined) {
      where.type = query.type;
    }
    if (query.scope !== undefined) {
      where.scope = query.scope;
    }
    if (query.status !== undefined) {
      where.status = query.status;
    }

    // Filter by createdAt date range
    if (query.createdFrom || query.createdTo) {
      where.createdAt = {
        ...(query.createdFrom ? { gte: query.createdFrom } : {}),
        ...(query.createdTo ? { lte: query.createdTo } : {}),
      };
    }

    // Filter by updatedAt date range
    if (query.updatedFrom || query.updatedTo) {
      where.updatedAt = {
        ...(query.updatedFrom ? { gte: query.updatedFrom } : {}),
        ...(query.updatedTo ? { lte: query.updatedTo } : {}),
      };
    }

    // Sorting
    const orderBy: any = query.sortBy ? { [query.sortBy]: query.sortOrder || 'asc' } : { createdAt: 'desc' };

    try {
      const [data, total] = await Promise.all([
        this.prisma.announcement.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: { imageFile: true },
        }),
        this.prisma.announcement.count({ where }),
      ]);

      return { items: data.map((a) => this.mapAnnouncement(a)), count: total };
    } catch (error) {
      throw new BadRequestException(
        this.i18n.t('announcement.FETCH_FAILED', { defaultValue: 'announcement.FETCH_FAILED' }),
      );
    }
  }

  async findByCommunity(communityID: string, page = 1, limit = 10) {
    const now = new Date();
    const skip = (page - 1) * limit;
    const where = {
      communityID,
      deletedAt: null,
      status: AnnouncementStatus.ACTIVE,
      AND: [{ OR: [{ start_date: null }, { start_date: { lte: now } }] }, { OR: [{ end_date: null }, { end_date: { gte: now } }] }],
    };

    const [data, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ start_date: 'desc' }, { createdAt: 'desc' }],
        include: { imageFile: true },
      }),
      this.prisma.announcement.count({ where }),
    ]);

    return { items: data.map((a) => this.mapAnnouncement(a)), count: total };
  }

  async createCommunityAnnouncement(dto: { communityID: string; title: string; type: number; content?: string | null; start_date?: Date | null; end_date?: Date | null; scope?: number; status?: number }, createdBy: string) {
    this.validateDateRange(dto.start_date, dto.end_date);

    const created = await this.prisma.announcement.create({
      data: {
        communityID: dto.communityID,
        title: dto.title,
        type: dto.type,
        content: dto.content,
        start_date: dto.start_date,
        end_date: dto.end_date,
        scope: dto.scope ?? 0,
        status: dto.status ?? AnnouncementStatus.ACTIVE,
        createdBy,
      },
      include: { imageFile: true },
    });

    const members = await this.prisma.communityMember.findMany({
      where: { communityID: dto.communityID, status: 'ACTIVE' },
      select: { userID: true },
    });

    await Promise.allSettled(
      members
        .filter((member) => member.userID !== createdBy)
        .map((member) =>
          this.notificationService.send(
            member.userID,
            NotificationType.COMMUNITY_ANNOUNCEMENT,
            dto.title,
            dto.content ?? dto.title,
            { communityID: dto.communityID },
          ),
        ),
    );

    return this.mapAnnouncement(created);
  }

  async update(id: string, dto: UpdateAnnouncementDto, currentUser: JwtPayload, file?: Express.Multer.File) {
    await this.ensureExists(id);
    this.validateDateRange(dto.start_date, dto.end_date);

    let imageFileID: string | undefined;
    if (file) {
      const uploaded = await this.filesService.uploadFiles([file], currentUser.sub);
      imageFileID = uploaded[0]?.id ?? null;
    }

    try {
      const updated = await this.prisma.announcement.update({
        where: { id },
        data: { ...dto, ...(imageFileID !== undefined ? { imageFileID } : {}) },
        include: { imageFile: true },
      });
      return this.mapAnnouncement(updated);
    } catch (error) {
      throw new BadRequestException(
        this.i18n.t('announcement.UPDATE_FAILED', { defaultValue: 'announcement.UPDATE_FAILED' }),
      );
    }
  }

  async softDelete(id: string) {
    await this.ensureExists(id);
    try {
      await this.prisma.announcement.update({
        where: { id },
        data: { deletedAt: new Date(), status: AnnouncementStatus.PASSIVE },
      });
    } catch (error) {
      throw new BadRequestException(
        this.i18n.t('announcement.DELETE_FAILED', { defaultValue: 'announcement.DELETE_FAILED' }),
      );
    }
  }

  async getAnnouncementsForStaff(
    currentUser: JwtPayload,
    { page = 1, limit = 10, search }: { page?: number; limit?: number; search?: string },
  ) {
    const staff = await this.prisma.user.findFirst({
      where: { id: currentUser.sub, deletedAt: null },
    });
    if (!staff) {
      throw new NotFoundException(this.i18n.t('users.USER_NOT_FOUND', { defaultValue: 'users.USER_NOT_FOUND' }));
    }
    const now = new Date();

    const andConditions: any[] = [
      {
        OR: [{ start_date: null }, { start_date: { lte: now } }],
      },
      {
        OR: [{ end_date: null }, { end_date: { gte: now } }],
      },
    ];

    if (search) {
      andConditions.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const where: any = {
      deletedAt: null,
      status: AnnouncementStatus.ACTIVE,
      AND: andConditions,
    };

    const skip = (page - 1) * limit;

    try {
      const [data, total] = await Promise.all([
        this.prisma.announcement.findMany({
          where,
          skip,
          take: limit,
          orderBy: { start_date: 'desc' },
          include: { imageFile: true },
        }),
        this.prisma.announcement.count({ where }),
      ]);

      return { items: data.map((a) => this.mapAnnouncement(a)), count: total };
    } catch (error) {
      throw new BadRequestException(
        this.i18n.t('announcement.FETCH_FAILED', { defaultValue: 'announcement.FETCH_FAILED' }),
      );
    }
  }

  private async ensureExists(id: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, deletedAt: null },
    });
    if (!announcement) {
      throw new NotFoundException(this.i18n.t('announcement.NOT_FOUND', { defaultValue: 'announcement.NOT_FOUND' }));
    }
    return announcement;
  }

  private validateDateRange(start?: Date | null, end?: Date | null) {
    if (start && end && start > end) {
      throw new BadRequestException(
        this.i18n.t('announcement.INVALID_DATE_RANGE', {
          defaultValue: 'announcement.INVALID_DATE_RANGE',
        }),
      );
    }
  }

  private buildPublicUrl(s3Key?: string | null): string | undefined {
    if (!s3Key) return undefined;
    const endpoint = this.configService.get<string>('aws.s3.endpoint');
    const bucket = this.configService.get<string>('aws.s3.bucket');
    const region = this.configService.get<string>('aws.region') || 'us-east-1';
    if (!bucket) return undefined;

    if (endpoint) {
      return `${endpoint.replace(/\/$/, '')}/${bucket}/${s3Key}`;
    }

    return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
  }

  private mapAnnouncement<
    T extends {
      imageFile?: { s3Key?: string | null } | null;
    },
  >(announcement: T): T {
    const url = this.buildPublicUrl(announcement.imageFile?.s3Key);
    return {
      ...announcement,
      imageFile: announcement.imageFile ? { ...announcement.imageFile, url } : announcement.imageFile,
    };
  }
}
