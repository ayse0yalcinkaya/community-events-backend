// Libraries
import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '@/common/decorators';

// DTOs
import { CreateSpeakerDto } from '../dto/request/create-speaker.dto';
import { UpdateSpeakerDto } from '../dto/request/update-speaker.dto';
import { SpeakerResDto } from '../dto/response/speaker-res.dto';

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

// Services
import { SpeakersService } from '../services/speakers.service';
@ApiTags('Speakers')
@Controller('events/:eventId/speakers')
export class SpeakersController {
  constructor(private readonly speakersService: SpeakersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Etkinlik konuşmacısı ekle', { type: SpeakerResDto, status: 201, params: [{ name: 'eventId' }] })
  create(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreateSpeakerDto,
  ) {
    return this.speakersService.create(eventId, user.sub, dto);
  }

  @Get()
  @ApiEndpoint('Etkinlik konuşmacılarını listele', {
    type: SpeakerResDto,
    isPaginated: false,
    params: [{ name: 'eventId' }],
  })
  findAll(@Param('eventId') eventId: string) {
    return this.speakersService.findAll(eventId);
  }

  @Get(':id')
  @ApiEndpoint('Konuşmacı detayını getir', { type: SpeakerResDto, params: [{ name: 'eventId' }, { name: 'id' }] })
  findOne(@Param('eventId') eventId: string, @Param('id') id: string) {
    return this.speakersService.findOne(eventId, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Konuşmacı bilgisini güncelle', { type: SpeakerResDto, params: [{ name: 'eventId' }, { name: 'id' }] })
  update(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateSpeakerDto,
  ) {
    return this.speakersService.update(eventId, id, user.sub, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Konuşmacıyı sil', { params: [{ name: 'eventId' }, { name: 'id' }] })
  remove(@Param('eventId') eventId: string, @Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.speakersService.remove(eventId, id, user.sub);
  }

  @Put('reorder')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('EVENTS', ActionEnum.UPDATE)
  @ApiEndpoint('Konuşmacı sıralamasını güncelle', { type: SpeakerResDto, params: [{ name: 'eventId' }] })
  reorder(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload,
    @Body() speakerOrders: { id: string; order: number }[],
  ) {
    return this.speakersService.reorder(eventId, user.sub, speakerOrders);
  }
}
