import { PrismaClient } from '@prisma/client';
import { FileFactory } from '../factories/file.factory';
import { getCurrentEnvironmentConfig } from '../config/environment.config';

/**
 * File Seeder
 *
 * Creates sample file metadata for testing
 * Uses upsert for idempotent operations
 *
 * Factory Pattern Integration:
 * - Import FileFactory from '../factories/file.factory'
 * - FileFactory.generate() - Creates a single file with realistic metadata
 * - FileFactory.generateMany(count) - Creates bulk files with unique S3 keys
 *
 * Note: FileFactory requires userID to be provided via overrides
 *
 * Example usage with factories:
 * import { FileFactory } from '../factories/file.factory';
 * const adminUser = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
 * const factoryFiles = FileFactory.generateMany(10, { userID: adminUser.id });
 * for (const fileData of factoryFiles) {
 *   await prisma.file.create({ data: fileData });
 * }
 */
export class FileSeeder {
  static async seed(prisma: PrismaClient): Promise<void> {
    console.log('📁 Creating sample file metadata...');

    // Get environment-specific configuration
    const envConfig = getCurrentEnvironmentConfig();
    const targetFileCount = envConfig.files;

    if (targetFileCount === 0) {
      console.log('  ℹ️ Production environment - skipping file seeding\n');
      return;
    }

    // Get users to distribute files among them
    const users = await prisma.user.findMany({
      orderBy: { email: 'asc' },
      take: 50, // Limit to reasonable number
    });

    if (users.length === 0) {
      console.log('  ⚠️ No users found, skipping file seeding\n');
      return;
    }

    console.log(`  📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  📊 Target: ${targetFileCount} files across ${users.length} users`);

    let fileCount = 0;

    // Distribute files evenly among users
    for (let i = 0; i < targetFileCount; i++) {
      const userIndex = i % users.length;
      const user = users[userIndex];

      try {
        // Generate file using factory - it already creates the proper relation structure
        const fileData = FileFactory.generate({
          userID: user.id,
        } as any);

        // Check if file already exists by s3Key
        const existingFile = await prisma.file.findFirst({
          where: { s3Key: fileData.s3Key as string },
        });

        if (existingFile) {
          console.log(`  ✓ ${fileData.originalName} (already exists)`);
        } else {
          // Create new file - FileFactory already structures it with the relation
          await prisma.file.create({
            data: fileData as any,
          });
          console.log(
            `  ✓ ${fileData.originalName} (${((fileData.size as number) / 1024).toFixed(0)}KB)`,
          );
        }
        fileCount++;
      } catch (error: any) {
        console.error(`  ❌ Failed to create file for user ${user.email}:`, error.message);
      }
    }

    console.log(`✓ ${fileCount} files created/updated\n`);
  }
}

// Standalone execution support
if (require.main === module) {
  const prisma = new PrismaClient();

  FileSeeder.seed(prisma)
    .then(async () => {
      await prisma.$disconnect();
      console.log('✅ File seeder completed successfully');
    })
    .catch(async (error) => {
      console.error('❌ File seeder failed:', error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
