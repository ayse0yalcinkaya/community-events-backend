// Libraries
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
/**
 * FileFactory
 *
 * Generates realistic file metadata with Turkish filenames
 * Type-safe with Prisma schema types
 */
export class FileFactory {
  private static readonly DEFAULT_BUCKET = 'community-events-files';
  private static sequence = 0;

  // Common file types with their extensions and MIME types
  private static readonly FILE_TYPES = [
    { extension: 'pdf', mimeType: 'application/pdf', maxSize: 10 * 1024 * 1024 }, // 10MB
    {
      extension: 'docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      maxSize: 20 * 1024 * 1024,
    }, // 20MB
    {
      extension: 'xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      maxSize: 15 * 1024 * 1024,
    }, // 15MB
    {
      extension: 'pptx',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      maxSize: 25 * 1024 * 1024,
    }, // 25MB
    { extension: 'jpg', mimeType: 'image/jpeg', maxSize: 5 * 1024 * 1024 }, // 5MB
    { extension: 'png', mimeType: 'image/png', maxSize: 5 * 1024 * 1024 }, // 5MB
    { extension: 'gif', mimeType: 'image/gif', maxSize: 3 * 1024 * 1024 }, // 3MB
    { extension: 'mp4', mimeType: 'video/mp4', maxSize: 100 * 1024 * 1024 }, // 100MB
    { extension: 'mp3', mimeType: 'audio/mpeg', maxSize: 10 * 1024 * 1024 }, // 10MB
    { extension: 'txt', mimeType: 'text/plain', maxSize: 1 * 1024 * 1024 }, // 1MB
    { extension: 'zip', mimeType: 'application/zip', maxSize: 50 * 1024 * 1024 }, // 50MB
  ] as const;

  // Turkish filename patterns
  private static readonly FILENAME_PATTERNS = [
    'Belge',
    'Dokuman',
    'Rapor',
    'Sunum',
    'Fotoğraf',
    'Video',
    'Ses',
    'Arşiv',
    'Proje',
    'Veri',
  ] as const;

  private static nextSequence() {
    this.sequence += 1;
    return this.sequence;
  }

  private static pickRandom<T>(items: readonly T[], seed: number) {
    const index = seed % items.length;
    return items[index];
  }

  private static randomSize(maxSize: number, seed: number) {
    const min = 1024;
    const span = Math.max(maxSize - min, min);
    return min + ((seed * 7919) % span);
  }

  /**
   * Generate a single file with realistic metadata
   * Note: userID must be provided via overrides for FileCreateInput
   */
  static generate(overrides: Partial<Prisma.FileCreateInput> = {}): Prisma.FileCreateInput {
    // Extract userID from overrides
    const userID = (overrides as any).userID;
    if (!userID) {
      throw new Error('FileFactory.generate() requires userID to be provided via overrides');
    }

    const seed = this.nextSequence();
    const fileType = this.pickRandom(this.FILE_TYPES, seed);
    const fileNamePattern = this.pickRandom(this.FILENAME_PATTERNS, seed * 3);
    const timestamp = Date.now();

    // Generate random size within the file type limit
    const size = this.randomSize(fileType.maxSize, seed);

    const filename = `${fileNamePattern}-${timestamp}.${fileType.extension}`;
    const originalName = `${fileNamePattern}_${timestamp}.${fileType.extension}`;
    const s3Key = `uploads/${randomUUID()}/${filename}`;

    const defaults: Prisma.FileCreateInput = {
      user: {
        connect: {
          id: userID,
        },
      },
      filename,
      originalName,
      mimeType: fileType.mimeType,
      size,
      s3Key,
      s3Bucket: this.DEFAULT_BUCKET,
    };

    // Remove userID from overrides to avoid conflicts
    const { userID: _, ...cleanOverrides } = overrides as any;

    // Merge with overrides
    return {
      ...defaults,
      ...cleanOverrides,
    };
  }

  /**
   * Generate multiple files with unique data
   * Note: userID must be provided via overrides for FileCreateInput
   */
  static generateMany(count: number, overrides: Partial<Prisma.FileCreateInput> = {}): Prisma.FileCreateInput[] {
    // Validate userID is provided
    if (!(overrides as any).userID) {
      throw new Error('FileFactory.generateMany() requires userID to be provided via overrides');
    }

    const files: Prisma.FileCreateInput[] = [];
    const usedKeys = new Set<string>();

    for (let i = 0; i < count; i++) {
      let file: Prisma.FileCreateInput;
      let attempts = 0;
      const maxAttempts = 50;

      // Ensure unique S3 keys
      do {
        file = this.generate(overrides);
        attempts++;

        if (attempts > maxAttempts) {
          // Fallback: add suffix to make unique
          file.s3Key = `${file.s3Key}-${attempts}`;
          file.filename = `${file.filename}-${attempts}`;
          break;
        }
      } while (usedKeys.has(file.s3Key || ''));

      usedKeys.add(file.s3Key || '');
      files.push(file);
    }

    return files;
  }
}
