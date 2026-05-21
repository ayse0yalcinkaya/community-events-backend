// Libraries
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ExcelAdapterFactory } from '../src/modules/document-generator/factories/excel-adapter.factory';
import { PdfAdapterFactory } from '../src/modules/document-generator/factories/pdf-adapter.factory';

// Interfaces
import { DocumentGeneratorOptions } from '../src/modules/document-generator/interfaces/document-generator-options.interface';

// Enums
import { DocumentType } from '../src/modules/document-generator/enums/document-type.enum';

// Services
import { CacheService } from '../src/common/services/cache.service';
import { RetryService } from '../src/common/services/retry.service';

import {
  CACHE_SERVICE_TOKEN,
  DocumentGeneratorService,
  RETRY_SERVICE_TOKEN,
} from '../src/modules/document-generator/services/document-generator.service';

import { S3Service } from '../src/modules/files/services/s3.service';

// Modules
import { LoggerModule } from '../src/common/logger/logger.module';

// Mock uuid module
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

/**
 * AC-6.5.3.12: Integration Tests for Document Generator Cache & Retry
 *
 * Tests end-to-end integration of CacheService and RetryService
 * with DocumentGeneratorService for PDF and Excel generation.
 */
describe('DocumentGenerator Cache & Retry Integration (AC-6.5.3.12)', () => {
  let module: TestingModule;
  let documentGeneratorService: DocumentGeneratorService;
  let cacheService: CacheService;
  let retryService: RetryService;
  let s3Service: jest.Mocked<S3Service>;
  let pdfAdapterFactory: jest.Mocked<PdfAdapterFactory>;
  let excelAdapterFactory: jest.Mocked<ExcelAdapterFactory>;

  const mockPdfAdapter = {
    templateName: 'test-template',
    styleName: 'test-style',
    generate: jest.fn(),
    getTemplatePath: jest.fn(),
    getStylePath: jest.fn(),
  };

  const mockExcelAdapter = {
    adapterName: 'test-adapter',
    generate: jest.fn(),
    buildWorkbook: jest.fn(),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env'],
        }),
        // Use memory cache for testing (no Redis required)
        CacheModule.register({
          store: 'memory',
          ttl: 3600,
        }),
        LoggerModule,
      ],
      providers: [
        DocumentGeneratorService,
        {
          provide: CACHE_SERVICE_TOKEN,
          useClass: CacheService,
        },
        {
          provide: RETRY_SERVICE_TOKEN,
          useClass: RetryService,
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

    documentGeneratorService = module.get<DocumentGeneratorService>(DocumentGeneratorService);
    cacheService = module.get<CacheService>(CACHE_SERVICE_TOKEN);
    retryService = module.get<RetryService>(RETRY_SERVICE_TOKEN);
    s3Service = module.get(S3Service);
    pdfAdapterFactory = module.get(PdfAdapterFactory);
    excelAdapterFactory = module.get(ExcelAdapterFactory);
  });

  afterAll(async () => {
    await module.close();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    // Clear cache between tests to prevent cache hit from previous tests
    await cacheService.clear();
  });

  describe('PDF Generation with Cache Integration (AC-6.5.3.12)', () => {
    const baseOptions: DocumentGeneratorOptions = {
      templateName: 'test-template',
      data: { test: 'data' },
      lang: 'en',
      s3Options: {
        path: 'documents/test',
      },
    };

    it('should generate PDF with cache miss and cache result', async () => {
      // Arrange
      const mockBuffer = Buffer.from('test-pdf-content');
      pdfAdapterFactory.getAdapter.mockReturnValue(mockPdfAdapter as any);
      mockPdfAdapter.generate.mockResolvedValue(mockBuffer);
      s3Service.uploadFile.mockResolvedValue('documents/test/file.pdf');
      s3Service.getPresignedUrl.mockResolvedValue('https://s3.amazonaws.com/bucket/file.pdf');

      // Act - First generation (cache miss)
      const result1 = await documentGeneratorService.generate(DocumentType.PDF, baseOptions);

      // Assert
      expect(result1.success).toBe(true);
      expect(result1.fileUrl).toBe('https://s3.amazonaws.com/bucket/file.pdf');
      expect(mockPdfAdapter.generate).toHaveBeenCalledTimes(1);
      expect(s3Service.uploadFile).toHaveBeenCalledTimes(1);
    });

    it('should return cached result on cache hit (PDF)', async () => {
      // Arrange
      const mockBuffer = Buffer.from('test-pdf-content');
      pdfAdapterFactory.getAdapter.mockReturnValue(mockPdfAdapter as any);
      mockPdfAdapter.generate.mockResolvedValue(mockBuffer);
      s3Service.uploadFile.mockResolvedValue('documents/test/file.pdf');
      s3Service.getPresignedUrl.mockResolvedValue('https://s3.amazonaws.com/bucket/file.pdf');

      // Act - First generation (cache miss)
      const result1 = await documentGeneratorService.generate(DocumentType.PDF, baseOptions);

      // Clear mocks before second call
      jest.clearAllMocks();

      // Act - Second generation (cache hit)
      const result2 = await documentGeneratorService.generate(DocumentType.PDF, baseOptions);

      // Assert - Second generation should use cache
      expect(result2.success).toBe(true);
      expect(mockPdfAdapter.generate).not.toHaveBeenCalled();
      expect(s3Service.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('Excel Generation with Cache Integration (AC-6.5.3.12)', () => {
    const baseOptions: DocumentGeneratorOptions = {
      templateName: 'test-template',
      data: { test: 'data' },
      lang: 'en',
      s3Options: {
        path: 'documents/test',
      },
    };

    it('should generate Excel with cache miss and cache result', async () => {
      // Arrange
      const mockBuffer = Buffer.from('test-excel-content');
      excelAdapterFactory.getAdapter.mockReturnValue(mockExcelAdapter as any);
      mockExcelAdapter.generate.mockResolvedValue(mockBuffer);
      s3Service.uploadFile.mockResolvedValue('documents/test/file.xlsx');
      s3Service.getPresignedUrl.mockResolvedValue('https://s3.amazonaws.com/bucket/file.xlsx');

      // Act - First generation (cache miss)
      const result1 = await documentGeneratorService.generate(DocumentType.EXCEL, baseOptions);

      // Assert
      expect(result1.success).toBe(true);
      expect(result1.fileUrl).toBe('https://s3.amazonaws.com/bucket/file.xlsx');
      expect(mockExcelAdapter.generate).toHaveBeenCalledTimes(1);
      expect(s3Service.uploadFile).toHaveBeenCalledTimes(1);
    });

    it('should return cached result on cache hit (Excel)', async () => {
      // Arrange
      const mockBuffer = Buffer.from('test-excel-content');
      excelAdapterFactory.getAdapter.mockReturnValue(mockExcelAdapter as any);
      mockExcelAdapter.generate.mockResolvedValue(mockBuffer);
      s3Service.uploadFile.mockResolvedValue('documents/test/file.xlsx');
      s3Service.getPresignedUrl.mockResolvedValue('https://s3.amazonaws.com/bucket/file.xlsx');

      // Act - First generation (cache miss)
      const result1 = await documentGeneratorService.generate(DocumentType.EXCEL, baseOptions);

      // Clear mocks before second call
      jest.clearAllMocks();

      // Act - Second generation (cache hit)
      const result2 = await documentGeneratorService.generate(DocumentType.EXCEL, baseOptions);

      // Assert - Second generation should use cache
      expect(result2.success).toBe(true);
      expect(mockExcelAdapter.generate).not.toHaveBeenCalled();
      expect(s3Service.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('Retry Integration with Real RetryService (AC-6.5.3.12)', () => {
    const baseOptions: DocumentGeneratorOptions = {
      templateName: 'retry-test',
      data: { retry: 'test' },
      lang: 'en',
      s3Options: {
        path: 'documents/retry',
      },
    };

    it('should successfully complete PDF generation with retry on transient failure', async () => {
      // Arrange
      const mockBuffer = Buffer.from('test-pdf-retry-content');
      pdfAdapterFactory.getAdapter.mockReturnValue(mockPdfAdapter as any);

      let callCount = 0;
      // Mock adapter to fail once, then succeed
      mockPdfAdapter.generate.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Transient Puppeteer timeout');
        }
        return mockBuffer;
      });

      s3Service.uploadFile.mockResolvedValue('documents/retry/file.pdf');
      s3Service.getPresignedUrl.mockResolvedValue('https://s3.amazonaws.com/bucket/retry-file.pdf');

      // Act
      const result = await documentGeneratorService.generate(DocumentType.PDF, baseOptions);

      // Assert - Should succeed after retry
      expect(result.success).toBe(true);
      expect(result.fileUrl).toBe('https://s3.amazonaws.com/bucket/retry-file.pdf');
      expect(callCount).toBe(2); // Verify retry happened
    });

    it('should successfully complete Excel generation with retry on transient failure', async () => {
      // Arrange
      const mockBuffer = Buffer.from('test-excel-retry-content');
      excelAdapterFactory.getAdapter.mockReturnValue(mockExcelAdapter as any);

      let callCount = 0;
      // Mock adapter to fail once, then succeed
      mockExcelAdapter.generate.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Transient ExcelJS error');
        }
        return mockBuffer;
      });

      s3Service.uploadFile.mockResolvedValue('documents/retry/file.xlsx');
      s3Service.getPresignedUrl.mockResolvedValue('https://s3.amazonaws.com/bucket/retry-file.xlsx');

      // Act
      const result = await documentGeneratorService.generate(DocumentType.EXCEL, baseOptions);

      // Assert - Should succeed after retry
      expect(result.success).toBe(true);
      expect(result.fileUrl).toBe('https://s3.amazonaws.com/bucket/retry-file.xlsx');
      expect(callCount).toBe(2); // Verify retry happened
    });
  });
});
