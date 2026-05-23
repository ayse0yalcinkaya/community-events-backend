import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ApiEndpoint } from '@/common/decorators';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permission } from '@/common/decorators/permission.decorator';
import { ActionEnum } from '@/common/enums/action.enum';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import type { JwtPayload } from '@/modules/auth/interfaces/jwt-payload.interface';

import { CreateTicketDto } from '../dto/request/create-ticket.dto';
import { PurchaseTicketDto } from '../dto/request/purchase-ticket.dto';
import { UpdateTicketDto } from '../dto/request/update-ticket.dto';
import { TicketPurchaseResDto } from '../dto/response/ticket-purchase-res.dto';
import { TicketResDto } from '../dto/response/ticket-res.dto';
import { TicketsService } from '../services/tickets.service';

@ApiTags('Tickets')
@Controller('events/:eventId/tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Etkinlik bilet türü ekle', { type: TicketResDto, status: 201, params: [{ name: 'eventId' }] })
  create(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreateTicketDto,
  ) {
    return this.ticketsService.create(eventId, user.sub, dto);
  }

  @Get()
  @ApiEndpoint('Etkinlik bilet türlerini listele', {
    type: TicketResDto,
    isPaginated: false,
    params: [{ name: 'eventId' }],
  })
  findAll(@Param('eventId') eventId: string) {
    return this.ticketsService.findAll(eventId);
  }

  @Get(':id')
  @ApiEndpoint('Bilet detayını getir', { type: TicketResDto, params: [{ name: 'eventId' }, { name: 'id' }] })
  findOne(@Param('eventId') eventId: string, @Param('id') id: string) {
    return this.ticketsService.findOne(eventId, id);
  }

  @Post(':id/purchase')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.VIEW)
  @ApiEndpoint('Bilet satin al', { type: TicketPurchaseResDto, params: [{ name: 'eventId' }, { name: 'id' }], status: 201 })
  purchase(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: PurchaseTicketDto,
  ) {
    return this.ticketsService.purchase(eventId, id, user.sub, dto.quantity);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Bilet bilgisini güncelle', { type: TicketResDto, params: [{ name: 'eventId' }, { name: 'id' }] })
  update(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(eventId, id, user.sub, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Bileti sil', { params: [{ name: 'eventId' }, { name: 'id' }] })
  remove(@Param('eventId') eventId: string, @Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.ticketsService.remove(eventId, id, user.sub);
  }

  @Put('reorder')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Bilet sıralamasını güncelle', { type: TicketResDto, params: [{ name: 'eventId' }] })
  reorder(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload,
    @Body() ticketOrders: { id: string; order: number }[],
  ) {
    return this.ticketsService.reorder(eventId, user.sub, ticketOrders);
  }
}
