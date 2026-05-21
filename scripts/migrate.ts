/**
 * Migration Script - Conditionally runs Prisma migrations based on database provider
 *
 * For PostgreSQL: Runs prisma migrate dev
 * For MongoDB: Skips migrations (schemaless database)
 */
// Libraries
import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
const SCHEMA_PATH = join(process.cwd(), 'prisma', 'schema', 'schema.prisma');

function getMigrationCommand(): string | null {
  try {
    const schema = readFileSync(SCHEMA_PATH, 'utf-8');

    // Extract provider from datasource block only
    const datasourceMatch = schema.match(/datasource\s+\w+\s*{[^}]*provider\s*=\s*"([^"]+)"/);

    if (!datasourceMatch) {
      console.error('❌ Could not detect database provider in schema.prisma');
      process.exit(1);
    }

    const provider = datasourceMatch[1];

    if (provider === 'mongodb') {
      console.log('ℹ️  MongoDB detected - MongoDB is schemaless, skipping migrations');
      console.log('   Prisma migrations are not required for MongoDB projects');
      return null;
    }

    if (provider === 'postgresql' || provider === 'mysql' || provider === 'sqlite') {
      console.log(`✓ ${provider.toUpperCase()} detected - Running migrations...`);
      return 'npx prisma migrate dev';
    }

    console.warn(`⚠️  Unknown provider: ${provider}`);
    console.log('   Attempting to run migrations...');
    return 'npx prisma migrate dev';
  } catch (error) {
    console.error('❌ Error reading schema.prisma:', error);
    process.exit(1);
  }
}

function runMigration() {
  const command = getMigrationCommand();

  if (!command) {
    // MongoDB case - no migration needed
    process.exit(0);
  }

  try {
    execSync(command, { stdio: 'inherit' });
    console.log('✓ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed');
    process.exit(1);
  }
}

// Execute migration
runMigration();
