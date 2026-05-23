// Libraries
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiEndpoint } from '@/common/decorators';

// DTOs
import { CreateCommunityDto } from '../dto/create-community.dto';
import { CreateCommunityAnnouncementDto } from '../dto/request/create-community-announcement.dto';
import { QueryCommunityAnnouncementsDto } from '../dto/request/query-community-announcements.dto';
import { UpdateCommunityMemberRoleDto } from '../dto/request/update-community-member-role.dto';
import { QueryCommunitiesDto } from '../dto/query-communities.dto';
import { CommunityResDto } from '../dto/response/community-res.dto';
import { UpdateCommunityDto } from '../dto/update-community.dto';
import { AnnouncementResDto } from '@/modules/announcements/dto/response/announcement.dto';

// Interfaces
import type { JwtPayload } from '@/modules/auth/interfaces/jwt-payload.interface';

// Enums
import { ActionEnum } from '@/common/enums/action.enum';

// Guards
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/common/guards/optional-jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';

// Decorators
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permission } from '@/common/decorators/permission.decorator';
import { Public } from '@/common/decorators/public.decorator';

// Services
import { CommunitiesService } from '../services/communities.service';
@ApiTags('Communities')
@Controller('communities')
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('COMMUNITIES', ActionEnum.CREATE)
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('COMMUNITIES', ActionEnum.UPDATE)
  @ApiEndpoint('Toplulugu guncelle', { type: CommunityResDto, params: [{ name: 'id' }] })
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateCommunityDto,
  ) {
    return this.communitiesService.update(id, user.sub, dto);
  }

  @Patch(':id/logo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('COMMUNITIES', ActionEnum.UPDATE)
  @UseInterceptors(FileInterceptor('logo'))
  @ApiEndpoint('Topluluk logosunu guncelle', {
    type: CommunityResDto,
    params: [{ name: 'id' }],
    consumes: 'multipart/form-data',
    bodySchema: {
      type: 'object',
      properties: {
        logo: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  updateLogo(@Param('id') id: string, @CurrentUser() user: JwtPayload, @UploadedFile() file: Express.Multer.File) {
    return this.communitiesService.updateLogo(id, user.sub, file);
  }

  @Patch(':id/cover')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('COMMUNITIES', ActionEnum.UPDATE)
  @UseInterceptors(FileInterceptor('coverImage'))
  @ApiEndpoint('Topluluk kapak gorselini guncelle', {
    type: CommunityResDto,
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
  updateCover(@Param('id') id: string, @CurrentUser() user: JwtPayload, @UploadedFile() file: Express.Multer.File) {
    return this.communitiesService.updateCoverImage(id, user.sub, file);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('COMMUNITIES', ActionEnum.VIEW)
  @ApiEndpoint('Topluluga katil', { type: CommunityResDto, params: [{ name: 'id' }] })
  join(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.communitiesService.join(id, user.sub);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('COMMUNITIES', ActionEnum.VIEW)
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

  @Patch(':id/members/:memberId/role')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('COMMUNITIES', ActionEnum.UPDATE)
  @ApiEndpoint('Topluluk uyesinin rolunu guncelle', {
    type: CommunityResDto,
    params: [{ name: 'id' }, { name: 'memberId' }],
  })
  updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateCommunityMemberRoleDto,
  ) {
    return this.communitiesService.updateMemberRole(id, memberId, user.sub, dto.role);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('COMMUNITIES', ActionEnum.UPDATE)
  @ApiEndpoint('Topluluktan uyeyi cikar', { type: CommunityResDto, params: [{ name: 'id' }, { name: 'memberId' }] })
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @CurrentUser() user: JwtPayload) {
    return this.communitiesService.removeMember(id, memberId, user.sub);
  }

  @Public()
  @Get(':id/events')
  @ApiEndpoint('Toplulugun etkinliklerini getir', { type: CommunityResDto, isPublic: true, params: [{ name: 'id' }] })
  getEvents(@Param('id') id: string) {
    return this.communitiesService.getEvents(id);
  }

  @Get(':id/summary')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiEndpoint('Topluluk tab ozet bilgisini getir', { params: [{ name: 'id' }] })
  getSummary(@Param('id') id: string, @CurrentUser() user?: JwtPayload) {
    return this.communitiesService.getSummary(id, user?.sub);
  }

  @Public()
  @Get(':id/gallery')
  @ApiEndpoint('Topluluk galerisini getir', { isPublic: true, params: [{ name: 'id' }] })
  getGallery(@Param('id') id: string) {
    return this.communitiesService.getGallery(id);
  }

  @Post(':id/gallery')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('COMMUNITIES', ActionEnum.UPDATE)
  @UseInterceptors(FileInterceptor('file'))
  @ApiEndpoint('Topluluk galerisine gorsel ekle', {
    params: [{ name: 'id' }],
    status: 201,
    consumes: 'multipart/form-data',
    bodySchema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        caption: { type: 'string' },
      },
    },
  })
  addGalleryItem(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption?: string,
  ) {
    return this.communitiesService.addGalleryItem(id, user.sub, file, caption);
  }

  @Delete(':id/gallery/:galleryId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('COMMUNITIES', ActionEnum.UPDATE)
  @ApiEndpoint('Topluluk galerisinden gorsel sil', { params: [{ name: 'id' }, { name: 'galleryId' }] })
  removeGalleryItem(@Param('id') id: string, @Param('galleryId') galleryId: string, @CurrentUser() user: JwtPayload) {
    return this.communitiesService.removeGalleryItem(id, galleryId, user.sub);
  }

  @Public()
  @Get(':id/announcements')
  @ApiEndpoint('Toplulugun duyurularini getir', { type: AnnouncementResDto, isPublic: true, params: [{ name: 'id' }] })
  getAnnouncements(
    @Param('id') id: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: QueryCommunityAnnouncementsDto,
  ) {
    return this.communitiesService.getAnnouncements(id, query.page, query.limit);
  }

  @Post(':id/announcements')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permission('COMMUNITIES', ActionEnum.UPDATE)
  @ApiEndpoint('Topluluk duyurusu olustur', { type: AnnouncementResDto, params: [{ name: 'id' }], status: 201 })
  createAnnouncement(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreateCommunityAnnouncementDto,
  ) {
    return this.communitiesService.createAnnouncement(id, user.sub, dto);
  }
}
