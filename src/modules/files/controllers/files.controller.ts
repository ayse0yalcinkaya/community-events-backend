// Libraries
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { plainToInstance } from 'class-transformer';

// DTOs
import { QueryFilesDto } from '../dto/request/query-files.dto';
import { DownloadUrlResDto } from '../dto/response/download-url-res.dto';
import { FileResDto } from '../dto/response/file-res.dto';

// Services
import { AuthorizationService } from '../../permissions/services/authorization.service';
import { FilesService } from '../services/files.service';
// Guards/Decorators
import { ApiDelete, ApiEndpoint, ApiGetAll, ApiGetOne } from '@/common/decorators';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permission } from '@/common/decorators/permission.decorator';
import { ActionEnum } from '@/common/enums/action.enum';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';

// Interfaces/Types
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@ApiTags('Files')
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  /**
   * Upload single or multiple files (max 10 files per request)
   *
   * @route POST /api/files/upload
   * @access Protected - Requires JWT authentication
   * @permission FILES.CREATE
   * @ratelimit 20 requests per hour per user
   *
   * @param files - Uploaded files (multipart/form-data, field name: 'files')
   * @param user - Authenticated user from JWT
   * @returns FileResDto[] with uploaded file metadata
   *
   * @example
   * ```typescript
   * // Single file upload
   * FormData: { files: File }
   * Response: { success: true, data: [FileResDto] }
   *
   * // Multiple file upload
   * FormData: { files: [File, File, File] }
   * Response: { success: true, data: [FileResDto, FileResDto, FileResDto] }
   * ```
   *
   * @throws 400 Bad Request - File validation failed (size, MIME type, count)
   * @throws 401 Unauthorized - No JWT token provided
   * @throws 403 Forbidden - User lacks FILES.CREATE permission
   * @throws 413 Payload Too Large - File exceeds 10MB limit
   * @throws 429 Too Many Requests - Rate limit exceeded (21st upload in 1 hour)
   * @throws 503 Service Unavailable - S3 upload failed after retries
   */
  @ApiEndpoint('Dosya yükle', {
    type: FileResDto,
    consumes: 'multipart/form-data',
    status: 201,
    bodySchema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PermissionsGuard)
  @Permission('FILES', ActionEnum.CREATE)
  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'test' ? 10000 : 20,
      ttl: 3600000,
    },
  }) // 20 requests per hour (10000 in test - effectively disabled)
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files per request
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: JwtPayload,
  ): Promise<FileResDto[]> {
    // Validate files array exists
    if (!files || files.length === 0) {
      throw new BadRequestException('files.NO_FILES');
    }

    // Upload files to S3 and save metadata to database
    const uploadedFiles = await this.filesService.uploadFiles(
      files,
      user.sub, // user.sub = userID
    );

    // Transform File entities to FileResDto (exclude sensitive fields)
    const fileResDtos = uploadedFiles.map((file) =>
      plainToInstance(FileResDto, file, {
        excludeExtraneousValues: true, // Only include @Expose() fields
      }),
    );

    return fileResDtos;
  }

  /**
   * List files with pagination, filtering, and sorting
   *
   * @route GET /api/files
   * @access Protected - Requires JWT authentication
   * @permission NO PermissionsGuard - Access control handled in service
   *
   * @param queryDto - Query parameters (page, limit, mimeType, search, sortBy, sortOrder)
   * @param user - Authenticated user from JWT
   * @returns Paginated FileResDto[] with metadata
   *
   * Access Control:
   * - Regular users: Only see own files (WHERE userID = currentUserID)
   * - Admins with FILES.VIEW_ALL: See all domain files (no userID filter)
   * - All queries: Domain isolation (WHERE domainID = currentUserDomainID)
   * - All queries: Exclude soft-deleted files (WHERE deletedAt IS NULL)
   *
   * Pagination:
   * - Default: page=1, limit=20
   * - Max limit: 100 items per page
   * - Response includes meta: { page, limit, total, totalPages }
   *
   * Filtering:
   * - mimeType: Supports wildcards (e.g., "image/*", "application/pdf")
   * - search: Case-insensitive search in originalName
   *
   * Sorting:
   * - Default: sortBy='createdAt', sortOrder='desc' (newest first)
   * - Supported fields: createdAt, filename, size, mimeType
   *
   * @example
   * ```typescript
   * // Basic list (default pagination)
   * GET /api/files
   * Response: { success: true, data: [FileResDto], meta: { page: 1, limit: 20, total: 45, totalPages: 3 } }
   *
   * // With filters
   * GET /api/files?page=2&limit=10&mimeType=image/*&search=profile&sortBy=createdAt&sortOrder=desc
   * Response: { success: true, data: [FileResDto], meta: { page: 2, limit: 10, total: 25, totalPages: 3 } }
   * ```
   *
   * @throws 400 Bad Request - Invalid query parameters (sortBy field, page/limit values)
   * @throws 401 Unauthorized - No JWT token provided
   */
  @ApiGetAll(FileResDto)
  @Get()
  @HttpCode(HttpStatus.OK)
  async listFiles(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    queryDto: QueryFilesDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{
    items: FileResDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    // Check if user has FILES.VIEW_ALL permission (admin access)
    const hasViewAllPermission = await this.authorizationService.hasPermission(user.sub, 'FILES.VIEW_ALL');

    // Get paginated files with access control
    const result = await this.filesService.listFiles(queryDto, user.sub, hasViewAllPermission);

    // Transform File entities to FileResDto (exclude sensitive fields)
    const fileResDtos = result.data.map((file) =>
      plainToInstance(FileResDto, file, {
        excludeExtraneousValues: true, // Only include @Expose() fields
      }),
    );

    // Return paginated pattern: { items, meta }
    return {
      items: fileResDtos,
      meta: result.meta,
    };
  }

  /**
   * Get file metadata by ID (with access control)
   *
   * @route GET /api/files/:id
   * @access Protected - Requires JWT authentication
   * @permission FILES.VIEW (or file owner)
   *
   * @param id - File ID (UUID)
   * @param user - Authenticated user from JWT
   * @returns FileResDto with file metadata
   *
   * @example
   * ```typescript
   * GET /api/files/550e8400-e29b-41d4-a716-446655440000
   * Response: { success: true, data: FileResDto }
   * ```
   *
   * @throws 400 Bad Request - Invalid UUID format
   * @throws 401 Unauthorized - No JWT token provided
   * @throws 403 Forbidden - User not authorized (not owner, no FILES.VIEW permission)
   * @throws 404 Not Found - File not found, wrong domain, or soft-deleted
   */
  @ApiGetOne(FileResDto, {
    params: [{ name: 'id', description: 'Dosya ID' }],
  })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @Permission('FILES', ActionEnum.VIEW)
  async getFileMetadata(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload): Promise<FileResDto> {
    // Get file metadata with access control validation
    const file = await this.filesService.getFileMetadata(
      id,
      user.sub, // user.sub = userID
      true, // User has FILES.VIEW permission (verified by PermissionsGuard)
    );

    // Transform File entity to FileResDto (exclude sensitive fields)
    const fileResDto = plainToInstance(FileResDto, file, {
      excludeExtraneousValues: true, // Only include @Expose() fields
    });

    return fileResDto;
  }

  /**
   * Generate pre-signed S3 download URL (with access control)
   *
   * @route GET /api/files/:id/download
   * @access Protected - Requires JWT authentication
   * @permission FILES.VIEW (or file owner)
   *
   * @param id - File ID (UUID)
   * @param user - Authenticated user from JWT
   * @returns DownloadUrlResDto with pre-signed URL (valid for 15 minutes)
   *
   * @example
   * ```typescript
   * GET /api/files/550e8400-e29b-41d4-a716-446655440000/download
   * Response: {
   *   success: true,
   *   data: {
   *     downloadUrl: "https://s3.amazonaws.com/...",
   *     expiresAt: "2025-11-06T12:45:00.000Z",
   *     expiresIn: 900
   *   }
   * }
   * ```
   *
   * @throws 400 Bad Request - Invalid UUID format
   * @throws 401 Unauthorized - No JWT token provided
   * @throws 403 Forbidden - User not authorized (not owner, no FILES.VIEW permission)
   * @throws 404 Not Found - File not found, wrong domain, or soft-deleted
   * @throws 503 Service Unavailable - S3 URL generation failed
   */
  @ApiEndpoint('Dosya indirme linki oluştur', {
    type: DownloadUrlResDto,
    params: [{ name: 'id', description: 'Dosya ID' }],
  })
  @Get(':id/download')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @Permission('FILES', ActionEnum.VIEW)
  async getDownloadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<DownloadUrlResDto> {
    // Generate pre-signed download URL with access control validation
    const downloadUrlDto = await this.filesService.generateDownloadUrl(
      id,
      user.sub, // user.sub = userID
      true, // User has FILES.VIEW permission (verified by PermissionsGuard)
    );

    return downloadUrlDto;
  }

  /**
   * Delete file (soft delete - sets deletedAt timestamp)
   *
   * @route DELETE /api/files/:id
   * @access Protected - Requires JWT authentication
   * @permission FILES.DELETE (or file owner)
   *
   * @param id - File ID (UUID)
   * @param user - Authenticated user from JWT
   * @returns Success message
   *
   * @example
   * ```typescript
   * DELETE /api/files/550e8400-e29b-41d4-a716-446655440000
   * Response: { success: true, message: "File deleted successfully" }
   * ```
   *
   * @throws 400 Bad Request - Invalid UUID format
   * @throws 401 Unauthorized - No JWT token provided
   * @throws 403 Forbidden - User not authorized (not owner, no FILES.DELETE permission)
   * @throws 404 Not Found - File not found, wrong domain, or already deleted
   */
  @ApiDelete({
    params: [{ name: 'id', description: 'Dosya ID' }],
  })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @Permission('FILES', ActionEnum.DELETE)
  async deleteFile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; message: string }> {
    // Soft delete file (sets deletedAt timestamp)
    await this.filesService.deleteFile(
      id,
      user.sub, // user.sub = userID
      true, // User has FILES.DELETE permission (verified by PermissionsGuard)
    );

    // Return specific message for deletion
    return {
      success: true,
      message: 'File deleted successfully',
    };
  }
}
