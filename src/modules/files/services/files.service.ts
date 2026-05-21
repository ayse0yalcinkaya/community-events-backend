// Libraries
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as path from 'path';
import { randomUUID } from 'crypto';

// DTOs
import { QueryFilesDto } from '../dto/request/query-files.dto';
import { DownloadUrlResDto } from '../dto/response/download-url-res.dto';

// Services
import { PrismaService } from '../../../database/prisma.service';
import { S3Service } from './s3.service';
// Interfaces/Types
import { File } from '@prisma/client';

/**
 * FilesService Interface - Contract for file operations
 */
export interface IFilesService {
  /**
   * Upload multiple files to S3 and save metadata to database
   * @param files - Array of uploaded files from Multer
   * @param userID - User ID from JWT
   * @returns Array of File entities with metadata
   */
  uploadFiles(files: Express.Multer.File[], userID: string): Promise<File[]>;

  /**
   * Get file metadata with access control validation
   * @param fileId - File ID (UUID)
   * @param userID - User ID from JWT
   * @param hasViewPermission - Whether user has FILES.VIEW permission
   * @returns File entity
   * @throws NotFoundException if file not found or soft-deleted
   * @throws ForbiddenException if user not authorized (not owner, no permission)
   */
  getFileMetadata(fileId: string, userID: string, hasViewPermission: boolean): Promise<File>;

  /**
   * Generate pre-signed S3 download URL with access control
   * @param fileId - File ID (UUID)
   * @param userID - User ID from JWT
   * @param hasViewPermission - Whether user has FILES.VIEW permission
   * @returns DownloadUrlResDto with pre-signed URL and expiration info
   * @throws NotFoundException if file not found or soft-deleted
   * @throws ForbiddenException if user not authorized
   * @throws ServiceUnavailableException if S3 URL generation fails
   */
  generateDownloadUrl(fileId: string, userID: string, hasViewPermission: boolean): Promise<DownloadUrlResDto>;

  /**
   * Delete file (soft delete - sets deletedAt timestamp)
   * @param fileId - File ID (UUID)
   * @param userID - User ID from JWT
   * @param hasDeletePermission - Whether user has FILES.DELETE permission
   * @returns void (success)
   * @throws NotFoundException if file not found or already deleted
   * @throws ForbiddenException if user not authorized (not owner, no permission)
   */
  deleteFile(fileId: string, userID: string, hasDeletePermission: boolean): Promise<void>;

  /**
   * List files with pagination, filtering, and sorting
   * @param queryDto - Query parameters (page, limit, mimeType, search, sortBy, sortOrder)
   * @param userID - User ID from JWT
   * @param hasViewAllPermission - Whether user has FILES.VIEW_ALL permission
   * @returns Paginated files with meta information
   * @throws BadRequestException if invalid sortBy field
   */
  listFiles(
    queryDto: QueryFilesDto,
    userID: string,
    hasViewAllPermission: boolean,
  ): Promise<{
    data: File[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>;

  /**
   * Validate file size, MIME type, and extension
   * @param file - Uploaded file from Multer
   * @throws BadRequestException if validation fails
   */
  validateFile(file: Express.Multer.File): void;

  /**
   * Sanitize filename: remove special chars, prevent path traversal, max 255 chars
   * @param filename - Original filename
   * @returns Sanitized filename
   */
  sanitizeFilename(filename: string): string;
}

@Injectable()
export class FilesService implements IFilesService {
  private readonly logger = new Logger(FilesService.name);

  // File validation constants
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_FILES_PER_REQUEST = 10;
  private readonly MAX_FILENAME_LENGTH = 255;

  // MIME type whitelist (image/*, application/pdf, office docs, text/*, archives)
  private readonly ALLOWED_MIME_PATTERNS = [
    /^image\/.+$/,
    /^text\/.+$/,
    /^application\/pdf$/,
    /^application\/vnd\.openxmlformats-officedocument\..+$/,
    /^application\/msword$/,
    /^application\/vnd\.ms-excel$/,
    /^application\/vnd\.ms-powerpoint$/,
    /^application\/zip$/,
    /^application\/x-zip-compressed$/,
  ];

  // Allowed file extensions (cross-validation with MIME type)
  private readonly ALLOWED_EXTENSIONS = new Set([
    // Images
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.webp',
    '.svg',
    '.ico',
    // Documents
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    // Text
    '.txt',
    '.csv',
    '.json',
    '.xml',
    '.md',
    '.html',
    '.css',
    '.js',
    '.ts',
    // Archives
    '.zip',
  ]);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Upload multiple files to S3 and save metadata to database
   * Implements transaction safety: S3 upload → DB insert → Cleanup on failure
   */
  async uploadFiles(files: Express.Multer.File[], userID: string): Promise<File[]> {
    // Validate file count
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    if (files.length > this.MAX_FILES_PER_REQUEST) {
      throw new BadRequestException(`Maximum ${this.MAX_FILES_PER_REQUEST} files allowed per request`);
    }

    // Validate all files before uploading any (fail-fast approach)
    for (const file of files) {
      this.validateFile(file);
    }

    const uploadedFiles: {
      buffer: Buffer;
      s3Key: string;
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
    }[] = [];

    const uploadErrors: string[] = [];

    // Process files sequentially to avoid memory overflow
    for (const file of files) {
      try {
        const uniqueFilename = this.generateUniqueFilename(file.originalname);
        const s3Key = `${userID}/${uniqueFilename}`;

        // Upload to S3 (S3Service handles retry logic)
        await this.s3Service.uploadFile(file.buffer, s3Key, file.mimetype);

        uploadedFiles.push({
          buffer: file.buffer,
          s3Key,
          filename: uniqueFilename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        });

        this.logger.log(`File uploaded to S3 successfully: ${s3Key} (${this.formatBytes(file.size)})`);
      } catch (error) {
        const err = error as Error;
        const errorMsg = `Failed to upload file ${file.originalname}: ${err.message}`;
        uploadErrors.push(errorMsg);
        this.logger.error(errorMsg, err.stack);
      }
    }

    // If all uploads failed, return 503 Service Unavailable
    if (uploadedFiles.length === 0) {
      throw new ServiceUnavailableException('All file uploads failed. Please try again later.');
    }

    // Log partial success if applicable
    if (uploadErrors.length > 0) {
      this.logger.warn(
        `Partial upload success: ${uploadedFiles.length}/${files.length} files uploaded. Errors: ${uploadErrors.join('; ')}`,
      );
    }

    // Insert file metadata to database (transaction)
    try {
      const s3Bucket = process.env.S3_BUCKET || 'default-bucket';

      const createdFiles = await this.prismaService.$transaction(async (tx) => {
        const fileRecords = await Promise.all(
          uploadedFiles.map((file) =>
            tx.file.create({
              data: {
                userID,
                filename: file.filename,
                originalName: file.originalName,
                mimeType: file.mimeType,
                size: file.size,
                s3Key: file.s3Key,
                s3Bucket,
              },
            }),
          ),
        );

        return fileRecords;
      });

      this.logger.log(`File metadata saved to database: ${createdFiles.length} files`);

      return createdFiles;
    } catch (error) {
      // Compensating transaction: Cleanup S3 files on DB insert failure
      const err = error as Error;
      this.logger.error('Database insert failed, initiating S3 cleanup', err.stack);

      await this.cleanupS3Files(uploadedFiles.map((f) => f.s3Key));

      throw new InternalServerErrorException('Failed to save file metadata. Upload rolled back.');
    }
  }

  /**
   * Validate file size, MIME type, and extension
   * @throws BadRequestException if validation fails
   */
  validateFile(file: Express.Multer.File): void {
    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File ${file.originalname} exceeds maximum size of ${this.formatBytes(this.MAX_FILE_SIZE)}`,
      );
    }

    // Validate MIME type
    const mimeTypeValid = this.ALLOWED_MIME_PATTERNS.some((pattern) => pattern.test(file.mimetype));

    if (!mimeTypeValid) {
      throw new BadRequestException(`File ${file.originalname} has unsupported MIME type: ${file.mimetype}`);
    }

    // Validate file extension (cross-validation)
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (!this.ALLOWED_EXTENSIONS.has(fileExtension)) {
      throw new BadRequestException(`File ${file.originalname} has unsupported extension: ${fileExtension}`);
    }

    this.logger.debug(
      `File validation passed: ${file.originalname} (${file.mimetype}, ${this.formatBytes(file.size)})`,
    );
  }

  /**
   * Sanitize filename: remove special chars, prevent path traversal, max 255 chars
   * @param filename - Original filename
   * @returns Sanitized filename
   */
  sanitizeFilename(filename: string): string {
    // Extract file extension
    const ext = path.extname(filename);
    let baseName = path.basename(filename, ext);

    // Remove path traversal sequences
    baseName = baseName.replace(/\.\./g, '');
    baseName = baseName.replace(/\.\//g, '');
    baseName = baseName.replace(/\\/g, '');
    baseName = baseName.replace(/\//g, '');

    // Replace special characters with underscores
    baseName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Remove consecutive underscores
    baseName = baseName.replace(/_+/g, '_');

    // Trim underscores from start/end
    baseName = baseName.replace(/^_+|_+$/g, '');

    // Reconstruct filename with extension
    let sanitized = baseName + ext;

    // Enforce max filename length (255 chars)
    if (sanitized.length > this.MAX_FILENAME_LENGTH) {
      const maxBaseLength = this.MAX_FILENAME_LENGTH - ext.length;
      baseName = baseName.substring(0, maxBaseLength);
      sanitized = baseName + ext;
    }

    return sanitized;
  }

  /**
   * Generate a unique filename by appending timestamp and short UUID fragment
   * Ensures final filename respects MAX_FILENAME_LENGTH constraint
   */
  private generateUniqueFilename(originalName: string): string {
    const sanitized = this.sanitizeFilename(originalName);
    const ext = path.extname(sanitized);
    let baseName = path.basename(sanitized, ext);

    const uniqueHash = randomUUID().replace(/-/g, '').slice(0, 8);
    const uniqueSuffix = `${Date.now()}-${uniqueHash}`;
    const separator = baseName ? '-' : '';

    const maxBaseLength = Math.max(0, this.MAX_FILENAME_LENGTH - ext.length - uniqueSuffix.length - separator.length);

    if (baseName.length > maxBaseLength) {
      baseName = baseName.substring(0, maxBaseLength);
    }

    return `${baseName}${separator}${uniqueSuffix}${ext}`;
  }

  /**
   * Cleanup S3 files (compensating transaction)
   * @param s3Keys - Array of S3 keys to delete
   */
  private async cleanupS3Files(s3Keys: string[]): Promise<void> {
    const cleanupPromises = s3Keys.map(async (key) => {
      try {
        await this.s3Service.deleteFile(key);
        this.logger.log(`S3 cleanup successful: ${key}`);
      } catch (error) {
        const err = error as Error;
        this.logger.error(`S3 cleanup failed for ${key}: ${err.message}`);
      }
    });

    await Promise.all(cleanupPromises);
  }

  /**
   * Get file metadata with access control validation
   * Implements ownership check, soft-delete filtering, permission-based access
   */
  async getFileMetadata(fileId: string, userID: string, hasViewPermission: boolean): Promise<File> {
    // Query file by ID
    const file = await this.prismaService.file.findUnique({
      where: { id: fileId },
    });

    // Check: File exists
    if (!file) {
      this.logger.warn(`File not found: ${fileId} (requested by user ${userID})`);
      throw new NotFoundException('File not found');
    }

    // Check: Soft-delete filtering (exclude deleted files)
    if (file.deletedAt !== null) {
      this.logger.warn(`File access denied: soft-deleted - fileID: ${fileId}`);
      throw new NotFoundException('File not found');
    }

    // Check: Authorization (owner OR has FILES.VIEW permission)
    const isOwner = file.userID === userID;
    const isAuthorized = isOwner || hasViewPermission;

    if (!isAuthorized) {
      this.logger.warn(
        `File access denied: not authorized - fileID: ${fileId}, userID: ${userID}, isOwner: ${isOwner}, hasViewPermission: ${hasViewPermission}`,
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    // Log successful file metadata retrieval
    this.logger.log(`File metadata retrieved: fileID: ${fileId}, userID: ${userID}`);

    return file;
  }

  /**
   * Generate pre-signed S3 download URL with access control
   * Validates access via getFileMetadata(), generates pre-signed URL (15 min expiry)
   */
  async generateDownloadUrl(fileId: string, userID: string, hasViewPermission: boolean): Promise<DownloadUrlResDto> {
    // Validate file access (reuse getFileMetadata validation logic)
    const file = await this.getFileMetadata(fileId, userID, hasViewPermission);

    // Generate pre-signed S3 URL (15 minute expiry)
    try {
      const expiresIn = 900; // 15 minutes (900 seconds)
      const downloadUrl = await this.s3Service.getPresignedUrl(file.s3Key, expiresIn);

      // Calculate expiration timestamp
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      // Log pre-signed URL generation (DO NOT log URL - contains AWS credentials)
      this.logger.log(`Pre-signed URL generated: fileID: ${fileId}, userID: ${userID}, expiresAt: ${expiresAt}`);

      return {
        downloadUrl,
        expiresAt,
        expiresIn,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to generate pre-signed URL: fileID: ${fileId}, error: ${err.message}`, err.stack);
      throw new ServiceUnavailableException('Unable to generate download link. Please try again later.');
    }
  }

  /**
   * Delete file (soft delete - sets deletedAt timestamp)
   * Validates access via getFileMetadata(), sets deletedAt, does NOT delete from S3
   */
  async deleteFile(fileId: string, userID: string, hasDeletePermission: boolean): Promise<void> {
    // Validate file access (reuse getFileMetadata validation logic)
    // Note: getFileMetadata checks ownership, soft-delete, permission
    const file = await this.getFileMetadata(fileId, userID, hasDeletePermission);

    // Soft delete: Set deletedAt timestamp
    await this.prismaService.file.update({
      where: { id: fileId },
      data: { deletedAt: new Date() },
    });

    // Log deletion event (info level)
    this.logger.log(
      `File soft-deleted: fileID: ${fileId}, s3Key: ${file.s3Key}, userID: ${userID}, deletedBy: ${userID}`,
    );

    // NOTE: S3 file is NOT deleted (cleanup deferred to scheduled job - Epic 11)
    // Scheduled job will: Query files where deletedAt > 7 days → Delete from S3 → Hard delete DB record
  }

  /**
   * List files with pagination, filtering, and sorting
   * Implements access control (regular users see own files, admins with FILES.VIEW_ALL see all files)
   * Soft-delete filtering always enforced
   */
  async listFiles(
    queryDto: QueryFilesDto,
    userID: string,
    hasViewAllPermission: boolean,
  ): Promise<{
    data: File[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    // Validate sortBy field (prevent SQL injection)
    const allowedSortFields = ['createdAt', 'filename', 'size', 'mimeType'];
    if (queryDto.sortBy && !allowedSortFields.includes(queryDto.sortBy)) {
      throw new BadRequestException(`Invalid sort field. Allowed fields: ${allowedSortFields.join(', ')}`);
    }

    // Build base filters (soft-delete filtering)
    const whereConditions: any = {
      deletedAt: null, // Exclude soft-deleted files
    };

    // Access control: Regular users see only own files, admins with FILES.VIEW_ALL see all files
    if (!hasViewAllPermission) {
      whereConditions.userID = userID;
    }

    // Add mimeType filter if provided (support wildcards: "image/*" → startsWith('image/'))
    if (queryDto.mimeType) {
      if (queryDto.mimeType.endsWith('/*')) {
        // Wildcard pattern: "image/*" → mimeType starts with "image/"
        const mimePrefix = queryDto.mimeType.replace('/*', '/');
        whereConditions.mimeType = { startsWith: mimePrefix };
      } else {
        // Exact match: "application/pdf"
        whereConditions.mimeType = queryDto.mimeType;
      }
    }

    // Add search filter if provided (case-insensitive LIKE on originalName)
    if (queryDto.search) {
      whereConditions.originalName = {
        contains: queryDto.search,
        mode: 'insensitive' as const,
      };
    }

    // Filter by createdAt date range
    if (queryDto.createdFrom || queryDto.createdTo) {
      whereConditions.createdAt = {
        ...(queryDto.createdFrom ? { gte: queryDto.createdFrom } : {}),
        ...(queryDto.createdTo ? { lte: queryDto.createdTo } : {}),
      };
    }

    // Filter by updatedAt date range
    if (queryDto.updatedFrom || queryDto.updatedTo) {
      whereConditions.updatedAt = {
        ...(queryDto.updatedFrom ? { gte: queryDto.updatedFrom } : {}),
        ...(queryDto.updatedTo ? { lte: queryDto.updatedTo } : {}),
      };
    }

    // Build orderBy clause
    const orderBy = {
      [queryDto.sortBy || 'createdAt']: queryDto.sortOrder || 'desc',
    };

    // Calculate pagination
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 20;
    const skip = (page - 1) * limit;

    // Query files with pagination
    const files = await this.prismaService.file.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      include: {
        user: true,
      },
    });

    // Query total count (for meta.totalPages calculation)
    const total = await this.prismaService.file.count({
      where: whereConditions,
    });

    // Calculate totalPages
    const totalPages = Math.ceil(total / limit);

    // Log file list query (info level)
    this.logger.log(
      `File list query: userID: ${userID}, hasViewAllPermission: ${hasViewAllPermission}, page: ${page}, limit: ${limit}, total: ${total}, filters: ${JSON.stringify(whereConditions)}`,
    );

    return {
      data: files,
      meta: { page, limit, total, totalPages },
    };
  }

  /**
   * Format bytes to human-readable format (KB/MB)
   * @param bytes - File size in bytes
   * @returns Formatted string (e.g., "1.5 MB")
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
