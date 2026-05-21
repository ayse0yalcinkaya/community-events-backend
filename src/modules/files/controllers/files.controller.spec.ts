// Libraries
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

// Interfaces
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

// Guards
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';

// Services
import { AuthorizationService } from '../../permissions/services/authorization.service';
import { FilesService } from '../services/files.service';

// Controllers
import { FilesController } from './files.controller';

describe('FilesController', () => {
  let controller: FilesController;
  let filesService: FilesService;

  const mockFilesService = {
    uploadFiles: jest.fn(),
    validateFile: jest.fn(),
    sanitizeFilename: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockPermissionsGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        {
          provide: FilesService,
          useValue: mockFilesService,
        },
        {
          provide: AuthorizationService,
          useValue: {
            canAccess: jest.fn(() => true),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockPermissionsGuard)
      .compile();

    controller = module.get<FilesController>(FilesController);
    filesService = module.get<FilesService>(FilesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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

    const mockUser: JwtPayload = {
      sub: '123e4567-e89b-12d3-a456-426614174001',
      phoneNumber: '+905551234567',
      roles: ['user'],
      userType: 'USER',
      iat: Date.now(),
      exp: Date.now() + 3600000,
    };

    it('should upload single file successfully', async () => {
      const mockUploadedFile = {
        id: '123e4567-e89b-12d3-a456-426614174002',

        userID: mockUser.sub,
        filename: 'test.png',
        originalName: 'test.png',
        mimeType: 'image/png',
        size: 1024,
        s3Key: `${mockUser.sub}/${mockUser.sub}/12345-test.png`,
        s3Bucket: 'test-bucket',
        createdAt: new Date(),
        deletedAt: null,
      };

      mockFilesService.uploadFiles.mockResolvedValue([mockUploadedFile]);

      const result = await controller.uploadFiles([mockFile], mockUser);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockUploadedFile.id,
        filename: 'test.png',
        originalName: 'test.png',
        mimeType: 'image/png',
        size: 1024,
      });
      expect(mockFilesService.uploadFiles).toHaveBeenCalledWith([mockFile], mockUser.sub);
    });

    it('should upload multiple files successfully', async () => {
      const mockFiles = Array(3).fill(mockFile);
      const mockUploadedFiles = mockFiles.map((_, index) => ({
        id: `123e4567-e89b-12d3-a456-42661417400${index}`,

        userID: mockUser.sub,
        filename: `test-${index}.png`,
        originalName: `test-${index}.png`,
        mimeType: 'image/png',
        size: 1024,
        s3Key: `${mockUser.sub}/${mockUser.sub}/12345-test-${index}.png`,
        s3Bucket: 'test-bucket',
        createdAt: new Date(),
        deletedAt: null,
      }));

      mockFilesService.uploadFiles.mockResolvedValue(mockUploadedFiles);

      const result = await controller.uploadFiles(mockFiles, mockUser);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
      expect(mockFilesService.uploadFiles).toHaveBeenCalledWith(mockFiles, mockUser.sub);
    });

    it('should throw BadRequestException if no files provided', async () => {
      await expect(controller.uploadFiles([], mockUser)).rejects.toThrow(BadRequestException);
      await expect(controller.uploadFiles([], mockUser)).rejects.toThrow('No files provided');
    });

    it('should throw BadRequestException if files array is null/undefined', async () => {
      await expect(controller.uploadFiles(null as any, mockUser)).rejects.toThrow(BadRequestException);
      await expect(controller.uploadFiles(undefined as any, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should exclude sensitive fields from response (s3Key, s3Bucket, domainID, userID, deletedAt)', async () => {
      const mockUploadedFile = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        // Should be excluded
        userID: mockUser.sub, // Should be excluded
        filename: 'test.png',
        originalName: 'test.png',
        mimeType: 'image/png',
        size: 1024,
        s3Key: 'sensitive-s3-key', // Should be excluded
        s3Bucket: 'test-bucket', // Should be excluded
        createdAt: new Date(),
        deletedAt: null, // Should be excluded
      };

      mockFilesService.uploadFiles.mockResolvedValue([mockUploadedFile]);

      const result = await controller.uploadFiles([mockFile], mockUser);

      expect(result[0]).not.toHaveProperty('s3Key');
      expect(result[0]).not.toHaveProperty('s3Bucket');
      expect(result[0]).not.toHaveProperty('domainID');
      expect(result[0]).not.toHaveProperty('userID');
      expect(result[0]).not.toHaveProperty('deletedAt');
    });

    it('should include sizeFormatted field in response', async () => {
      const mockUploadedFile = {
        id: '123e4567-e89b-12d3-a456-426614174002',

        userID: mockUser.sub,
        filename: 'test.png',
        originalName: 'test.png',
        mimeType: 'image/png',
        size: 1024 * 1024, // 1MB
        s3Key: 'key',
        s3Bucket: 'bucket',
        createdAt: new Date(),
        deletedAt: null,
      };

      mockFilesService.uploadFiles.mockResolvedValue([mockUploadedFile]);

      const result = await controller.uploadFiles([mockFile], mockUser);

      expect(result[0]).toHaveProperty('sizeFormatted');
      expect(result[0].sizeFormatted).toMatch(/MB|KB|B/);
    });
  });
});
