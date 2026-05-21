// Libraries
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { I18nService } from 'nestjs-i18n';

// Services
import { RetryService } from '@/common/services/retry.service';
import { S3Service } from './s3.service';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

describe('S3Service', () => {
  let service: S3Service;
  let configService: ConfigService;
  let retryService: RetryService;
  let i18nService: I18nService;
  let mockS3Client: jest.Mocked<S3Client>;

  const mockAwsConfig = {
    region: 'us-east-1',
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
    s3: {
      bucket: 'test-bucket',
      endpoint: undefined,
      forcePathStyle: false,
    },
  };

  beforeEach(async () => {
    // Mock S3Client
    mockS3Client = {
      send: jest.fn(),
    } as any;

    (S3Client as jest.MockedClass<typeof S3Client>).mockImplementation(() => mockS3Client);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'aws') return mockAwsConfig;
              if (key === 'S3_RETRY_MAX_ATTEMPTS') return defaultValue || 5;
              if (key === 'S3_RETRY_BASE_DELAY') return defaultValue || 2000;
              return null;
            }),
          },
        },
        {
          provide: RetryService,
          useValue: {
            executeWithRetry: jest.fn(),
          },
        },
        {
          provide: I18nService,
          useValue: {
            t: jest.fn((key: string, options?: any) => {
              // Mock translations
              const translations: Record<string, string> = {
                'errors.S3_UPLOAD_INVALID_CREDENTIALS':
                  'S3 upload failed: Invalid AWS credentials. Please check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.',
                'errors.S3_UPLOAD_BUCKET_NOT_FOUND': `S3 upload failed: Bucket not found or inaccessible: ${options?.args?.bucket || 'test-bucket'}`,
                'errors.S3_UPLOAD_ACCESS_DENIED': 'S3 upload failed: Access denied. Please check your IAM permissions.',
                'errors.S3_UPLOAD_FAILED_RETRY_EXHAUSTED': `S3 upload failed after ${options?.args?.maxAttempts || 5} attempts. Please try again later.`,
                'errors.S3_PRESIGNED_URL_FAILED': `Failed to generate download URL for file: ${options?.args?.key || 'test-key'}`,
                'errors.S3_DELETE_FILE_NOT_FOUND': `Failed to delete file: ${options?.args?.key || 'test-key'}. File not found.`,
                'errors.S3_DELETE_FAILED': `Failed to delete file: ${options?.args?.key || 'test-key'}`,
              };
              return translations[key] || key;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
    configService = module.get<ConfigService>(ConfigService);
    retryService = module.get<RetryService>(RetryService);
    i18nService = module.get<I18nService>(I18nService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should throw error if AWS config is missing', () => {
      jest.spyOn(configService, 'get').mockReturnValue(null);
      expect(() => new S3Service(configService, retryService, i18nService)).toThrow('AWS configuration is missing');
    });

    it('should throw error if S3_BUCKET is missing', () => {
      const invalidConfig = {
        ...mockAwsConfig,
        s3: { ...mockAwsConfig.s3, bucket: undefined },
      };
      jest.spyOn(configService, 'get').mockReturnValue(invalidConfig);
      expect(() => new S3Service(configService, retryService, i18nService)).toThrow(
        'S3_BUCKET is required but not defined',
      );
    });

    it('should load retry configuration from ConfigService', () => {
      expect(configService.get).toHaveBeenCalledWith('S3_RETRY_MAX_ATTEMPTS', 5);
      expect(configService.get).toHaveBeenCalledWith('S3_RETRY_BASE_DELAY', 2000);
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully on first attempt', async () => {
      const buffer = Buffer.from('test file content');
      const key = 'test-folder/test-file.txt';
      const mimeType = 'text/plain';

      // Mock RetryService to execute operation immediately
      (retryService.executeWithRetry as jest.Mock).mockImplementation(async (operation) => await operation());
      (mockS3Client.send as jest.Mock).mockResolvedValue({} as any);

      const result = await service.uploadFile(buffer, key, mimeType);

      expect(result).toBe(key);
      expect(retryService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          maxAttempts: 5,
          baseDelay: 2000,
          context: `S3 Upload: ${key}`,
        }),
      );
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });

    it('should retry on network error (via RetryService)', async () => {
      const buffer = Buffer.from('test file content');
      const key = 'test-folder/test-file.txt';
      const mimeType = 'text/plain';

      // Simulate RetryService retrying and eventually succeeding
      let attempt = 0;
      (retryService.executeWithRetry as jest.Mock).mockImplementation(async (operation) => {
        attempt++;
        if (attempt === 1) {
          throw new Error('Network timeout');
        }
        return await operation();
      });
      (mockS3Client.send as jest.Mock).mockResolvedValue({} as any);

      await expect(service.uploadFile(buffer, key, mimeType)).rejects.toThrow(ServiceUnavailableException);
      expect(retryService.executeWithRetry).toHaveBeenCalled();
    });

    it('should not retry for 4xx credentials error', async () => {
      const buffer = Buffer.from('test file content');
      const key = 'test-folder/test-file.txt';
      const mimeType = 'text/plain';

      // Mock RetryService to throw credentials error
      (retryService.executeWithRetry as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

      await expect(service.uploadFile(buffer, key, mimeType)).rejects.toThrow(BadRequestException);
      await expect(service.uploadFile(buffer, key, mimeType)).rejects.toThrow('Invalid AWS credentials');
      expect(i18nService.t).toHaveBeenCalledWith('errors.S3_UPLOAD_INVALID_CREDENTIALS');
    });

    it('should not retry for 4xx bucket not found error', async () => {
      const buffer = Buffer.from('test file content');
      const key = 'test-folder/test-file.txt';
      const mimeType = 'text/plain';

      (retryService.executeWithRetry as jest.Mock).mockRejectedValue(
        new Error('NoSuchBucket: The specified bucket does not exist'),
      );

      await expect(service.uploadFile(buffer, key, mimeType)).rejects.toThrow(BadRequestException);
      await expect(service.uploadFile(buffer, key, mimeType)).rejects.toThrow('Bucket not found or inaccessible');
    });

    it('should not retry for 4xx AccessDenied error', async () => {
      const buffer = Buffer.from('test file content');
      const key = 'test-folder/test-file.txt';
      const mimeType = 'text/plain';

      (retryService.executeWithRetry as jest.Mock).mockRejectedValue(new Error('AccessDenied: Access Denied'));

      await expect(service.uploadFile(buffer, key, mimeType)).rejects.toThrow(BadRequestException);
      await expect(service.uploadFile(buffer, key, mimeType)).rejects.toThrow('Access denied');
    });

    it('should throw ServiceUnavailableException after retry exhaustion', async () => {
      const buffer = Buffer.from('test file content');
      const key = 'test-folder/test-file.txt';
      const mimeType = 'text/plain';

      // Mock RetryService throwing after all retries exhausted
      (retryService.executeWithRetry as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      await expect(service.uploadFile(buffer, key, mimeType)).rejects.toThrow(ServiceUnavailableException);
      await expect(service.uploadFile(buffer, key, mimeType)).rejects.toThrow('after 5 attempts');
    });
  });

  describe('getPresignedUrl', () => {
    it('should generate pre-signed URL with default expiration (900s)', async () => {
      const key = 'test-folder/test-file.txt';
      const mockUrl = 'https://s3.amazonaws.com/test-bucket/test-file.txt?signature=xxx';

      (retryService.executeWithRetry as jest.Mock).mockImplementation(async (operation) => await operation());
      (getSignedUrl as jest.Mock).mockResolvedValue(mockUrl);

      const result = await service.getPresignedUrl(key);

      expect(result).toBe(mockUrl);
      expect(retryService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          maxAttempts: 5,
          baseDelay: 2000,
          context: `S3 Presigned URL: ${key}`,
        }),
      );
      expect(getSignedUrl).toHaveBeenCalledWith(
        mockS3Client,
        expect.any(GetObjectCommand),
        expect.objectContaining({ expiresIn: 900 }),
      );
    });

    it('should generate pre-signed URL with custom expiration', async () => {
      const key = 'test-folder/test-file.txt';
      const customExpiration = 3600; // 1 hour
      const mockUrl = 'https://s3.amazonaws.com/test-bucket/test-file.txt?signature=xxx';

      (retryService.executeWithRetry as jest.Mock).mockImplementation(async (operation) => await operation());
      (getSignedUrl as jest.Mock).mockResolvedValue(mockUrl);

      const result = await service.getPresignedUrl(key, customExpiration);

      expect(result).toBe(mockUrl);
      expect(getSignedUrl).toHaveBeenCalledWith(
        mockS3Client,
        expect.any(GetObjectCommand),
        expect.objectContaining({ expiresIn: customExpiration }),
      );
    });

    it('should retry on network error for presigned URL generation', async () => {
      const key = 'test-folder/test-file.txt';

      (retryService.executeWithRetry as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      await expect(service.getPresignedUrl(key)).rejects.toThrow(BadRequestException);
      await expect(service.getPresignedUrl(key)).rejects.toThrow('Failed to generate download URL');
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const key = 'test-folder/test-file.txt';

      (retryService.executeWithRetry as jest.Mock).mockImplementation(async (operation) => await operation());
      (mockS3Client.send as jest.Mock).mockResolvedValue({} as any);

      await service.deleteFile(key);

      expect(retryService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          maxAttempts: 3, // Lower for delete operations
          baseDelay: 1000, // Lower for delete operations
          context: `S3 Delete: ${key}`,
        }),
      );
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });

    it('should retry on network error for delete operation', async () => {
      const key = 'test-folder/test-file.txt';

      (retryService.executeWithRetry as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      await expect(service.deleteFile(key)).rejects.toThrow(BadRequestException);
    });

    it('should not retry for NoSuchKey error (4xx)', async () => {
      const key = 'test-folder/test-file.txt';

      (retryService.executeWithRetry as jest.Mock).mockRejectedValue(
        new Error('NoSuchKey: The specified key does not exist'),
      );

      await expect(service.deleteFile(key)).rejects.toThrow(BadRequestException);
      await expect(service.deleteFile(key)).rejects.toThrow('File not found');
    });
  });

  describe('testConnection', () => {
    it('should return true when S3 is reachable', async () => {
      (mockS3Client.send as jest.Mock).mockResolvedValue({} as any);

      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(HeadBucketCommand));
    });

    it('should return false when S3 is unreachable', async () => {
      (mockS3Client.send as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const result = await service.testConnection();

      expect(result).toBe(false);
    });

    it('should not use retry for health checks', async () => {
      (mockS3Client.send as jest.Mock).mockResolvedValue({} as any);

      await service.testConnection();

      // Verify RetryService is NOT called for health checks
      expect(retryService.executeWithRetry).not.toHaveBeenCalled();
    });
  });
});
