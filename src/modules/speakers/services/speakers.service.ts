import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

import { PrismaService } from '@/database/prisma.service';
import { FilesService } from '@/modules/files/services/files.service';

import { CreateSpeakerDto } from '../dto/request/create-speaker.dto';
import { UpdateSpeakerDto } from '../dto/request/update-speaker.dto';
import { SpeakerResDto } from '../dto/response/speaker-res.dto';

@Injectable()
export class SpeakersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  async create(eventId: string, userId: string, dto: CreateSpeakerDto) {
    await this.ensureEventManageAccess(eventId, userId);

    const speaker = await this.prisma.eventSpeaker.create({
      data: {
        eventID: eventId,
        name: dto.name,
        title: dto.title,
        bio: dto.bio,
        photoFileID: dto.photoFileID,
        order: dto.order ?? 0,
      },
    });

    return this.toSpeakerResponse(speaker);
  }

  async findAll(eventId: string) {
    await this.ensureEventExists(eventId);

    const speakers = await this.prisma.eventSpeaker.findMany({
      where: { eventID: eventId },
      orderBy: { order: 'asc' },
    });

    return Promise.all(speakers.map((speaker) => this.toSpeakerResponse(speaker)));
  }

  async findOne(eventId: string, id: string) {
    const speaker = await this.prisma.eventSpeaker.findFirst({
      where: { id, eventID: eventId },
    });

    if (!speaker) {
      throw new NotFoundException('speakers.NOT_FOUND');
    }

    return this.toSpeakerResponse(speaker);
  }

  async update(eventId: string, id: string, userId: string, dto: UpdateSpeakerDto) {
    await this.ensureEventManageAccess(eventId, userId);

    const speaker = await this.prisma.eventSpeaker.findFirst({
      where: { id, eventID: eventId },
    });

    if (!speaker) {
      throw new NotFoundException('speakers.NOT_FOUND');
    }

    const updated = await this.prisma.eventSpeaker.update({
      where: { id },
      data: {
        name: dto.name,
        title: dto.title,
        bio: dto.bio,
        photoFileID: dto.photoFileID,
        order: dto.order,
      },
    });

    return this.toSpeakerResponse(updated);
  }

  async remove(eventId: string, id: string, userId: string) {
    await this.ensureEventManageAccess(eventId, userId);

    const speaker = await this.prisma.eventSpeaker.findFirst({
      where: { id, eventID: eventId },
    });

    if (!speaker) {
      throw new NotFoundException('speakers.NOT_FOUND');
    }

    await this.prisma.eventSpeaker.delete({
      where: { id },
    });

    return { message: 'Speaker deleted successfully' };
  }

  async reorder(eventId: string, userId: string, speakerOrders: { id: string; order: number }[]) {
    await this.ensureEventManageAccess(eventId, userId);

    const existingSpeakers = await this.prisma.eventSpeaker.findMany({
      where: { eventID: eventId, id: { in: speakerOrders.map(({ id }) => id) } },
      select: { id: true },
    });

    if (existingSpeakers.length !== speakerOrders.length) {
      throw new BadRequestException('speakers.MISMATCH');
    }

    await this.prisma.$transaction(
      speakerOrders.map(({ id, order }) =>
        this.prisma.eventSpeaker.update({
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
      throw new BadRequestException('speakers.EVENT_NOT_FOUND');
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
      throw new NotFoundException('speakers.MANAGE_NOT_FOUND');
    }
  }

  private async toSpeakerResponse(speaker: any): Promise<SpeakerResDto> {
    const photoUrl = speaker.photoFileID
      ? (await this.filesService.generateDownloadUrl(speaker.photoFileID, 'system', true)).downloadUrl
      : null;

    return plainToInstance(
      SpeakerResDto,
      {
        ...speaker,
        photoUrl,
      },
      { excludeExtraneousValues: true },
    );
  }
}
