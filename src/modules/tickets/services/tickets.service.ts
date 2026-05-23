import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AttendanceStatus, AttendanceVisibility, EventStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

import { PrismaService } from '@/database/prisma.service';

import { CreateTicketDto } from '../dto/request/create-ticket.dto';
import { TicketPurchaseResDto } from '../dto/response/ticket-purchase-res.dto';
import { UpdateTicketDto } from '../dto/request/update-ticket.dto';
import { TicketResDto } from '../dto/response/ticket-res.dto';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(eventId: string, userId: string, dto: CreateTicketDto) {
    await this.ensureEventManageAccess(eventId, userId);

    const ticket = await this.prisma.eventTicket.create({
      data: {
        eventID: eventId,
        name: dto.name,
        type: dto.type as any,
        price: dto.price ? Number(dto.price) : null,
        currency: dto.currency ?? 'TRY',
        quota: dto.quota,
        available: dto.available ?? 0,
        salesStart: dto.salesStart,
        salesEnd: dto.salesEnd,
        description: dto.description,
        order: dto.order ?? 0,
      },
    });

    return this.toTicketResponse(ticket);
  }

  async findAll(eventId: string) {
    await this.ensureEventExists(eventId);

    const tickets = await this.prisma.eventTicket.findMany({
      where: { eventID: eventId },
      orderBy: { order: 'asc' },
    });

    return tickets.map((ticket) => this.toTicketResponse(ticket));
  }

  async findOne(eventId: string, id: string) {
    const ticket = await this.prisma.eventTicket.findFirst({
      where: { id, eventID: eventId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.toTicketResponse(ticket);
  }

  async update(eventId: string, id: string, userId: string, dto: UpdateTicketDto) {
    await this.ensureEventManageAccess(eventId, userId);

    const ticket = await this.prisma.eventTicket.findFirst({
      where: { id, eventID: eventId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const updated = await this.prisma.eventTicket.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type as any,
        price: dto.price ? Number(dto.price) : undefined,
        currency: dto.currency,
        quota: dto.quota,
        available: dto.available,
        salesStart: dto.salesStart,
        salesEnd: dto.salesEnd,
        description: dto.description,
        order: dto.order,
      },
    });

    return this.toTicketResponse(updated);
  }

  async purchase(eventId: string, id: string, userId: string, quantity: number) {
    const ticket = await this.prisma.eventTicket.findFirst({
      where: {
        id,
        eventID: eventId,
        event: {
          deletedAt: null,
          status: EventStatus.PUBLISHED,
        },
      },
      include: {
        event: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.salesStart && ticket.salesStart > new Date()) {
      throw new BadRequestException('Ticket sales have not started yet');
    }

    if (ticket.salesEnd && ticket.salesEnd < new Date()) {
      throw new BadRequestException('Ticket sales have ended');
    }

    if (ticket.available < quantity) {
      throw new BadRequestException('Not enough tickets available');
    }

    const totalPrice = Number(ticket.price ?? 0) * quantity;

    const purchase = await this.prisma.$transaction(async (tx) => {
      const updatedTicket = await tx.eventTicket.update({
        where: { id: ticket.id },
        data: { available: { decrement: quantity } },
      });

      if (updatedTicket.available < 0) {
        throw new BadRequestException('Not enough tickets available');
      }

      const createdPurchase = await tx.eventTicketPurchase.create({
        data: {
          ticketID: ticket.id,
          userID: userId,
          quantity,
          totalPrice,
          currency: ticket.currency ?? 'TRY',
          status: 'COMPLETED',
        },
      });

      await tx.eventAttendance.upsert({
        where: {
          eventID_userID: {
            eventID: eventId,
            userID: userId,
          },
        },
        create: {
          eventID: eventId,
          userID: userId,
          status: ticket.event.approvalMode === 'OPEN' ? AttendanceStatus.APPROVED : AttendanceStatus.PENDING,
          visibility: AttendanceVisibility.PUBLIC,
          approvedAt: ticket.event.approvalMode === 'OPEN' ? new Date() : null,
        },
        update: {
          status: ticket.event.approvalMode === 'OPEN' ? AttendanceStatus.APPROVED : AttendanceStatus.PENDING,
          visibility: AttendanceVisibility.PUBLIC,
          cancelledAt: null,
          approvedAt: ticket.event.approvalMode === 'OPEN' ? new Date() : null,
        },
      });

      return createdPurchase;
    });

    return this.toTicketPurchaseResponse(purchase);
  }

  async remove(eventId: string, id: string, userId: string) {
    await this.ensureEventManageAccess(eventId, userId);

    const ticket = await this.prisma.eventTicket.findFirst({
      where: { id, eventID: eventId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    await this.prisma.eventTicket.delete({
      where: { id },
    });

    return { message: 'Ticket deleted successfully' };
  }

  async reorder(eventId: string, userId: string, ticketOrders: { id: string; order: number }[]) {
    await this.ensureEventManageAccess(eventId, userId);

    const existingTickets = await this.prisma.eventTicket.findMany({
      where: { eventID: eventId, id: { in: ticketOrders.map(({ id }) => id) } },
      select: { id: true },
    });

    if (existingTickets.length !== ticketOrders.length) {
      throw new BadRequestException('One or more tickets do not belong to this event');
    }

    await this.prisma.$transaction(
      ticketOrders.map(({ id, order }) =>
        this.prisma.eventTicket.update({
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

  private toTicketResponse(ticket: any): TicketResDto {
    return plainToInstance(
      TicketResDto,
      {
        ...ticket,
        price: ticket.price ? Number(ticket.price) : undefined,
      },
      { excludeExtraneousValues: true },
    );
  }

  private toTicketPurchaseResponse(purchase: any): TicketPurchaseResDto {
    return plainToInstance(
      TicketPurchaseResDto,
      {
        ...purchase,
        totalPrice: Number(purchase.totalPrice),
      },
      { excludeExtraneousValues: true },
    );
  }
}
