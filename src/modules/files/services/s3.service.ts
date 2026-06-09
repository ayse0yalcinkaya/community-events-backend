// Libraries
import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

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

/**
 * S3Service Interface - Contract for AWS S3 operations
 */
export interface IS3Service {
  /**
   * Upload file to S3
   * @param buffer - File buffer
   * @param key - S3 object key (format: {domainID}/{userID}/{timestamp}-{filename})
   * @param mimeType - MIME type (e.g., image/png, application/pdf)
   * @returns S3 key of uploaded file
   */
  uploadFile(buffer: Buffer, key: string, mimeType: string): Promise<string>;

  /**
   * Generate pre-signed download URL
   * @param key - S3 object key
   * @param expiresIn - Expiration in seconds (default 900 = 15 minutes)
   * @returns Pre-signed URL (valid for specified duration)
   */
  getPresignedUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Delete file from S3
   * @param key - S3 object key
   * @returns void (throws exception on failure)
   */
  deleteFile(key: string): Promise<void>;

  /**
   * Test S3 connectivity
   * @returns true if S3 is reachable, false otherwise
   */
  testConnection(): Promise<boolean>;
}

@Injectable()
export class S3Service implements IS3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly retryMaxAttempts: number;
  private readonly retryBaseDelay: number;

  constructor(
    private configService: ConfigService,
    private readonly retryService: RetryService,
    private readonly i18n: I18nService,
  ) {
    const awsConfig = this.configService.get('aws');

    if (!awsConfig) {
      throw new Error('AWS configuration is missing');
    }

    this.bucket = awsConfig.s3.bucket;

    if (!this.bucket) {
      throw new Error('S3_BUCKET is required but not defined');
    }

    // Initialize S3Client with AWS credentials
    const s3ClientConfig: any = {
      region: awsConfig.region,
      credentials: {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
      },
    };

    // Optional MinIO configuration for local development
    if (awsConfig.s3.endpoint) {
      s3ClientConfig.endpoint = awsConfig.s3.endpoint;
    }

    if (awsConfig.s3.forcePathStyle) {
      s3ClientConfig.forcePathStyle = awsConfig.s3.forcePathStyle;
    }

    this.s3Client = new S3Client(s3ClientConfig);

    // Load retry configuration from environment
    this.retryMaxAttempts = this.configService.get<number>('S3_RETRY_MAX_ATTEMPTS', 5);
    this.retryBaseDelay = this.configService.get<number>('S3_RETRY_BASE_DELAY', 2000);

    this.logger.log(`S3Service initialized with bucket: ${this.bucket}`);
  }

  /**
   * Upload file to S3 with retry logic
   */
  async uploadFile(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    this.logger.log(`[S3Service] Uploading file: ${key}`);

    try {
      const result = await this.retryService.executeWithRetry(
        async () => {
          const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
          });

          return await this.s3Client.send(command);
        },
        {
          maxAttempts: this.retryMaxAttempts,
          baseDelay: this.retryBaseDelay,
          context: `S3 Upload: ${key}`,
        },
      );

      this.logger.log(`[S3Service] File uploaded successfully: ${key}`);
      return key;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Error classification: 4xx client errors should not be retried
      if (errorMessage.includes('credentials')) {
        throw new BadRequestException(this.i18n.t('errors.S3_UPLOAD_INVALID_CREDENTIALS'));
      }

      if (errorMessage.includes('bucket') || errorMessage.includes('NoSuchBucket')) {
        throw new BadRequestException(
          this.i18n.t('errors.S3_UPLOAD_BUCKET_NOT_FOUND', {
            args: { bucket: this.bucket },
          }),
        );
      }

      if (errorMessage.includes('AccessDenied')) {
        throw new BadRequestException(this.i18n.t('errors.S3_UPLOAD_ACCESS_DENIED'));
      }

      // All other errors (5xx, network errors) - retry exhausted
      this.logger.error(`[S3Service] Upload failed after ${this.retryMaxAttempts} attempts: ${key}`, error);

      throw new ServiceUnavailableException(
        this.i18n.t('errors.S3_UPLOAD_FAILED_RETRY_EXHAUSTED', {
          args: { maxAttempts: this.retryMaxAttempts },
        }),
      );
    }
  }

  /**
   * Generate pre-signed URL for secure file download
   */
  async getPresignedUrl(key: string, expiresIn: number = 900): Promise<string> {
    try {
      const url = await this.retryService.executeWithRetry(
        async () => {
          const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
          });

          return await getSignedUrl(this.s3Client, command, {
            expiresIn, // Default: 15 minutes (900 seconds)
          });
        },
        {
          maxAttempts: this.retryMaxAttempts,
          baseDelay: this.retryBaseDelay,
          context: `S3 Presigned URL: ${key}`,
        },
      );

      this.logger.log(`[S3Service] Pre-signed URL generated for key: ${key} (expires in ${expiresIn}s)`);
      return url;
    } catch (error) {
      this.logger.error(`[S3Service] Failed to generate pre-signed URL for key: ${key}`, error);

      throw new BadRequestException(
        this.i18n.t('errors.S3_PRESIGNED_URL_FAILED', {
          args: { key },
        }),
      );
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await this.retryService.executeWithRetry(
        async () => {
          const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
          });

          return await this.s3Client.send(command);
        },
        {
          maxAttempts: 3, // Lower retry count for delete operations
          baseDelay: 1000, // Lower base delay for delete operations
          context: `S3 Delete: ${key}`,
        },
      );

      this.logger.log(`[S3Service] File deleted successfully: ${key}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Error classification: NoSuchKey is 4xx error, don't retry
      if (errorMessage.includes('NoSuchKey')) {
        throw new BadRequestException(
          this.i18n.t('errors.S3_DELETE_FILE_NOT_FOUND', {
            args: { key },
          }),
        );
      }

      this.logger.error(`[S3Service] Failed to delete file: ${key}`, error);

      throw new BadRequestException(
        this.i18n.t('errors.S3_DELETE_FAILED', {
          args: { key },
        }),
      );
    }
  }

  /**
   * Test S3 connectivity (used for health checks)
   */
  async testConnection(): Promise<boolean> {
    try {
      const command = new HeadBucketCommand({
        Bucket: this.bucket,
      });

      await this.s3Client.send(command);

      this.logger.log(`S3 connection test successful for bucket: ${this.bucket}`);
      return true;
    } catch (error) {
      this.logger.error(`S3 connection test failed for bucket: ${this.bucket}`, error);
      return false;
    }
  }
}
