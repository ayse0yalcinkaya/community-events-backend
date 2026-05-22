import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ApiEndpoint } from '@/common/decorators';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import type { JwtPayload } from '@/modules/auth/interfaces/jwt-payload.interface';

import { CreateCommunityDto } from '../dto/create-community.dto';
import { QueryCommunitiesDto } from '../dto/query-communities.dto';
import { CommunityResDto } from '../dto/response/community-res.dto';
import { UpdateCommunityDto } from '../dto/update-community.dto';
import { CommunitiesService } from '../services/communities.service';

@ApiTags('Communities')
@Controller('communities')
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiEndpoint('Topluluk olustur', { type: CommunityResDto, status: 201 })
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreateCommunityDto,
  ) {
    return this.communitiesService.create(user.sub, dto);
  }

  @Public()
  @Get()
  @ApiEndpoint('Topluluklari listele', { type: CommunityResDto, isPublic: true, isPaginated: true })
  findAll(@Query(new ValidationPipe({ transform: true, whitelist: true })) query: QueryCommunitiesDto) {
    return this.communitiesService.findAll(query);
  }

  @Public()
  @Get(':slug')
  @ApiEndpoint('Topluluk detayini getir', { type: CommunityResDto, isPublic: true, params: [{ name: 'slug' }] })
  findOne(@Param('slug') slug: string) {
    return this.communitiesService.findOneBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiEndpoint('Toplulugu guncelle', { type: CommunityResDto, params: [{ name: 'id' }] })
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateCommunityDto,
  ) {
    return this.communitiesService.update(id, user.sub, dto);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiEndpoint('Topluluga katil', { type: CommunityResDto, params: [{ name: 'id' }] })
  join(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.communitiesService.join(id, user.sub);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  @ApiEndpoint('Topluluktan ayril', { type: CommunityResDto, params: [{ name: 'id' }] })
  leave(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.communitiesService.leave(id, user.sub);
  }

  @Public()
  @Get(':id/members')
  @ApiEndpoint('Topluluk uyelerini getir', { type: CommunityResDto, isPublic: true, params: [{ name: 'id' }] })
  getMembers(@Param('id') id: string) {
    return this.communitiesService.getMembers(id);
  }

  @Public()
  @Get(':id/events')
  @ApiEndpoint('Toplulugun etkinliklerini getir', { type: CommunityResDto, isPublic: true, params: [{ name: 'id' }] })
  getEvents(@Param('id') id: string) {
    return this.communitiesService.getEvents(id);
  }
}
