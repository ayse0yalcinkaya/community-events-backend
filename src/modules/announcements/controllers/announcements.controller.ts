// Libraries
import {
  BadRequestException,
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
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { createApiResponseClass, createPaginatedApiResponseClass, ErrorApiResponseClass } from '@/common/swagger';

// DTOs
import { AnnouncementReqDto } from '../dto/request/announcement.dto';
import { UpdateAnnouncementDto } from '../dto/request/update-announcement.dto';
import { QueryAnnouncementDto } from '../dto/request/query-announcement.dto';
import { AnnouncementResDto } from '../dto/response/announcement.dto';

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
import { AnnouncementsService } from '../services/announcements.service';
@ApiTags('Announcements')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(AnnouncementReqDto, UpdateAnnouncementDto, AnnouncementResDto)
@Controller('announcements')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Permission('ANNOUNCEMENTS', ActionEnum.CREATE)
  @UseInterceptors(FileInterceptor('imageFile'))
  @ApiOperation({ summary: 'Create announcement' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        departmentID: { type: 'string', format: 'uuid', nullable: true },
        title: { type: 'string' },
        type: { type: 'integer', enum: [0, 1, 2, 3] },
        content: { type: 'string', nullable: true },
        start_date: { type: 'string', format: 'date-time', nullable: true },
        end_date: { type: 'string', format: 'date-time', nullable: true },
        scope: { type: 'integer', enum: [0, 1, 2] },
        status: { type: 'integer', enum: [0, 1] },
        imageFile: { type: 'string', format: 'binary', description: 'Optional announcement image' },
      },
    },
  })
  @ApiResponse({ status: 201, type: createApiResponseClass(AnnouncementResDto) })
  @ApiResponse({ status: 400, type: ErrorApiResponseClass, description: 'Invalid payload or file type' })
  async create(
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: AnnouncementReqDto,
    @CurrentUser() currentUser: JwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const created = await this.announcementsService.create(dto, currentUser, file);
    return plainToInstance(AnnouncementResDto, created, { excludeExtraneousValues: true });
  }

  @Get(':id')
  @Permission('ANNOUNCEMENTS', ActionEnum.VIEW)
  @ApiOperation({ summary: 'Get announcement by id' })
  @ApiParam({ name: 'id', example: '35856766-c2d4-4b10-af44-a5b49cd63c2e' })
  @ApiResponse({ status: 200, type: createApiResponseClass(AnnouncementResDto) })
  @ApiResponse({ status: 404, type: ErrorApiResponseClass, description: 'Not found' })
  async findOne(@Param('id') id: string) {
    const announcement = await this.announcementsService.findOne(id);
    return plainToInstance(AnnouncementResDto, announcement, { excludeExtraneousValues: true });
  }

  @Get()
  @Permission('ANNOUNCEMENTS', ActionEnum.VIEW)
  @ApiOperation({ summary: 'List announcements (paginated)' })
  @ApiResponse({
    status: 200,
    type: createPaginatedApiResponseClass(AnnouncementResDto),
  })
  @ApiResponse({ status: 400, type: ErrorApiResponseClass })
  async findAll(@Query(new ValidationPipe({ transform: true, whitelist: true })) query: QueryAnnouncementDto) {
    const result = await this.announcementsService.findAll(query);
    return {
      items: result.items.map((item) => plainToInstance(AnnouncementResDto, item, { excludeExtraneousValues: true })),
      count: result.count,
    };
  }

  @Patch(':id')
  @Permission('ANNOUNCEMENTS', ActionEnum.UPDATE)
  @UseInterceptors(FileInterceptor('imageFile'))
  @ApiOperation({ summary: 'Update announcement' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        departmentID: { type: 'string', format: 'uuid', nullable: true },
        title: { type: 'string' },
        type: { type: 'integer', enum: [0, 1, 2, 3] },
        content: { type: 'string', nullable: true },
        start_date: { type: 'string', format: 'date-time', nullable: true },
        end_date: { type: 'string', format: 'date-time', nullable: true },
        scope: { type: 'integer', enum: [0, 1, 2] },
        status: { type: 'integer', enum: [0, 1] },
        imageFile: { type: 'string', format: 'binary', description: 'New image to replace existing' },
      },
    },
  })
  @ApiResponse({ status: 200, type: createApiResponseClass(AnnouncementResDto) })
  @ApiResponse({ status: 404, type: ErrorApiResponseClass })
  @ApiResponse({ status: 400, type: ErrorApiResponseClass })
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateAnnouncementDto,
    @CurrentUser() currentUser: JwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const updated = await this.announcementsService.update(id, dto, currentUser, file);
    return plainToInstance(AnnouncementResDto, updated, { excludeExtraneousValues: true });
  }

  @Delete(':id')
  @Permission('ANNOUNCEMENTS', ActionEnum.DELETE)
  @ApiOperation({ summary: 'Soft delete announcement' })
  @ApiParam({ name: 'id', example: '35856766-c2d4-4b10-af44-a5b49cd63c2e' })
  @ApiResponse({
    status: 200,
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'operation.success' },
        status: { type: 'number', example: 200 },
      },
    },
  })
  @ApiResponse({ status: 404, type: ErrorApiResponseClass })
  @ApiResponse({ status: 400, type: ErrorApiResponseClass })
  async remove(@Param('id') id: string) {
    await this.announcementsService.softDelete(id);
    return { success: true };
  }

  @Get('me/list')
  @Permission('ANNOUNCEMENTS', ActionEnum.VIEW_ALL)
  @ApiOperation({ summary: 'List announcements visible to current staff' })
  @ApiResponse({
    status: 200,
    type: createPaginatedApiResponseClass(AnnouncementResDto),
  })
  @ApiResponse({ status: 400, type: ErrorApiResponseClass })
  async getMy(
    @CurrentUser() currentUser: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
  ) {
    const pageNum = Number(page);
    const limitNum = Number(limit);
    if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
      throw new BadRequestException('Invalid pagination');
    }

    const result = await this.announcementsService.getAnnouncementsForStaff(currentUser, {
      page: pageNum,
      limit: limitNum,
      search,
    });

    return {
      items: result.items.map((item) => plainToInstance(AnnouncementResDto, item, { excludeExtraneousValues: true })),
      count: result.count,
    };
  }
}
