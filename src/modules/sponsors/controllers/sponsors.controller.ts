import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ApiEndpoint } from '@/common/decorators';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permission } from '@/common/decorators/permission.decorator';
import { ActionEnum } from '@/common/enums/action.enum';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import type { JwtPayload } from '@/modules/auth/interfaces/jwt-payload.interface';

import { CreateSponsorDto } from '../dto/request/create-sponsor.dto';
import { UpdateSponsorDto } from '../dto/request/update-sponsor.dto';
import { SponsorResDto } from '../dto/response/sponsor-res.dto';
import { SponsorsService } from '../services/sponsors.service';

@ApiTags('Sponsors')
@Controller('events/:eventId/sponsors')
export class SponsorsController {
  constructor(private readonly sponsorsService: SponsorsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Etkinlik sponsoru ekle', { type: SponsorResDto, status: 201, params: [{ name: 'eventId' }] })
  create(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreateSponsorDto,
  ) {
    return this.sponsorsService.create(eventId, user.sub, dto);
  }

  @Get()
  @ApiEndpoint('Etkinlik sponsorlarını listele', {
    type: SponsorResDto,
    isPaginated: false,
    params: [{ name: 'eventId' }],
  })
  findAll(@Param('eventId') eventId: string) {
    return this.sponsorsService.findAll(eventId);
  }

  @Get(':id')
  @ApiEndpoint('Sponsor detayını getir', { type: SponsorResDto, params: [{ name: 'eventId' }, { name: 'id' }] })
  findOne(@Param('eventId') eventId: string, @Param('id') id: string) {
    return this.sponsorsService.findOne(eventId, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Sponsor bilgisini güncelle', { type: SponsorResDto, params: [{ name: 'eventId' }, { name: 'id' }] })
  update(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateSponsorDto,
  ) {
    return this.sponsorsService.update(eventId, id, user.sub, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Sponsoru sil', { params: [{ name: 'eventId' }, { name: 'id' }] })
  remove(@Param('eventId') eventId: string, @Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.sponsorsService.remove(eventId, id, user.sub);
  }

  @Put('reorder')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Sponsor sıralamasını güncelle', { type: SponsorResDto, params: [{ name: 'eventId' }] })
  reorder(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload,
    @Body() sponsorOrders: { id: string; order: number }[],
  ) {
    return this.sponsorsService.reorder(eventId, user.sub, sponsorOrders);
  }
}
