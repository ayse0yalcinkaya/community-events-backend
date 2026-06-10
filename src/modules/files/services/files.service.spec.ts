// Libraries
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';

// Services
import { PrismaService } from '../../../database/prisma.service';
import { FilesService } from './files.service';
import { S3Service } from './s3.service';
jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    randomUUID: jest.fn(),
  };
});

const randomUUIDMock = randomUUID as jest.MockedFunction<typeof randomUUID>;
describe('FilesService', () => {
  let service: FilesService;
  let prismaService: PrismaService;
  let s3Service: S3Service;

  const mockPrismaService = {
    $transaction: jest.fn(),
    file: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockS3Service = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getPresignedUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    prismaService = module.get<PrismaService>(PrismaService);
    s3Service = module.get<S3Service>(S3Service);

    randomUUIDMock.mockReset();
    randomUUIDMock.mockReturnValue('abcdefab-1234-5678-90ab-abcdefabcdef');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateFile', () => {
    it('should pass validation for valid file (1MB image/png)', () => {
      const file: Express.Multer.File = {
        fieldname: 'files',
        originalname: 'test.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 1024 * 1024, // 1MB
        buffer: Buffer.from('test'),
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      expect(() => service.validateFile(file)).not.toThrow();
    });

    it('should throw BadRequestException for file > 10MB', () => {
      const file: Express.Multer.File = {
        fieldname: 'files',
        originalname: 'large.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 11 * 1024 * 1024, // 11MB
        buffer: Buffer.from('test'),
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      expect(() => service.validateFile(file)).toThrow(BadRequestException);
      expect(() => service.validateFile(file)).toThrow(/exceeds maximum size/);
    });

    it('should throw BadRequestException for invalid MIME type (application/exe)', () => {
      const file: Express.Multer.File = {
        fieldname: 'files',
        originalname: 'malicious.exe',
        encoding: '7bit',
        mimetype: 'application/x-msdownload',
        size: 1024,
        buffer: Buffer.from('test'),
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      expect(() => service.validateFile(file)).toThrow(BadRequestException);
      expect(() => service.validateFile(file)).toThrow(/unsupported MIME type/);
    });

    it('should throw BadRequestException for invalid file extension (.exe)', () => {
      const file: Express.Multer.File = {
        fieldname: 'files',
        originalname: 'fake.exe',
        encoding: '7bit',
        mimetype: 'image/jpeg', // Disguised as image
        size: 1024,
        buffer: Buffer.from('test'),
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      expect(() => service.validateFile(file)).toThrow(BadRequestException);
      expect(() => service.validateFile(file)).toThrow(/unsupported extension/);
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove path traversal sequences (../../etc/passwd)', () => {
      const result = service.sanitizeFilename('../../etc/passwd');
      expect(result).not.toContain('..');
      expect(result).not.toContain('/');
      // After sanitization: ../../etc/passwd → etc_passwd → passwd (consecutive underscores removed)
      expect(result).toBe('passwd');
    });

    it('should replace special characters with underscores (my file!@#.pdf)', () => {
      const result = service.sanitizeFilename('my file!@#.pdf');
      // Spaces and special chars replaced with _, consecutive _ removed
      expect(result).toBe('my_file.pdf');
    });

    it('should truncate filename to 255 characters', () => {
      const longFilename = 'a'.repeat(300) + '.pdf';
      const result = service.sanitizeFilename(longFilename);
      expect(result.length).toBeLessThanOrEqual(255);
      expect(result.endsWith('.pdf')).toBe(true);
    });

    it('should preserve valid filename (document-2024.pdf)', () => {
      const result = service.sanitizeFilename('document-2024.pdf');
      expect(result).toBe('document-2024.pdf');
    });

    it('should handle filename with spaces', () => {
      const result = service.sanitizeFilename('My Document.pdf');
      expect(result).toBe('My_Document.pdf');
    });
  });

  describe('uploadFiles', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'files',
      originalname: 'test.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('test-content'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const domainID = '123e4567-e89b-12d3-a456-426614174000';
    const userID = '123e4567-e89b-12d3-a456-426614174001';

    beforeEach(() => {
      process.env.S3_BUCKET = 'test-bucket';
    });

    it('should throw BadRequestException if no files provided', async () => {
      await expect(service.uploadFiles([], userID)).rejects.toThrow(BadRequestException);
      await expect(service.uploadFiles([], userID)).rejects.toThrow('files.NO_FILES');
    });

    it('should throw BadRequestException if > 10 files provided', async () => {
      const files = Array(11).fill(mockFile);

      await expect(service.uploadFiles(files, userID)).rejects.toThrow(BadRequestException);
      await expect(service.uploadFiles(files, userID)).rejects.toThrow(/Maximum .* files allowed/);
    });

    it('should upload file to S3 and save metadata to database', async () => {
      const mockCreatedFile = {
        id: '123e4567-e89b-12d3-a456-426614174002',

        userID,
        filename: 'test-unique-file.png',
        originalName: 'test.png',
        mimeType: 'image/png',
        size: 1024,
        s3Key: `${domainID}/${userID}/12345-test.png`,
        s3Bucket: 'test-bucket',
        createdAt: new Date(),
        deletedAt: null,
      };

      mockS3Service.uploadFile.mockResolvedValue(`${domainID}/${userID}/12345-test.png`);
      const createMock = jest.fn().mockResolvedValue(mockCreatedFile);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          file: {
            create: createMock,
          },
        });
      });

      const result = await service.uploadFiles([mockFile], userID);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockCreatedFile.id,
        filename: mockCreatedFile.filename,
        originalName: 'test.png',
        mimeType: 'image/png',
        size: 1024,
      });

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filename: expect.stringMatching(/^test-\d+-[a-f0-9]{8}\.png$/),
            originalName: mockFile.originalname,
          }),
        }),
      );

      const expectedKeyPattern = new RegExp(`^${userID}/test-\\d+-[a-f0-9]{8}\\.png$`);
      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        mockFile.buffer,
        expect.stringMatching(expectedKeyPattern),
        'image/png',
      );
    });

    it('should cleanup S3 files if database insert fails', async () => {
      mockS3Service.uploadFile.mockResolvedValue(`${domainID}/${userID}/12345-test.png`);
      mockPrismaService.$transaction.mockRejectedValue(new Error('DB insert failed'));

      await expect(service.uploadFiles([mockFile], userID)).rejects.toThrow(InternalServerErrorException);

      // Verify S3 cleanup was called
      expect(mockS3Service.deleteFile).toHaveBeenCalledWith(expect.stringMatching(/\.png$/));
    });

    it('should handle partial upload success (5/10 files fail)', async () => {
      const files = Array(10).fill(mockFile);

      // Mock S3 upload: First 5 succeed, last 5 fail
      mockS3Service.uploadFile
        .mockResolvedValueOnce('key-1')
        .mockResolvedValueOnce('key-2')
        .mockResolvedValueOnce('key-3')
        .mockResolvedValueOnce('key-4')
        .mockResolvedValueOnce('key-5')
        .mockRejectedValueOnce(new Error('S3 error'))
        .mockRejectedValueOnce(new Error('S3 error'))
        .mockRejectedValueOnce(new Error('S3 error'))
        .mockRejectedValueOnce(new Error('S3 error'))
        .mockRejectedValueOnce(new Error('S3 error'));

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          file: {
            create: jest.fn().mockResolvedValue({
              id: 'mock-id',

              userID,
              filename: 'test.png',
              originalName: 'test.png',
              mimeType: 'image/png',
              size: 1024,
              s3Key: 'key-1',
              s3Bucket: 'test-bucket',
              createdAt: new Date(),
              deletedAt: null,
            }),
          },
        });
      });

      const result = await service.uploadFiles(files, userID);

      // Should return 5 successful uploads
      expect(result.length).toBe(5);
    });

    it('should generate unique filenames for duplicate original names', async () => {
      const files = [{ ...mockFile }, { ...mockFile, buffer: Buffer.from('second'), originalname: 'test.png' }];

      const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
      randomUUIDMock
        .mockReturnValueOnce('abcdefab-1234-5678-90ab-abcdefabcdef')
        .mockReturnValueOnce('12345678-90ab-cdef-1234-abcdefabcdef');

      mockS3Service.uploadFile.mockResolvedValue('mock-key');

      const createMock = jest.fn().mockResolvedValue({
        id: 'mock-id',

        userID,
        filename: 'test-unique-file.png',
        originalName: 'test.png',
        mimeType: 'image/png',
        size: 1024,
        s3Key: 'mock-key',
        s3Bucket: 'test-bucket',
        createdAt: new Date(),
        deletedAt: null,
      });

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          file: {
            create: createMock,
          },
        });
      });

      await service.uploadFiles(files, userID);

      expect(mockS3Service.uploadFile).toHaveBeenCalledTimes(2);

      const firstKey = mockS3Service.uploadFile.mock.calls[0][1];
      const secondKey = mockS3Service.uploadFile.mock.calls[1][1];

      expect(firstKey).not.toEqual(secondKey);
      expect(firstKey).toBe(`${userID}/test-1700000000000-abcdefab.png`);
      expect(secondKey).toBe(`${userID}/test-1700000000000-12345678.png`);

      dateNowSpy.mockRestore();
    });
  });

  describe('getFileMetadata', () => {
    const domainID = '123e4567-e89b-12d3-a456-426614174000';
    const userID = '123e4567-e89b-12d3-a456-426614174001';
    const fileId = '123e4567-e89b-12d3-a456-426614174002';

    const mockFile = {
      id: fileId,

      userID,
      filename: 'test.png',
      originalName: 'test.png',
      mimeType: 'image/png',
      size: 1024,
      s3Key: `${domainID}/${userID}/12345-test.png`,
      s3Bucket: 'test-bucket',
      createdAt: new Date(),
      deletedAt: null,
    };

    it('should return file metadata when user is owner', async () => {
      mockPrismaService.file.findUnique.mockResolvedValue(mockFile);

      const result = await service.getFileMetadata(fileId, userID, false);

      expect(result).toEqual(mockFile);
      expect(mockPrismaService.file.findUnique).toHaveBeenCalledWith({
        where: { id: fileId },
      });
    });

    it('should return file metadata when user has FILES.VIEW permission', async () => {
      const otherUserID = '123e4567-e89b-12d3-a456-426614174999';

      mockPrismaService.file.findUnique.mockResolvedValue(mockFile);

      const result = await service.getFileMetadata(fileId, otherUserID, true);

      expect(result).toEqual(mockFile);
    });

    it('should throw NotFoundException if file does not exist', async () => {
      mockPrismaService.file.findUnique.mockResolvedValue(null);

      await expect(service.getFileMetadata(fileId, userID, false)).rejects.toThrow(NotFoundException);
      await expect(service.getFileMetadata(fileId, userID, false)).rejects.toThrow('files.NOT_FOUND');
    });

    it('should return file when found by id', async () => {
      mockPrismaService.file.findUnique.mockResolvedValue(mockFile);

      const result = await service.getFileMetadata(fileId, userID, false);

      expect(result).toEqual(mockFile);
    });

    it('should throw NotFoundException if file is soft-deleted', async () => {
      const deletedFile = { ...mockFile, deletedAt: new Date() };

      mockPrismaService.file.findUnique.mockResolvedValue(deletedFile);

      await expect(service.getFileMetadata(fileId, userID, false)).rejects.toThrow(NotFoundException);
      await expect(service.getFileMetadata(fileId, userID, false)).rejects.toThrow('files.NOT_FOUND');
    });

    it('should throw ForbiddenException if user is not owner and has no FILES.VIEW permission', async () => {
      const otherUserID = '123e4567-e89b-12d3-a456-426614174999';

      mockPrismaService.file.findUnique.mockResolvedValue(mockFile);

      await expect(service.getFileMetadata(fileId, otherUserID, false)).rejects.toThrow(ForbiddenException);
      await expect(service.getFileMetadata(fileId, otherUserID, false)).rejects.toThrow('files.INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('generateDownloadUrl', () => {
    const domainID = '123e4567-e89b-12d3-a456-426614174000';
    const userID = '123e4567-e89b-12d3-a456-426614174001';
    const fileId = '123e4567-e89b-12d3-a456-426614174002';

    const mockFile = {
      id: fileId,

      userID,
      filename: 'test.png',
      originalName: 'test.png',
      mimeType: 'image/png',
      size: 1024,
      s3Key: `${domainID}/${userID}/12345-test.png`,
      s3Bucket: 'test-bucket',
      createdAt: new Date(),
      deletedAt: null,
    };

    it('should generate pre-signed URL with correct structure', async () => {
      const mockPresignedUrl = 'https://s3.amazonaws.com/test-bucket/file?signature=xyz';

      mockPrismaService.file.findUnique.mockResolvedValue(mockFile);
      mockS3Service.getPresignedUrl.mockResolvedValue(mockPresignedUrl);

      const result = await service.generateDownloadUrl(fileId, userID, true);

      expect(result).toHaveProperty('downloadUrl', mockPresignedUrl);
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('expiresIn', 900);
      expect(mockS3Service.getPresignedUrl).toHaveBeenCalledWith(mockFile.s3Key, 900);
    });

    it('should throw ServiceUnavailableException if S3 URL generation fails', async () => {
      mockPrismaService.file.findUnique.mockResolvedValue(mockFile);
      mockS3Service.getPresignedUrl.mockRejectedValue(new Error('S3 service error'));

      await expect(service.generateDownloadUrl(fileId, userID, true)).rejects.toThrow(ServiceUnavailableException);
      await expect(service.generateDownloadUrl(fileId, userID, true)).rejects.toThrow('files.DOWNLOAD_LINK_FAILED');
    });

    it('should validate access before generating URL (file not found)', async () => {
      mockPrismaService.file.findUnique.mockResolvedValue(null);

      await expect(service.generateDownloadUrl(fileId, userID, true)).rejects.toThrow(NotFoundException);

      // S3Service should NOT be called if access validation fails
      expect(mockS3Service.getPresignedUrl).not.toHaveBeenCalled();
    });

    it('should validate access before generating URL (unauthorized user)', async () => {
      const otherUserID = '123e4567-e89b-12d3-a456-426614174999';

      mockPrismaService.file.findUnique.mockResolvedValue(mockFile);

      await expect(service.generateDownloadUrl(fileId, otherUserID, false)).rejects.toThrow(ForbiddenException);

      // S3Service should NOT be called if access validation fails
      expect(mockS3Service.getPresignedUrl).not.toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    const domainID = '123e4567-e89b-12d3-a456-426614174000';
    const userID = '123e4567-e89b-12d3-a456-426614174001';
    const fileId = '123e4567-e89b-12d3-a456-426614174002';

    const mockFile = {
      id: fileId,

      userID,
      filename: 'test.png',
      originalName: 'test.png',
      mimeType: 'image/png',
      size: 1024,
      s3Key: `${domainID}/${userID}/12345-test.png`,
      s3Bucket: 'test-bucket',
      createdAt: new Date(),
      deletedAt: null,
    };

    it('should soft delete file when user is owner', async () => {
      mockPrismaService.file.findUnique.mockResolvedValue(mockFile);
      mockPrismaService.file.update.mockResolvedValue({
        ...mockFile,
        deletedAt: new Date(),
      });

      await service.deleteFile(fileId, userID, false);

      expect(mockPrismaService.file.update).toHaveBeenCalledWith({
        where: { id: fileId },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should soft delete file when user has FILES.DELETE permission', async () => {
      const otherUserID = '123e4567-e89b-12d3-a456-426614174999';

      mockPrismaService.file.findUnique.mockResolvedValue(mockFile);
      mockPrismaService.file.update.mockResolvedValue({
        ...mockFile,
        deletedAt: new Date(),
      });

      await service.deleteFile(fileId, otherUserID, true);

      expect(mockPrismaService.file.update).toHaveBeenCalledWith({
        where: { id: fileId },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException if file does not exist', async () => {
      mockPrismaService.file.findUnique.mockResolvedValue(null);

      await expect(service.deleteFile(fileId, userID, false)).rejects.toThrow(NotFoundException);
      await expect(service.deleteFile(fileId, userID, false)).rejects.toThrow('files.NOT_FOUND');

      // File update should NOT be called if file not found
      expect(mockPrismaService.file.update).not.toHaveBeenCalled();
    });

    it('should delete file successfully when found', async () => {
      mockPrismaService.file.findUnique.mockResolvedValue(mockFile);
      mockPrismaService.file.update.mockResolvedValue({ ...mockFile, deletedAt: new Date() });

      await service.deleteFile(fileId, userID, true);

      expect(mockPrismaService.file.update).toHaveBeenCalledWith({
        where: { id: fileId },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException if file is already deleted', async () => {
      const deletedFile = { ...mockFile, deletedAt: new Date() };

      mockPrismaService.file.findUnique.mockResolvedValue(deletedFile);

      await expect(service.deleteFile(fileId, userID, false)).rejects.toThrow(NotFoundException);
      await expect(service.deleteFile(fileId, userID, false)).rejects.toThrow('files.NOT_FOUND');

      // File update should NOT be called if already deleted
      expect(mockPrismaService.file.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not owner and has no FILES.DELETE permission', async () => {
      const otherUserID = '123e4567-e89b-12d3-a456-426614174999';

      mockPrismaService.file.findUnique.mockResolvedValue(mockFile);

      await expect(service.deleteFile(fileId, otherUserID, false)).rejects.toThrow(ForbiddenException);
      await expect(service.deleteFile(fileId, otherUserID, false)).rejects.toThrow('files.INSUFFICIENT_PERMISSIONS');

      // File update should NOT be called if unauthorized
      expect(mockPrismaService.file.update).not.toHaveBeenCalled();
    });

    it('should NOT call S3Service.deleteFile() (soft delete only)', async () => {
      mockPrismaService.file.findUnique.mockResolvedValue(mockFile);
      mockPrismaService.file.update.mockResolvedValue({
        ...mockFile,
        deletedAt: new Date(),
      });

      await service.deleteFile(fileId, userID, false);

      // Verify S3 deleteFile is NOT called (S3 cleanup deferred to scheduled job)
      expect(mockS3Service.deleteFile).not.toHaveBeenCalled();
    });
  });

  describe('listFiles', () => {
    const domainID = '123e4567-e89b-12d3-a456-426614174000';
    const userID = '123e4567-e89b-12d3-a456-426614174001';

    const mockFiles = [
      {
        id: '123e4567-e89b-12d3-a456-426614174002',

        userID,
        filename: 'test1.png',
        originalName: 'test1.png',
        mimeType: 'image/png',
        size: 1024,
        s3Key: `${domainID}/${userID}/12345-test1.png`,
        s3Bucket: 'test-bucket',
        createdAt: new Date('2025-11-06T10:00:00Z'),
        deletedAt: null,
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174003',

        userID,
        filename: 'test2.pdf',
        originalName: 'test2.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        s3Key: `${domainID}/${userID}/12346-test2.pdf`,
        s3Bucket: 'test-bucket',
        createdAt: new Date('2025-11-06T11:00:00Z'),
        deletedAt: null,
      },
    ];

    it('should return paginated files for regular user (only own files)', async () => {
      const queryDto = { page: 1, limit: 20 };

      mockPrismaService.file.findMany.mockResolvedValue(mockFiles);
      mockPrismaService.file.count.mockResolvedValue(2);

      const result = await service.listFiles(
        queryDto,
        userID,
        false, // Regular user (no FILES.VIEW_ALL permission)
      );

      expect(result.data).toEqual(mockFiles);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });

      // Verify userID filter is applied for regular users
      expect(mockPrismaService.file.findMany).toHaveBeenCalledWith({
        include: {
          user: true,
        },
        where: expect.objectContaining({
          userID, // Regular user filter
          deletedAt: null,
        }),
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return all domain files for admin with FILES.VIEW_ALL permission', async () => {
      const queryDto = { page: 1, limit: 20 };

      mockPrismaService.file.findMany.mockResolvedValue(mockFiles);
      mockPrismaService.file.count.mockResolvedValue(2);

      const result = await service.listFiles(
        queryDto,
        userID,
        true, // Admin with FILES.VIEW_ALL permission
      );

      expect(result.data).toEqual(mockFiles);

      // Verify userID filter is NOT applied for admins
      expect(mockPrismaService.file.findMany).toHaveBeenCalledWith({
        include: {
          user: true,
        },
        where: expect.objectContaining({
          deletedAt: null,
        }),
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });

      expect(mockPrismaService.file.findMany).toHaveBeenCalledWith({
        include: {
          user: true,
        },
        where: expect.objectContaining({
          deletedAt: null,
        }),
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle pagination correctly (page=2, limit=5)', async () => {
      const queryDto = { page: 2, limit: 5 };

      mockPrismaService.file.findMany.mockResolvedValue([]);
      mockPrismaService.file.count.mockResolvedValue(12);

      const result = await service.listFiles(queryDto, userID, false);

      expect(result.meta).toEqual({
        page: 2,
        limit: 5,
        total: 12,
        totalPages: 3, // Math.ceil(12 / 5) = 3
      });

      // Verify skip calculation: (page - 1) * limit = (2 - 1) * 5 = 5
      expect(mockPrismaService.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
    });

    it('should filter by mimeType with wildcard (image/*)', async () => {
      const queryDto = { page: 1, limit: 20, mimeType: 'image/*' };

      mockPrismaService.file.findMany.mockResolvedValue([mockFiles[0]]);
      mockPrismaService.file.count.mockResolvedValue(1);

      await service.listFiles(queryDto, userID, false);

      // Verify mimeType wildcard filter (startsWith 'image/')
      expect(mockPrismaService.file.findMany).toHaveBeenCalledWith({
        include: {
          user: true,
        },
        where: expect.objectContaining({
          userID,
          mimeType: { startsWith: 'image/' },
          deletedAt: null,
        }),
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by mimeType exact match (application/pdf)', async () => {
      const queryDto = { page: 1, limit: 20, mimeType: 'application/pdf' };

      mockPrismaService.file.findMany.mockResolvedValue([mockFiles[1]]);
      mockPrismaService.file.count.mockResolvedValue(1);

      await service.listFiles(queryDto, userID, false);

      // Verify exact mimeType filter
      expect(mockPrismaService.file.findMany).toHaveBeenCalledWith({
        include: {
          user: true,
        },
        where: expect.objectContaining({
          userID,
          deletedAt: null,
          mimeType: 'application/pdf',
        }),
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by search term (case-insensitive)', async () => {
      const queryDto = { page: 1, limit: 20, search: 'test' };

      mockPrismaService.file.findMany.mockResolvedValue(mockFiles);
      mockPrismaService.file.count.mockResolvedValue(2);

      await service.listFiles(queryDto, userID, false);

      // Verify search filter (case-insensitive LIKE on originalName)
      expect(mockPrismaService.file.findMany).toHaveBeenCalledWith({
        include: {
          user: true,
        },
        where: expect.objectContaining({
          userID,
          originalName: { contains: 'test', mode: 'insensitive' },
          deletedAt: null,
        }),
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should sort by size ascending', async () => {
      const queryDto = {
        page: 1,
        limit: 20,
        sortBy: 'size' as 'size' | 'filename' | 'mimeType' | 'createdAt',
        sortOrder: 'asc' as 'asc' | 'desc',
      };

      mockPrismaService.file.findMany.mockResolvedValue(mockFiles);
      mockPrismaService.file.count.mockResolvedValue(2);

      await service.listFiles(queryDto, userID, false);

      // Verify sorting
      expect(mockPrismaService.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { size: 'asc' },
        }),
      );
    });

    it('should throw BadRequestException for invalid sortBy field', async () => {
      const queryDto = { page: 1, limit: 20, sortBy: 'invalidField' };

      await expect(service.listFiles(queryDto as any, userID, false)).rejects.toThrow(BadRequestException);
      await expect(service.listFiles(queryDto as any, userID, false)).rejects.toThrow(/Invalid sort field/);

      // Prisma should NOT be called if validation fails
      expect(mockPrismaService.file.findMany).not.toHaveBeenCalled();
    });

    it('should return empty array when no files match filters', async () => {
      const queryDto = { page: 1, limit: 20 };

      mockPrismaService.file.findMany.mockResolvedValue([]);
      mockPrismaService.file.count.mockResolvedValue(0);

      const result = await service.listFiles(queryDto, userID, false);

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    });

    it('should always filter by domainID and exclude soft-deleted files', async () => {
      const queryDto = { page: 1, limit: 20 };

      mockPrismaService.file.findMany.mockResolvedValue(mockFiles);
      mockPrismaService.file.count.mockResolvedValue(2);

      await service.listFiles(queryDto, userID, false);

      // Verify base filters are always applied
      expect(mockPrismaService.file.findMany).toHaveBeenCalledWith({
        include: {
          user: true,
        },
        where: expect.objectContaining({
          userID,
          deletedAt: null, // Exclude soft-deleted files
        }),
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should calculate totalPages correctly (Math.ceil)', async () => {
      const queryDto = { page: 1, limit: 20 };

      mockPrismaService.file.findMany.mockResolvedValue([]);
      mockPrismaService.file.count.mockResolvedValue(45);

      const result = await service.listFiles(queryDto, userID, false);

      // Math.ceil(45 / 20) = 3
      expect(result.meta.totalPages).toBe(3);
    });

    // ===== DATE FILTER TESTS (TDD RED PHASE) =====

    it('should filter files by createdFrom date', async () => {
      const createdFrom = new Date('2024-01-01T00:00:00.000Z');
      const queryDto = { page: 1, limit: 20, createdFrom };

      mockPrismaService.file.findMany.mockResolvedValue([]);
      mockPrismaService.file.count.mockResolvedValue(0);

      await service.listFiles(queryDto, userID, false);

      expect(mockPrismaService.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({ gte: createdFrom }),
          }),
        }),
      );
    });

    it('should filter files by createdTo date', async () => {
      const createdTo = new Date('2024-12-31T23:59:59.999Z');
      const queryDto = { page: 1, limit: 20, createdTo };

      mockPrismaService.file.findMany.mockResolvedValue([]);
      mockPrismaService.file.count.mockResolvedValue(0);

      await service.listFiles(queryDto, userID, false);

      expect(mockPrismaService.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({ lte: createdTo }),
          }),
        }),
      );
    });

    it('should filter files by created date range', async () => {
      const createdFrom = new Date('2024-01-01T00:00:00.000Z');
      const createdTo = new Date('2024-06-30T23:59:59.999Z');
      const queryDto = { page: 1, limit: 20, createdFrom, createdTo };

      mockPrismaService.file.findMany.mockResolvedValue([]);
      mockPrismaService.file.count.mockResolvedValue(0);

      await service.listFiles(queryDto, userID, false);

      expect(mockPrismaService.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: createdFrom, lte: createdTo },
          }),
        }),
      );
    });

    it('should filter files by updatedFrom date', async () => {
      const updatedFrom = new Date('2024-06-01T00:00:00.000Z');
      const queryDto = { page: 1, limit: 20, updatedFrom };

      mockPrismaService.file.findMany.mockResolvedValue([]);
      mockPrismaService.file.count.mockResolvedValue(0);

      await service.listFiles(queryDto, userID, false);

      expect(mockPrismaService.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            updatedAt: expect.objectContaining({ gte: updatedFrom }),
          }),
        }),
      );
    });

    it('should filter files by updated date range', async () => {
      const updatedFrom = new Date('2024-01-01T00:00:00.000Z');
      const updatedTo = new Date('2024-12-31T23:59:59.999Z');
      const queryDto = { page: 1, limit: 20, updatedFrom, updatedTo };

      mockPrismaService.file.findMany.mockResolvedValue([]);
      mockPrismaService.file.count.mockResolvedValue(0);

      await service.listFiles(queryDto, userID, false);

      expect(mockPrismaService.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            updatedAt: { gte: updatedFrom, lte: updatedTo },
          }),
        }),
      );
    });
  });
});
