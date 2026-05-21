// Libraries
import { Expose, Transform } from 'class-transformer';

/**
 * File Response DTO
 * Excludes sensitive fields: s3Key, s3Bucket, domainID, userID, deletedAt
 * Includes user-facing metadata with formatted file size
 */
export class FileResDto {
  @Expose()
  id!: string;

  @Expose()
  filename!: string;

  @Expose()
  originalName!: string;

  @Expose()
  mimeType!: string;

  @Expose()
  size!: number; // Bytes

  @Expose()
  @Transform(({ obj }) => {
    const bytes = obj.size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  })
  sizeFormatted!: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  url?: string;

  // Relation fields
  @Expose()
  domain!: {
    id: string;
    name: string;
    company: string;
    logo?: string | null;
  };

  @Expose()
  user!: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };

  // Excluded fields (not exposed):
  // - s3Key: Internal S3 object key (security)
  // - s3Bucket: Internal bucket name (security)
  // - domainID: Internal multi-tenancy field
  // - userID: User can infer from JWT
  // - deletedAt: Soft delete field (internal)
}
