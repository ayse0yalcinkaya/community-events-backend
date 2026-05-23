// Libraries
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  ParseArrayPipe,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiEndpoint } from '@/common/decorators';
import type { Response } from 'express';

// DTOs
import { AddEventGalleryItemDto } from '../dto/add-event-gallery-item.dto';
import { CreateEventDraftDto } from '../dto/create-event-draft.dto';
import { QueryMyCalendarDto } from '../dto/query-my-calendar.dto';
import { QueryEventAttendancesDto } from '../dto/query-event-attendances.dto';
import { QueryEventsDto } from '../dto/query-events.dto';
import { CalendarEventResDto } from '../dto/response/calendar-event-res.dto';
import { ReorderEventGalleryItemDto } from '../dto/reorder-event-gallery-item.dto';
import { EventAttendanceResDto } from '../dto/response/event-attendance-res.dto';
import { EventNetworkRecommendationResDto } from '../dto/response/event-network-recommendation-res.dto';
import { EventResDto } from '../dto/response/event-res.dto';
import { EventSocialAttendeeResDto } from '../dto/response/event-social-attendee-res.dto';
import { OrganizerDashboardResDto } from '../dto/response/organizer-dashboard-res.dto';
import { UpdateAttendanceDto } from '../dto/update-attendance.dto';
import { UpdateEventBasicDto } from '../dto/update-event-basic.dto';
import { UpdateEventDetailsDto } from '../dto/update-event-details.dto';
import { UpdateEventLocationDto } from '../dto/update-event-location.dto';
import { UpdateEventScheduleDto } from '../dto/update-event-schedule.dto';

// Interfaces
import type { JwtPayload } from '@/modules/auth/interfaces/jwt-payload.interface';

// Enums
import { ActionEnum } from '@/common/enums/action.enum';

// Guards
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';

// Decorators
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permission } from '@/common/decorators/permission.decorator';
import { Public } from '@/common/decorators/public.decorator';

// Services
import { EventsService } from '../services/events.service';
@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.CREATE)
  @ApiEndpoint('Etkinlik taslagi olustur', { type: EventResDto, status: 201 })
  createDraft(
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreateEventDraftDto,
  ) {
    return this.eventsService.createDraft(user, dto);
  }

  @Patch(':id/basic')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Etkinlik temel bilgilerini guncelle', { type: EventResDto, params: [{ name: 'id' }] })
  updateBasic(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateEventBasicDto,
  ) {
    return this.eventsService.updateBasic(id, user, dto);
  }

  @Patch(':id/schedule')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Etkinlik tarih ve saat bilgilerini guncelle', { type: EventResDto, params: [{ name: 'id' }] })
  updateSchedule(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateEventScheduleDto,
  ) {
    return this.eventsService.updateSchedule(id, user, dto);
  }

  @Patch(':id/location')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Etkinlik konum bilgisini guncelle', { type: EventResDto, params: [{ name: 'id' }] })
  updateLocation(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateEventLocationDto,
  ) {
    return this.eventsService.updateLocation(id, user, dto);
  }

  @Patch(':id/details')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Etkinlik detaylarini guncelle', { type: EventResDto, params: [{ name: 'id' }] })
  updateDetails(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateEventDetailsDto,
  ) {
    return this.eventsService.updateDetails(id, user, dto);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Etkinligi yayinla', { type: EventResDto, params: [{ name: 'id' }] })
  publish(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.publish(id, user);
  }

  @Get(':id/completeness')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.VIEW)
  @ApiEndpoint('Etkinlik wizard tamamlanma durumunu getir', { params: [{ name: 'id' }] })
  getCompleteness(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.getEventCompleteness(id, user.sub);
  }

  @Patch(':id/media')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @UseInterceptors(FileInterceptor('coverImage'))
  @ApiEndpoint('Etkinlik kapak gorselini guncelle', {
    type: EventResDto,
    params: [{ name: 'id' }],
    consumes: 'multipart/form-data',
    bodySchema: {
      type: 'object',
      properties: {
        coverImage: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  updateMedia(@Param('id') id: string, @CurrentUser() user: JwtPayload, @UploadedFile() file: Express.Multer.File) {
    return this.eventsService.updateCoverImage(id, user.sub, file);
  }

  @Get('me/list')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.VIEW)
  @ApiEndpoint('Kullanicinin yonettigi etkinlikleri listele', { type: EventResDto })
  getMyEvents(@CurrentUser() user: JwtPayload) {
    return this.eventsService.getMyEvents(user.sub);
  }

  @Get('organizer/dashboard')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.VIEW)
  @ApiEndpoint('Organizer dashboard ozetini getir', { type: OrganizerDashboardResDto })
  getOrganizerDashboard(@CurrentUser() user: JwtPayload) {
    return this.eventsService.getOrganizerDashboard(user.sub);
  }

  @Get(':id/sales-report')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.VIEW)
  @ApiEndpoint('Etkinlik bilet satis raporunu getir', { params: [{ name: 'id' }] })
  getSalesReport(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.getEventSalesReport(id, user.sub);
  }

  @Get('me/calendar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.VIEW)
  @ApiEndpoint('Kullanicinin etkinlik takvimini getir', { type: CalendarEventResDto })
  getMyCalendar(
    @CurrentUser() user: JwtPayload,
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: QueryMyCalendarDto,
  ) {
    return this.eventsService.getMyCalendar(user.sub, query);
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
  @Get(':id/calendar.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @ApiEndpoint('Etkinligi takvime eklemek icin ICS dosyasini getir', {
    isPublic: true,
    params: [{ name: 'id' }],
  })
  async downloadCalendarInvite(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const invite = await this.eventsService.generateCalendarInvite(id);
    res.setHeader('Content-Disposition', `attachment; filename="${invite.filename}"`);
    return invite.content;
  }

  @Public()
  @Get(':slug/similar')
  @ApiEndpoint('Benzer etkinlikleri getir', { type: EventResDto, isPublic: true, params: [{ name: 'slug' }] })
  findSimilar(@Param('slug') slug: string) {
    return this.eventsService.findSimilarBySlug(slug);
  }

  @Public()
  @Get(':slug')
  @ApiEndpoint('Etkinlik detayini getir', { type: EventResDto, isPublic: true, params: [{ name: 'slug' }] })
  findOne(@Param('slug') slug: string) {
    return this.eventsService.findOneBySlug(slug);
  }

  @Post(':id/attend')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.VIEW)
  @ApiEndpoint('Etkinlige katil', { type: EventResDto, params: [{ name: 'id' }] })
  attend(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.attend(id, user.sub);
  }

  @Patch(':id/attendance')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.VIEW)
  @ApiEndpoint('Etkinlik katilim gorunurlugunu guncelle', { type: EventResDto, params: [{ name: 'id' }] })
  updateAttendance(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateAttendanceDto,
  ) {
    return this.eventsService.updateAttendance(id, user.sub, dto.visibility);
  }

  @Get(':id/attendances')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Etkinlik katilimcilarini getir', { type: EventAttendanceResDto, params: [{ name: 'id' }] })
  getAttendances(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: QueryEventAttendancesDto,
  ) {
    return this.eventsService.getAttendances(id, user.sub, query.status);
  }

  @Get(':id/people')
  @UseGuards(JwtAuthGuard)
  @ApiEndpoint('Etkinlikteki kisileri sosyal gorunumle getir', {
    type: EventSocialAttendeeResDto,
    params: [{ name: 'id' }],
  })
  getSocialAttendees(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.getSocialAttendees(id, user.sub);
  }

  @Get(':id/network/recommendations')
  @UseGuards(JwtAuthGuard)
  @ApiEndpoint('Etkinlik icin tanisman gereken kisileri getir', {
    type: EventNetworkRecommendationResDto,
    params: [{ name: 'id' }],
  })
  getNetworkRecommendations(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.getNetworkRecommendations(id, user.sub);
  }

  @Patch(':id/attendances/:attendanceId/approve')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Etkinlik katilimcisini onayla', {
    type: EventAttendanceResDto,
    params: [{ name: 'id' }, { name: 'attendanceId' }],
  })
  approveAttendance(
    @Param('id') id: string,
    @Param('attendanceId') attendanceId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.approveAttendance(id, attendanceId, user.sub);
  }

  @Patch(':id/attendances/:attendanceId/reject')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Etkinlik katilimcisini reddet', {
    type: EventAttendanceResDto,
    params: [{ name: 'id' }, { name: 'attendanceId' }],
  })
  rejectAttendance(
    @Param('id') id: string,
    @Param('attendanceId') attendanceId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.rejectAttendance(id, attendanceId, user.sub);
  }

  @Post(':id/bookmark')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.VIEW)
  @ApiEndpoint('Etkinligi kaydet', { type: EventResDto, params: [{ name: 'id' }] })
  bookmark(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.bookmark(id, user.sub);
  }

  @Post(':id/unbookmark')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.VIEW)
  @ApiEndpoint('Etkinlik kaydini kaldir', { type: EventResDto, params: [{ name: 'id' }] })
  unbookmark(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.unbookmark(id, user.sub);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.VIEW)
  @ApiEndpoint('Etkinlikten ayril', { type: EventResDto, params: [{ name: 'id' }] })
  leave(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.leave(id, user.sub);
  }

  @Post(':id/gallery')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Etkinlik galerisine fotoğraf ekle', { type: EventResDto, params: [{ name: 'id' }] })
  addGalleryItem(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) body: AddEventGalleryItemDto,
  ) {
    return this.eventsService.addGalleryItem(id, user.sub, body.fileID, body.caption, body.order);
  }

  @Delete(':id/gallery/:galleryId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Etkinlik galerisinden fotoğraf sil', {
    type: EventResDto,
    params: [{ name: 'id' }, { name: 'galleryId' }],
  })
  removeGalleryItem(@Param('id') id: string, @Param('galleryId') galleryId: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.removeGalleryItem(id, user.sub, galleryId);
  }

  @Put(':id/gallery/reorder')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Etkinlik galerisi sıralamasını güncelle', { type: EventResDto, params: [{ name: 'id' }] })
  reorderGallery(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ParseArrayPipe({ items: ReorderEventGalleryItemDto })) galleryOrders: ReorderEventGalleryItemDto[],
  ) {
    return this.eventsService.reorderGallery(id, user.sub, galleryOrders);
  }
}
