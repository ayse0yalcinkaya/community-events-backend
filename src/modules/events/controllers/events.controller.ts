import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ApiEndpoint } from '@/common/decorators';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import type { JwtPayload } from '@/modules/auth/interfaces/jwt-payload.interface';

import { CreateEventDraftDto } from '../dto/create-event-draft.dto';
import { QueryEventsDto } from '../dto/query-events.dto';
import { EventResDto } from '../dto/response/event-res.dto';
import { UpdateAttendanceDto } from '../dto/update-attendance.dto';
import { UpdateEventBasicDto } from '../dto/update-event-basic.dto';
import { UpdateEventDetailsDto } from '../dto/update-event-details.dto';
import { UpdateEventLocationDto } from '../dto/update-event-location.dto';
import { UpdateEventScheduleDto } from '../dto/update-event-schedule.dto';
import { EventsService } from '../services/events.service';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiEndpoint('Etkinlik taslagi olustur', { type: EventResDto, status: 201 })
  createDraft(
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreateEventDraftDto,
  ) {
    return this.eventsService.createDraft(user, dto);
  }

  @Patch(':id/basic')
  @UseGuards(JwtAuthGuard)
  @ApiEndpoint('Etkinlik temel bilgilerini guncelle', { type: EventResDto, params: [{ name: 'id' }] })
  updateBasic(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateEventBasicDto,
  ) {
    return this.eventsService.updateBasic(id, user, dto);
  }

  @Patch(':id/schedule')
  @UseGuards(JwtAuthGuard)
  @ApiEndpoint('Etkinlik tarih ve saat bilgilerini guncelle', { type: EventResDto, params: [{ name: 'id' }] })
  updateSchedule(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateEventScheduleDto,
  ) {
    return this.eventsService.updateSchedule(id, user, dto);
  }

  @Patch(':id/location')
  @UseGuards(JwtAuthGuard)
  @ApiEndpoint('Etkinlik konum bilgisini guncelle', { type: EventResDto, params: [{ name: 'id' }] })
  updateLocation(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateEventLocationDto,
  ) {
    return this.eventsService.updateLocation(id, user, dto);
  }

  @Patch(':id/details')
  @UseGuards(JwtAuthGuard)
  @ApiEndpoint('Etkinlik detaylarini guncelle', { type: EventResDto, params: [{ name: 'id' }] })
  updateDetails(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateEventDetailsDto,
  ) {
    return this.eventsService.updateDetails(id, user, dto);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiEndpoint('Etkinligi yayinla', { type: EventResDto, params: [{ name: 'id' }] })
  publish(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.publish(id, user);
  }

  @Public()
  @Get()
  @ApiEndpoint('Etkinlikleri listele', {
    type: EventResDto,
    isPublic: true,
    isPaginated: true,
  })
  findAll(@Query(new ValidationPipe({ transform: true, whitelist: true })) query: QueryEventsDto) {
    return this.eventsService.findAll(query);
  }

  @Public()
  @Get(':slug')
  @ApiEndpoint('Etkinlik detayini getir', { type: EventResDto, isPublic: true, params: [{ name: 'slug' }] })
  findOne(@Param('slug') slug: string) {
    return this.eventsService.findOneBySlug(slug);
  }

  @Post(':id/attend')
  @UseGuards(JwtAuthGuard)
  @ApiEndpoint('Etkinlige katil', { type: EventResDto, params: [{ name: 'id' }] })
  attend(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.attend(id, user.sub);
  }

  @Patch(':id/attendance')
  @UseGuards(JwtAuthGuard)
  @ApiEndpoint('Etkinlik katilim gorunurlugunu guncelle', { type: EventResDto, params: [{ name: 'id' }] })
  updateAttendance(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateAttendanceDto,
  ) {
    return this.eventsService.updateAttendance(id, user.sub, dto.visibility);
  }

  @Post(':id/bookmark')
  @UseGuards(JwtAuthGuard)
  @ApiEndpoint('Etkinligi kaydet', { type: EventResDto, params: [{ name: 'id' }] })
  bookmark(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.bookmark(id, user.sub);
  }

  @Post(':id/unbookmark')
  @UseGuards(JwtAuthGuard)
  @ApiEndpoint('Etkinlik kaydini kaldir', { type: EventResDto, params: [{ name: 'id' }] })
  unbookmark(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.unbookmark(id, user.sub);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  @ApiEndpoint('Etkinlikten ayril', { type: EventResDto, params: [{ name: 'id' }] })
  leave(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.leave(id, user.sub);
  }
}
