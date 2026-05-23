import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConnectionStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

import { PrismaService } from '@/database/prisma.service';
import { NotificationType } from '@/modules/notifications/enums/notification-type.enum';
import { NotificationService } from '@/modules/notifications/services/notification.service';

import { QueryConnectionsDto } from '../dto/query-connections.dto';
import { ConnectionResDto } from '../dto/response/connection-res.dto';

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async requestConnection(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('You cannot connect with yourself');
    }

    await this.ensureUserExists(targetUserId);

    const existing = await this.findExistingConnection(currentUserId, targetUserId);

    if (existing) {
      if (existing.status === ConnectionStatus.ACCEPTED) {
        throw new BadRequestException('Users are already connected');
      }

      if (existing.status === ConnectionStatus.PENDING) {
        if (existing.requesterUserID === currentUserId) {
          return this.toConnectionResponse(existing, currentUserId);
        }

        const accepted = await this.prisma.userConnection.update({
          where: { id: existing.id },
          data: { status: ConnectionStatus.ACCEPTED },
          include: this.connectionInclude(),
        });

        return this.toConnectionResponse(accepted, currentUserId);
      }

      throw new BadRequestException('A connection record already exists between these users');
    }

    const created = await this.prisma.userConnection.create({
      data: {
        requesterUserID: currentUserId,
        addresseeUserID: targetUserId,
        status: ConnectionStatus.PENDING,
      },
      include: this.connectionInclude(),
    });

    await this.notificationService.send(
      targetUserId,
      NotificationType.CONNECTION_REQUEST,
      'Yeni baglanti istegi',
      'Bir kullanici size baglanti istegi gonderdi.',
      { requesterUserID: currentUserId },
    );

    return this.toConnectionResponse(created, currentUserId);
  }

  async acceptConnection(connectionId: string, currentUserId: string) {
    const connection = await this.ensurePendingReceivedConnection(connectionId, currentUserId);

    const updated = await this.prisma.userConnection.update({
      where: { id: connection.id },
      data: { status: ConnectionStatus.ACCEPTED },
      include: this.connectionInclude(),
    });

    await this.notificationService.send(
      updated.requesterUserID,
      NotificationType.CONNECTION_ACCEPTED,
      'Baglanti istegi kabul edildi',
      'Baglanti isteginiz kabul edildi.',
      { addresseeUserID: currentUserId },
    );

    return this.toConnectionResponse(updated, currentUserId);
  }

  async rejectConnection(connectionId: string, currentUserId: string) {
    const connection = await this.ensurePendingReceivedConnection(connectionId, currentUserId);

    const updated = await this.prisma.userConnection.update({
      where: { id: connection.id },
      data: { status: ConnectionStatus.REJECTED },
      include: this.connectionInclude(),
    });

    return this.toConnectionResponse(updated, currentUserId);
  }

  async listConnections(currentUserId: string, query: QueryConnectionsDto) {
    const direction = query.direction ?? 'all';
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(direction === 'sent'
        ? { requesterUserID: currentUserId }
        : direction === 'received'
          ? { addresseeUserID: currentUserId }
          : {
              OR: [{ requesterUserID: currentUserId }, { addresseeUserID: currentUserId }],
            }),
    };

    const connections = await this.prisma.userConnection.findMany({
      where,
      include: this.connectionInclude(),
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return connections.map((connection) => this.toConnectionResponse(connection, currentUserId));
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, isActive: true },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  private async ensurePendingReceivedConnection(connectionId: string, currentUserId: string) {
    const connection = await this.prisma.userConnection.findFirst({
      where: {
        id: connectionId,
        addresseeUserID: currentUserId,
        status: ConnectionStatus.PENDING,
      },
      include: this.connectionInclude(),
    });

    if (!connection) {
      throw new NotFoundException('Pending connection request not found');
    }

    return connection;
  }

  private async findExistingConnection(currentUserId: string, targetUserId: string) {
    return this.prisma.userConnection.findFirst({
      where: {
        OR: [
          { requesterUserID: currentUserId, addresseeUserID: targetUserId },
          { requesterUserID: targetUserId, addresseeUserID: currentUserId },
        ],
      },
      include: this.connectionInclude(),
    });
  }

  private connectionInclude() {
    return {
      requester: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          headline: true,
          city: true,
          profileImageID: true,
        },
      },
      addressee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          headline: true,
          city: true,
          profileImageID: true,
        },
      },
    };
  }

  private toConnectionResponse(connection: any, currentUserId: string) {
    const isRequester = connection.requesterUserID === currentUserId;
    const otherUser = isRequester ? connection.addressee : connection.requester;

    return plainToInstance(
      ConnectionResDto,
      {
        id: connection.id,
        status: connection.status,
        direction: isRequester ? 'sent' : 'received',
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
        otherUser,
      },
      { excludeExtraneousValues: true },
    );
  }
}
