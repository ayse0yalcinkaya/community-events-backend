// Libraries
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

// Exceptions
import { AdapterNotFoundException } from '../../exceptions/adapter-not-found.exception';
import { GenerationFailedException } from '../../exceptions/generation-failed.exception';
import { TemplateNotFoundException } from '../../exceptions/template-not-found.exception';
import { ExcelAdapterFactory } from '../../factories/excel-adapter.factory';
// Factories
import { PdfAdapterFactory } from '../../factories/pdf-adapter.factory';
import { I18nService } from 'nestjs-i18n';
import type { ICacheService } from '../../interfaces/cache-service.interface';
// Interfaces
import { DocumentGeneratorOptions } from '../../interfaces/document-generator-options.interface';
import { IExcelAdapter } from '../../interfaces/excel-adapter.interface';
import { IPdfAdapter } from '../../interfaces/pdf-adapter.interface';
import type { IRetryService } from '../../interfaces/retry-service.interface';
// Enums
import { CacheStrategy } from '../../enums/cache-strategy.enum';
import { DocumentType } from '../../enums/document-type.enum';
import { S3Service } from '../../../files/services/s3.service';
// Services
import { CACHE_SERVICE_TOKEN, DocumentGeneratorService, RETRY_SERVICE_TOKEN } from '../document-generator.service';

// Mock uuid module
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
}));

describe('DocumentGeneratorService', () => {
  let service: DocumentGeneratorService;
  let s3Service: jest.Mocked<S3Service>;
  let pdfAdapterFactory: jest.Mocked<PdfAdapterFactory>;
  let excelAdapterFactory: jest.Mocked<ExcelAdapterFactory>;
  let cacheService: jest.Mocked<ICacheService>;
  let retryService: jest.Mocked<IRetryService>;

  const mockPdfAdapter: jest.Mocked<IPdfAdapter> = {
    templateName: 'test-template',
    styleName: 'test-style',
    generate: jest.fn(),
    getTemplatePath: jest.fn(),
    getStylePath: jest.fn(),
  };

  const mockExcelAdapter: jest.Mocked<IExcelAdapter> = {
    adapterName: 'test-adapter',
    generate: jest.fn(),
    buildWorkbook: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentGeneratorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                DOCUMENT_CACHE_TTL: 3600000,
                DOCUMENT_RETRY_MAX_ATTEMPTS: 3,
                DOCUMENT_RETRY_BASE_DELAY: 1000,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: S3Service,
          useValue: {
            uploadFile: jest.fn(),
            getPresignedUrl: jest.fn(),
          },
        },
        {
          provide: PdfAdapterFactory,
          useValue: {
            getAdapter: jest.fn(),
          },
        },
        {
          provide: ExcelAdapterFactory,
          useValue: {
            getAdapter: jest.fn(),
          },
        },
        {
          provide: CACHE_SERVICE_TOKEN,
          useValue: {
            generateCacheKey: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: RETRY_SERVICE_TOKEN,
          useValue: {
            executeWithRetry: jest.fn(),
          },
        },
        {
          provide: I18nService,
          useValue: {
            t: jest.fn((key: string) => key),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentGeneratorService>(DocumentGeneratorService);
    s3Service = module.get(S3Service);
    pdfAdapterFactory = module.get(PdfAdapterFactory);
    excelAdapterFactory = module.get(ExcelAdapterFactory);
    cacheService = module.get(CACHE_SERVICE_TOKEN);
    retryService = module.get(RETRY_SERVICE_TOKEN);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generate', () => {
    const baseOptions: DocumentGeneratorOptions = {
      templateName: 'test-template',
      data: { test: 'data' },
      lang: 'en',
      s3Options: {
        path: 'documents/test',
      },
    };

    describe('Cache hit scenario', () => {
      it('should return cached GenerationResult when cache hit', async () => {
        // Arrange
        const cachedResult = {
          success: true,
          fileUrl: 'https://s3.amazonaws.com/bucket/cached-file.pdf',
          cached: false, // Original generation was not cached
          generatedAt: new Date('2024-01-01'),
          fileSize: 1024,
          generationTime: 500,
          metadata: { userId: '123' },
        };
        cacheService.generateCacheKey.mockReturnValue('document:abc123...');
        cacheService.get.mockResolvedValue(cachedResult);

        // Act
        const result = await service.generate(DocumentType.PDF, baseOptions);

        // Assert
        expect(result.success).toBe(true);
        expect(result.fileUrl).toBe(cachedResult.fileUrl);
        expect(result.fileSize).toBe(1024);
        expect(cacheService.get).toHaveBeenCalledWith('document:abc123...');
        expect(pdfAdapterFactory.getAdapter).not.toHaveBeenCalled();
        expect(s3Service.uploadFile).not.toHaveBeenCalled();
      });
    });

    describe('Cache miss scenario', () => {
      beforeEach(() => {
        cacheService.generateCacheKey.mockReturnValue('cache-key-123');
        cacheService.get.mockResolvedValue(null);
        s3Service.getPresignedUrl.mockResolvedValue('https://s3.amazonaws.com/bucket/file.pdf');
      });

      it('should generate PDF document when cache miss', async () => {
        // Arrange
        const mockBuffer = Buffer.from('test-pdf-content');
        pdfAdapterFactory.getAdapter.mockReturnValue(mockPdfAdapter);
        mockPdfAdapter.generate.mockResolvedValue(mockBuffer);
        s3Service.uploadFile.mockResolvedValue('documents/test/file.pdf');
        retryService.executeWithRetry.mockImplementation(async (operation) => operation());

        // Act
        const result = await service.generate(DocumentType.PDF, baseOptions);

        // Assert
        expect(result.success).toBe(true);
        expect(result.cached).toBe(false);
        expect(result.fileUrl).toBe('https://s3.amazonaws.com/bucket/file.pdf');
        expect(result.fileSize).toBe(mockBuffer.length);
        expect(result.generationTime).toBeDefined();
        expect(pdfAdapterFactory.getAdapter).toHaveBeenCalledWith('test-template');
        expect(mockPdfAdapter.generate).toHaveBeenCalledWith('test-template', { test: 'data' }, 'en');
        expect(s3Service.uploadFile).toHaveBeenCalled();
        expect(cacheService.set).toHaveBeenCalled();
      });

      it('should generate Excel document when cache miss', async () => {
        // Arrange
        const mockBuffer = Buffer.from('test-excel-content');
        excelAdapterFactory.getAdapter.mockReturnValue(mockExcelAdapter);
        mockExcelAdapter.generate.mockResolvedValue(mockBuffer);
        s3Service.uploadFile.mockResolvedValue('documents/test/file.xlsx');
        retryService.executeWithRetry.mockImplementation(async (operation) => operation());

        // Act
        const result = await service.generate(DocumentType.EXCEL, baseOptions);

        // Assert
        expect(result.success).toBe(true);
        expect(result.cached).toBe(false);
        expect(mockExcelAdapter.generate).toHaveBeenCalledWith({ test: 'data' }, 'en');
        expect(s3Service.uploadFile).toHaveBeenCalled();
      });
    });

    describe('Error handling', () => {
      beforeEach(() => {
        cacheService.generateCacheKey.mockReturnValue('cache-key-123');
        cacheService.get.mockResolvedValue(null);
      });

      it('should throw AdapterNotFoundException when adapter not found', async () => {
        // Arrange
        pdfAdapterFactory.getAdapter.mockImplementation(() => {
          throw new AdapterNotFoundException('test-template', 'pdf');
        });

        // Act & Assert
        await expect(service.generate(DocumentType.PDF, baseOptions)).rejects.toThrow(AdapterNotFoundException);
      });

      it('should throw TemplateNotFoundException when template not found', async () => {
        // Arrange
        pdfAdapterFactory.getAdapter.mockReturnValue(mockPdfAdapter);
        const templateError = new TemplateNotFoundException('/path/to/template.ejs');
        mockPdfAdapter.generate.mockRejectedValue(templateError);
        retryService.executeWithRetry.mockRejectedValue(templateError);

        // Act & Assert
        await expect(service.generate(DocumentType.PDF, baseOptions)).rejects.toThrow(TemplateNotFoundException);
      });

      it('should throw GenerationFailedException when generation fails', async () => {
        // Arrange
        pdfAdapterFactory.getAdapter.mockReturnValue(mockPdfAdapter);
        mockPdfAdapter.generate.mockRejectedValue(new Error('Generation error'));

        // Act & Assert
        await expect(service.generate(DocumentType.PDF, baseOptions)).rejects.toThrow(GenerationFailedException);
      });

      it('should throw GenerationFailedException when S3 upload fails', async () => {
        // Arrange
        const mockBuffer = Buffer.from('test-pdf-content');
        pdfAdapterFactory.getAdapter.mockReturnValue(mockPdfAdapter);
        mockPdfAdapter.generate.mockResolvedValue(mockBuffer);
        retryService.executeWithRetry.mockRejectedValue(new Error('S3 upload failed'));

        // Act & Assert
        await expect(service.generate(DocumentType.PDF, baseOptions)).rejects.toThrow(GenerationFailedException);
      });
    });

    describe('Default values', () => {
      beforeEach(() => {
        cacheService.generateCacheKey.mockReturnValue('cache-key-123');
        cacheService.get.mockResolvedValue(null);
        s3Service.getPresignedUrl.mockResolvedValue('https://s3.amazonaws.com/bucket/file.pdf');
      });

      it('should use default cache TTL (3600000ms)', async () => {
        // Arrange
        const mockBuffer = Buffer.from('test-pdf-content');
        pdfAdapterFactory.getAdapter.mockReturnValue(mockPdfAdapter);
        mockPdfAdapter.generate.mockResolvedValue(mockBuffer);
        s3Service.uploadFile.mockResolvedValue('documents/test/file.pdf');
        retryService.executeWithRetry.mockImplementation(async (operation) => operation());

        // Act
        await service.generate(DocumentType.PDF, baseOptions);

        // Assert
        expect(cacheService.set).toHaveBeenCalledWith(
          'cache-key-123',
          expect.objectContaining({
            success: true,
            fileUrl: expect.any(String),
            cached: false,
            generatedAt: expect.any(Date),
            fileSize: mockBuffer.length,
            generationTime: expect.any(Number),
          }),
          3600000,
        );
      });

      it('should use default cache strategy (TEMPLATE_HASH)', async () => {
        // Arrange
        const mockBuffer = Buffer.from('test-pdf-content');
        pdfAdapterFactory.getAdapter.mockReturnValue(mockPdfAdapter);
        mockPdfAdapter.generate.mockResolvedValue(mockBuffer);
        s3Service.uploadFile.mockResolvedValue('documents/test/file.pdf');
        retryService.executeWithRetry.mockImplementation(async (operation) => operation());

        // Act
        await service.generate(DocumentType.PDF, baseOptions);

        // Assert
        expect(cacheService.generateCacheKey).toHaveBeenCalled();
      });

      it('should use default ACL (public-read)', async () => {
        // Arrange
        const mockBuffer = Buffer.from('test-pdf-content');
        pdfAdapterFactory.getAdapter.mockReturnValue(mockPdfAdapter);
        mockPdfAdapter.generate.mockResolvedValue(mockBuffer);
        s3Service.uploadFile.mockResolvedValue('documents/test/file.pdf');
        retryService.executeWithRetry.mockImplementation(async (operation) => operation());

        // Act
        await service.generate(DocumentType.PDF, baseOptions);

        // Assert
        expect(s3Service.getPresignedUrl).toHaveBeenCalledWith(
          expect.any(String),
          900, // 15 minutes for public-read
        );
      });

      it('should auto-generate filename with UUID and extension', async () => {
        // Arrange
        const mockBuffer = Buffer.from('test-pdf-content');
        pdfAdapterFactory.getAdapter.mockReturnValue(mockPdfAdapter);
        mockPdfAdapter.generate.mockResolvedValue(mockBuffer);
        s3Service.uploadFile.mockResolvedValue('documents/test/file.pdf');
        retryService.executeWithRetry.mockImplementation(async (operation) => operation());

        // Act
        await service.generate(DocumentType.PDF, baseOptions);

        // Assert
        const uploadCall = s3Service.uploadFile.mock.calls[0];
        expect(uploadCall[1]).toMatch(/^documents\/test\/[a-f0-9-]+\.pdf$/);
        expect(uploadCall[1]).toContain('a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf');
      });

      it('should auto-detect content type for PDF', async () => {
        // Arrange
        const mockBuffer = Buffer.from('test-pdf-content');
        pdfAdapterFactory.getAdapter.mockReturnValue(mockPdfAdapter);
        mockPdfAdapter.generate.mockResolvedValue(mockBuffer);
        s3Service.uploadFile.mockResolvedValue('documents/test/file.pdf');
        retryService.executeWithRetry.mockImplementation(async (operation) => operation());

        // Act
        await service.generate(DocumentType.PDF, baseOptions);

        // Assert
        const uploadCall = s3Service.uploadFile.mock.calls[0];
        expect(uploadCall[2]).toBe('application/pdf');
      });

      it('should auto-detect content type for Excel', async () => {
        // Arrange
        const mockBuffer = Buffer.from('test-excel-content');
        excelAdapterFactory.getAdapter.mockReturnValue(mockExcelAdapter);
        mockExcelAdapter.generate.mockResolvedValue(mockBuffer);
        s3Service.uploadFile.mockResolvedValue('documents/test/file.xlsx');
        retryService.executeWithRetry.mockImplementation(async (operation) => operation());

        // Act
        await service.generate(DocumentType.EXCEL, baseOptions);

        // Assert
        const uploadCall = s3Service.uploadFile.mock.calls[0];
        expect(uploadCall[2]).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      });
    });

    describe('NO_CACHE strategy', () => {
      it('should skip cache check when strategy is NO_CACHE', async () => {
        // Arrange
        const mockBuffer = Buffer.from('test-pdf-content');
        pdfAdapterFactory.getAdapter.mockReturnValue(mockPdfAdapter);
        mockPdfAdapter.generate.mockResolvedValue(mockBuffer);
        s3Service.uploadFile.mockResolvedValue('documents/test/file.pdf');
        s3Service.getPresignedUrl.mockResolvedValue('https://s3.amazonaws.com/bucket/file.pdf');
        retryService.executeWithRetry.mockImplementation(async (operation) => operation());

        const options: DocumentGeneratorOptions = {
          ...baseOptions,
          cacheStrategy: CacheStrategy.NO_CACHE,
        };

        // Act
        await service.generate(DocumentType.PDF, options);

        // Assert
        expect(cacheService.get).not.toHaveBeenCalled();
        expect(cacheService.set).not.toHaveBeenCalled();
      });
    });

    describe('Retry scenarios', () => {
      beforeEach(() => {
        cacheService.generateCacheKey.mockReturnValue('cache-key-123');
        cacheService.get.mockResolvedValue(null);
        s3Service.getPresignedUrl.mockResolvedValue('https://s3.amazonaws.com/bucket/file.pdf');
      });

      it('should retry PDF generation on failure', async () => {
        // Arrange
        const mockBuffer = Buffer.from('test-pdf-content');
        pdfAdapterFactory.getAdapter.mockReturnValue(mockPdfAdapter);
        mockPdfAdapter.generate.mockRejectedValueOnce(new Error('Puppeteer timeout')).mockResolvedValueOnce(mockBuffer);
        s3Service.uploadFile.mockResolvedValue('documents/test/file.pdf');

        // Mock retry service to execute operation twice
        let attemptCount = 0;
        retryService.executeWithRetry.mockImplementation(async (operation) => {
          attemptCount++;
          if (attemptCount === 1) {
            try {
              return await operation();
            } catch (error) {
              // First attempt fails, retry
              attemptCount++;
              return await operation();
            }
          }
          return await operation();
        });

        // Act
        const result = await service.generate(DocumentType.PDF, baseOptions);

        // Assert
        expect(result.success).toBe(true);
        expect(mockPdfAdapter.generate).toHaveBeenCalledTimes(2);
        expect(retryService.executeWithRetry).toHaveBeenCalledWith(
          expect.any(Function),
          expect.objectContaining({
            maxAttempts: 3,
            baseDelay: 1000,
            context: 'PDF Generation: test-template',
          }),
        );
      });

      it('should retry Excel generation on failure', async () => {
        // Arrange
        const mockBuffer = Buffer.from('test-excel-content');
        excelAdapterFactory.getAdapter.mockReturnValue(mockExcelAdapter);
        mockExcelAdapter.generate.mockRejectedValueOnce(new Error('ExcelJS error')).mockResolvedValueOnce(mockBuffer);
        s3Service.uploadFile.mockResolvedValue('documents/test/file.xlsx');

        // Mock retry service to execute operation twice
        let attemptCount = 0;
        retryService.executeWithRetry.mockImplementation(async (operation) => {
          attemptCount++;
          if (attemptCount === 1) {
            try {
              return await operation();
            } catch (error) {
              // First attempt fails, retry
              attemptCount++;
              return await operation();
            }
          }
          return await operation();
        });

        // Act
        const result = await service.generate(DocumentType.EXCEL, baseOptions);

        // Assert
        expect(result.success).toBe(true);
        expect(mockExcelAdapter.generate).toHaveBeenCalledTimes(2);
        expect(retryService.executeWithRetry).toHaveBeenCalledWith(
          expect.any(Function),
          expect.objectContaining({
            maxAttempts: 3,
            baseDelay: 1000,
            context: 'Excel Generation: test-template',
          }),
        );
      });

      it('should throw error after retry exhaustion', async () => {
        // Arrange
        pdfAdapterFactory.getAdapter.mockReturnValue(mockPdfAdapter);
        mockPdfAdapter.generate.mockRejectedValue(new Error('Persistent failure'));
        retryService.executeWithRetry.mockRejectedValue(new Error('All 3 attempts failed'));

        // Act & Assert
        await expect(service.generate(DocumentType.PDF, baseOptions)).rejects.toThrow(GenerationFailedException);
      });
    });

    describe('Cache write failure', () => {
      beforeEach(() => {
        cacheService.generateCacheKey.mockReturnValue('cache-key-123');
        cacheService.get.mockResolvedValue(null);
        s3Service.getPresignedUrl.mockResolvedValue('https://s3.amazonaws.com/bucket/file.pdf');
      });

      it('should continue generation when cache write fails (non-blocking)', async () => {
        // Arrange
        const mockBuffer = Buffer.from('test-pdf-content');
        pdfAdapterFactory.getAdapter.mockReturnValue(mockPdfAdapter);
        mockPdfAdapter.generate.mockResolvedValue(mockBuffer);
        s3Service.uploadFile.mockResolvedValue('documents/test/file.pdf');
        retryService.executeWithRetry.mockImplementation(async (operation) => operation());
        cacheService.set.mockRejectedValue(new Error('Redis connection failed'));

        // Act
        const result = await service.generate(DocumentType.PDF, baseOptions);

        // Assert
        expect(result.success).toBe(true);
        expect(result.fileUrl).toBe('https://s3.amazonaws.com/bucket/file.pdf');
        expect(cacheService.set).toHaveBeenCalled();
        // Generation should succeed despite cache write failure
      });
    });

    describe('Without cache and retry services', () => {
      beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            DocumentGeneratorService,
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn((key: string, defaultValue?: any) => {
                  const config: Record<string, any> = {
                    DOCUMENT_CACHE_TTL: 3600000,
                    DOCUMENT_RETRY_MAX_ATTEMPTS: 3,
                    DOCUMENT_RETRY_BASE_DELAY: 1000,
                  };
                  return config[key] ?? defaultValue;
                }),
              },
            },
            {
              provide: S3Service,
              useValue: {
                uploadFile: jest.fn(),
                getPresignedUrl: jest.fn(),
              },
            },
            {
              provide: PdfAdapterFactory,
              useValue: {
                getAdapter: jest.fn(),
              },
            },
            {
              provide: ExcelAdapterFactory,
              useValue: {
                getAdapter: jest.fn(),
              },
            },
          ],
        }).compile();

        service = module.get<DocumentGeneratorService>(DocumentGeneratorService);
        s3Service = module.get(S3Service);
        pdfAdapterFactory = module.get(PdfAdapterFactory);
      });

      it('should work without cache service', async () => {
        // Arrange
        const mockBuffer = Buffer.from('test-pdf-content');
        pdfAdapterFactory.getAdapter.mockReturnValue(mockPdfAdapter);
        mockPdfAdapter.generate.mockResolvedValue(mockBuffer);
        s3Service.uploadFile.mockResolvedValue('documents/test/file.pdf');
        s3Service.getPresignedUrl.mockResolvedValue('https://s3.amazonaws.com/bucket/file.pdf');

        // Act
        const result = await service.generate(DocumentType.PDF, baseOptions);

        // Assert
        expect(result.success).toBe(true);
        expect(s3Service.uploadFile).toHaveBeenCalled();
      });
    });
  });
});
