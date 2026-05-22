import { Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors, ValidationPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { ApiEndpoint } from '@/common/decorators';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permission } from '@/common/decorators/permission.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { ActionEnum } from '@/common/enums/action.enum';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
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
}
