import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { PrismaService } from '@/database/prisma.service';
import { FilesService } from '@/modules/files/services/files.service';

import { CreateSponsorDto } from '../dto/request/create-sponsor.dto';
import { UpdateSponsorDto } from '../dto/request/update-sponsor.dto';
import { SponsorResDto } from '../dto/response/sponsor-res.dto';

@Injectable()
export class SponsorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  async create(eventId: string, userId: string, dto: CreateSponsorDto) {
    await this.ensureEventManageAccess(eventId, userId);

    const sponsor = await this.prisma.eventSponsor.create({
      data: {
        eventID: eventId,
        name: dto.name,
        logoFileID: dto.logoFileID,
        websiteUrl: dto.websiteUrl,
        tier: dto.tier,
        order: dto.order ?? 0,
      },
    });

    return this.toSponsorResponse(sponsor);
  }

  async findAll(eventId: string) {
    await this.ensureEventExists(eventId);

    const sponsors = await this.prisma.eventSponsor.findMany({
      where: { eventID: eventId },
      orderBy: { order: 'asc' },
    });

    return Promise.all(sponsors.map((sponsor) => this.toSponsorResponse(sponsor)));
  }

  async findOne(eventId: string, id: string) {
    const sponsor = await this.prisma.eventSponsor.findFirst({
      where: { id, eventID: eventId },
    });

    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    return this.toSponsorResponse(sponsor);
  }

  async update(eventId: string, id: string, userId: string, dto: UpdateSponsorDto) {
    await this.ensureEventManageAccess(eventId, userId);

    const sponsor = await this.prisma.eventSponsor.findFirst({
      where: { id, eventID: eventId },
    });

    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    const updated = await this.prisma.eventSponsor.update({
      where: { id },
      data: {
        name: dto.name,
        logoFileID: dto.logoFileID,
        websiteUrl: dto.websiteUrl,
        tier: dto.tier,
        order: dto.order,
      },
    });

    return this.toSponsorResponse(updated);
  }

  async remove(eventId: string, id: string, userId: string) {
    await this.ensureEventManageAccess(eventId, userId);

    const sponsor = await this.prisma.eventSponsor.findFirst({
      where: { id, eventID: eventId },
    });

    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    await this.prisma.eventSponsor.delete({
      where: { id },
    });

    return { message: 'Sponsor deleted successfully' };
  }

  async reorder(eventId: string, userId: string, sponsorOrders: { id: string; order: number }[]) {
    await this.ensureEventManageAccess(eventId, userId);

    const existingSponsors = await this.prisma.eventSponsor.findMany({
      where: { eventID: eventId, id: { in: sponsorOrders.map(({ id }) => id) } },
      select: { id: true },
    });

    if (existingSponsors.length !== sponsorOrders.length) {
      throw new BadRequestException('One or more sponsors do not belong to this event');
    }

    await this.prisma.$transaction(
      sponsorOrders.map(({ id, order }) =>
        this.prisma.eventSponsor.update({
          where: { id },
          data: { order },
        }),
      ),
    );

    return this.findAll(eventId);
  }

  private async ensureEventExists(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new BadRequestException('Event not found');
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
  }

  private async toSponsorResponse(sponsor: any): Promise<SponsorResDto> {
    const logoUrl = sponsor.logoFileID
      ? (await this.filesService.generateDownloadUrl(sponsor.logoFileID, 'system', true)).downloadUrl
      : null;

    return plainToInstance(
      SponsorResDto,
      {
        ...sponsor,
        logoUrl,
      },
      { excludeExtraneousValues: true },
    );
  }
}
