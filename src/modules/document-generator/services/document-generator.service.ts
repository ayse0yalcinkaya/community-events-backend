// Libraries
import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { v4 as uuidv4 } from 'uuid';

// Interfaces
import { DocumentGeneratorOptions } from '../interfaces/document-generator-options.interface';
import { GenerationResult } from '../interfaces/generation-result.interface';
import type { ICacheService } from '../interfaces/cache-service.interface';
import type { IRetryService } from '../interfaces/retry-service.interface';
import { IPdfAdapter } from '../interfaces/pdf-adapter.interface';
import { IExcelAdapter } from '../interfaces/excel-adapter.interface';

// Enums
import { CacheStrategy } from '../enums/cache-strategy.enum';
import { DocumentType } from '../enums/document-type.enum';

// Services
import { S3Service } from '../../files/services/s3.service';

// Factories
import { PdfAdapterFactory } from '../factories/pdf-adapter.factory';
import { ExcelAdapterFactory } from '../factories/excel-adapter.factory';

// Exceptions
import { AdapterNotFoundException } from '../exceptions/adapter-not-found.exception';
import { TemplateNotFoundException } from '../exceptions/template-not-found.exception';
import { GenerationFailedException } from '../exceptions/generation-failed.exception';

// Injection tokens
export const CACHE_SERVICE_TOKEN = 'ICacheService';
export const RETRY_SERVICE_TOKEN = 'IRetryService';

/**
 * Document Generator Service
 *
 * Orchestrates document generation flow:
 * Cache check → Adapter retrieval → Generation → S3 upload → Cache update
 *
 * Supports PDF and Excel document generation with caching and retry mechanisms.
 *
 * Dependencies:
 * - CacheService (Story 6.5 - placeholder interface)
 * - RetryService (Story 6.6 - placeholder interface)
 * - S3Service (Epic 4 - existing)
 * - PdfAdapterFactory (Story 6.3 - existing)
 * - ExcelAdapterFactory (Story 6.3 - existing)
 * - I18nService (Epic 7 - optional)
 */
@Injectable()
export class DocumentGeneratorService {
  private readonly logger = new Logger(DocumentGeneratorService.name);

  // Default values
  private readonly DEFAULT_CACHE_STRATEGY = CacheStrategy.TEMPLATE_HASH;
  private readonly DEFAULT_ACL = 'public-read';

  // Configuration values from environment
  private readonly cacheTTL: number;
  private readonly retryMaxAttempts: number;
  private readonly retryBaseDelay: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
    private readonly pdfAdapterFactory: PdfAdapterFactory,
    private readonly excelAdapterFactory: ExcelAdapterFactory,
    @Optional()
    @Inject(CACHE_SERVICE_TOKEN)
    private readonly cacheService?: ICacheService,
    @Optional()
    @Inject(RETRY_SERVICE_TOKEN)
    private readonly retryService?: IRetryService,
    @Optional() private readonly i18n?: I18nService,
  ) {
    // Load configuration values
    this.cacheTTL = this.configService.get<number>('DOCUMENT_CACHE_TTL', 3600000);
    this.retryMaxAttempts = this.configService.get<number>('DOCUMENT_RETRY_MAX_ATTEMPTS', 3);
    this.retryBaseDelay = this.configService.get<number>('DOCUMENT_RETRY_BASE_DELAY', 1000);

    this.logger.log('DocumentGeneratorService initialized', {
      module: DocumentGeneratorService.name,
      cacheTTL: this.cacheTTL,
      retryMaxAttempts: this.retryMaxAttempts,
      retryBaseDelay: this.retryBaseDelay,
    });
  }

  /**
   * Generate document
   *
   * Orchestrates the complete document generation flow:
   * 1. Cache check (if strategy !== NO_CACHE)
   * 2. Adapter retrieval from factory
   * 3. Document generation via adapter
   * 4. S3 upload with retry
   * 5. Cache update
   *
   * @param documentType - Document type (PDF or EXCEL)
   * @param options - Generation options
   * @returns Generation result with S3 URL and metadata
   * @throws {AdapterNotFoundException} If adapter not found
   * @throws {TemplateNotFoundException} If template not found
   * @throws {GenerationFailedException} If generation or upload fails
   */
  async generate(documentType: DocumentType, options: DocumentGeneratorOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    const cacheStrategy = options.cacheStrategy ?? this.DEFAULT_CACHE_STRATEGY;
    const cacheTtl = options.cacheTtl ?? this.cacheTTL;

    this.logger.log('Starting document generation', {
      module: DocumentGeneratorService.name,
      method: 'generate',
      documentType,
      templateName: options.templateName,
      cacheStrategy,
    });

    // Step 1: Cache check (if strategy !== NO_CACHE)
    if (cacheStrategy !== CacheStrategy.NO_CACHE && this.cacheService) {
      try {
        const cacheKey = this.generateCacheKey(documentType, options.templateName, options.data);

        const cachedResult = await this.cacheService.get<GenerationResult>(cacheKey);

        if (cachedResult) {
          this.logger.log(`Cache hit for key: ${cacheKey}`, {
            module: DocumentGeneratorService.name,
            method: 'generate',
            cacheKey,
          });

          return cachedResult;
        }

        this.logger.log(`Cache miss, generating document: ${documentType} - ${options.templateName}`, {
          module: DocumentGeneratorService.name,
          method: 'generate',
          cacheKey,
        });
      } catch (error) {
        this.logger.warn(
          'Cache check failed, proceeding with generation',
          error instanceof Error ? error.stack : undefined,
        );
        // Continue with generation if cache check fails
      }
    }

    // Step 2: Adapter retrieval
    let adapter: IPdfAdapter | IExcelAdapter;
    try {
      if (documentType === DocumentType.PDF) {
        adapter = this.pdfAdapterFactory.getAdapter(options.templateName);
      } else if (documentType === DocumentType.EXCEL) {
        adapter = this.excelAdapterFactory.getAdapter(options.templateName);
      } else {
        throw new GenerationFailedException(`Unsupported document type: ${documentType}`, {
          documentType,
          templateName: options.templateName,
        });
      }
    } catch (error) {
      if (error instanceof AdapterNotFoundException) {
        throw error;
      }
      throw new AdapterNotFoundException(options.templateName, documentType.toLowerCase() as 'pdf' | 'excel');
    }

    // Step 3: Document generation with retry
    let buffer: Buffer;
    const generationStartTime = Date.now();

    try {
      if (documentType === DocumentType.PDF) {
        // Wrap PDF generation with retry service
        if (this.retryService) {
          buffer = await this.retryService.executeWithRetry(
            async () => await (adapter as IPdfAdapter).generate(options.templateName, options.data, options.lang),
            {
              maxAttempts: this.retryMaxAttempts,
              baseDelay: this.retryBaseDelay,
              context: `PDF Generation: ${options.templateName}`,
            },
          );
        } else {
          // Fallback: direct generation without retry
          buffer = await (adapter as IPdfAdapter).generate(options.templateName, options.data, options.lang);
        }
      } else {
        // Wrap Excel generation with retry service
        if (this.retryService) {
          buffer = await this.retryService.executeWithRetry(
            async () => await (adapter as IExcelAdapter).generate(options.data, options.lang),
            {
              maxAttempts: this.retryMaxAttempts,
              baseDelay: this.retryBaseDelay,
              context: `Excel Generation: ${options.templateName}`,
            },
          );
        } else {
          // Fallback: direct generation without retry
          buffer = await (adapter as IExcelAdapter).generate(options.data, options.lang);
        }
      }

      const generationTime = Date.now() - generationStartTime;
      const fileSize = buffer.length;

      this.logger.log('Document generated successfully', {
        module: DocumentGeneratorService.name,
        method: 'generate',
        documentType,
        templateName: options.templateName,
        fileSize,
        generationTime,
      });
    } catch (error) {
      if (error instanceof TemplateNotFoundException) {
        throw error;
      }
      throw new GenerationFailedException(
        `Document generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          documentType,
          templateName: options.templateName,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }

    // Step 4: S3 upload with retry
    const filename = this.generateFilename(options.s3Options.filename, documentType);
    const contentType = this.detectContentType(options.s3Options.contentType, documentType);
    const s3Key = `${options.s3Options.path}/${filename}`;

    let uploadedKey: string;
    try {
      if (this.retryService) {
        uploadedKey = await this.retryService.executeWithRetry(
          async () => await this.s3Service.uploadFile(buffer, s3Key, contentType),
          {
            maxAttempts: this.retryMaxAttempts,
            baseDelay: this.retryBaseDelay,
            context: `S3 upload: ${s3Key}`,
          },
        );
      } else {
        // Fallback: direct upload without retry wrapper
        uploadedKey = await this.s3Service.uploadFile(buffer, s3Key, contentType);
      }

      this.logger.log('File uploaded to S3 successfully', {
        module: DocumentGeneratorService.name,
        method: 'generate',
        s3Key: uploadedKey,
        fileSize: buffer.length,
      });
    } catch (error) {
      this.logger.error('S3 upload failed', {
        module: DocumentGeneratorService.name,
        method: 'generate',
        s3Key,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new GenerationFailedException(
        `S3 upload failed after retries: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          documentType,
          templateName: options.templateName,
          s3Key,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }

    // Step 5: Generate file URL
    let fileUrl: string;
    try {
      // For public-read ACL, generate pre-signed URL
      // For private ACL, use pre-signed URL with expiration
      const acl = options.s3Options.acl ?? this.DEFAULT_ACL;
      if (acl === 'public-read') {
        // Generate pre-signed URL (15 minutes default)
        fileUrl = await this.s3Service.getPresignedUrl(uploadedKey, 900);
      } else {
        // For private files, use pre-signed URL with longer expiration
        fileUrl = await this.s3Service.getPresignedUrl(uploadedKey, 3600);
      }
    } catch (error) {
      this.logger.warn(
        'Failed to generate pre-signed URL, using S3 key',
        error instanceof Error ? error.stack : undefined,
      );
      // Fallback: construct S3 URL from key (may not be accessible depending on ACL)
      fileUrl = uploadedKey;
    }

    // Calculate metrics before cache update
    const totalTime = Date.now() - startTime;
    const generationTime = Date.now() - generationStartTime;

    // Step 6: Cache update
    if (cacheStrategy !== CacheStrategy.NO_CACHE && this.cacheService) {
      try {
        const cacheKey = this.generateCacheKey(documentType, options.templateName, options.data);

        const result: GenerationResult = {
          success: true,
          fileUrl,
          cached: false,
          generatedAt: new Date(),
          fileSize: buffer.length,
          generationTime,
          metadata: options.metadata,
        };

        await this.cacheService.set(cacheKey, result, cacheTtl);

        this.logger.log(`Cached result for key: ${cacheKey}`, {
          module: DocumentGeneratorService.name,
          method: 'generate',
          cacheKey,
        });
      } catch (error) {
        this.logger.warn(`Cache write failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
          module: DocumentGeneratorService.name,
          method: 'generate',
          cacheKey: this.generateCacheKey(documentType, options.templateName, options.data),
        });
        // Don't fail generation if cache update fails
      }
    }

    this.logger.log('Document generation completed', {
      module: DocumentGeneratorService.name,
      method: 'generate',
      documentType,
      templateName: options.templateName,
      fileUrl: fileUrl.substring(0, 50) + '...', // Log partial URL only
      fileSize: buffer.length,
      generationTime,
      totalTime,
    });

    // Step 7: Return result
    return {
      success: true,
      fileUrl,
      cached: false,
      generatedAt: new Date(),
      fileSize: buffer.length,
      generationTime,
      metadata: options.metadata,
    };
  }

  /**
   * Generate cache key for document generation
   *
   * Pattern: document:{format}:{templateName}:{dataHash}
   * Example: document:PDF:invoice:a1b2c3d4...
   *
   * @param documentType - Document type (PDF or EXCEL)
   * @param templateName - Template/adapter name
   * @param data - Data object (will be hashed)
   * @returns Cache key string
   */
  private generateCacheKey(documentType: DocumentType, templateName: string, data: any): string {
    return this.cacheService!.generateCacheKey('document', documentType, templateName, data);
  }

  /**
   * Generate filename with UUID and extension
   *
   * @param providedFilename - Optional filename from options
   * @param documentType - Document type to determine extension
   * @returns Generated filename
   */
  private generateFilename(providedFilename: string | undefined, documentType: DocumentType): string {
    if (providedFilename) {
      return providedFilename;
    }

    const extension = documentType === DocumentType.PDF ? '.pdf' : '.xlsx';
    return `${uuidv4()}${extension}`;
  }

  /**
   * Detect content type based on document type
   *
   * @param providedContentType - Optional content type from options
   * @param documentType - Document type to determine MIME type
   * @returns MIME type string
   */
  private detectContentType(providedContentType: string | undefined, documentType: DocumentType): string {
    if (providedContentType) {
      return providedContentType;
    }

    if (documentType === DocumentType.PDF) {
      return 'application/pdf';
    } else {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
  }
}
