#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Project root directory (parent of scripts/)
const PROJECT_ROOT = path.join(__dirname, '..');

// Paths
const PRISMA_DIR = path.join(PROJECT_ROOT, 'prisma');
const POSTGRES_SCHEMA = path.join(PRISMA_DIR, 'schema-postgres.prisma');
const MONGODB_SCHEMA = path.join(PRISMA_DIR, 'schema-mongodb.prisma');
const TARGET_SCHEMA = path.join(PRISMA_DIR, 'schema.prisma');
const ENV_EXAMPLE = path.join(PROJECT_ROOT, '.env.example');
const ENV_FILE = path.join(PROJECT_ROOT, '.env');

// Database URL templates
const DATABASE_URL_POSTGRES =
  'postgresql://postgres:postgres@localhost:5432/community_events';
const DATABASE_URL_MONGODB =
  'mongodb://admin:password@localhost:27017/community_events';

/**
 * Ask a question and return the user's answer
 */
function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

/**
 * Display banner
 */
function displayBanner(): void {
  console.log('\n==============================================');
  console.log('   Community Events Database Setup');
  console.log('==============================================\n');
}

/**
 * Prompt user to select database
 */
async function selectDatabase(): Promise<'postgresql' | 'mongodb'> {
  console.log('Select your database:');
  console.log('  [1] PostgreSQL');
  console.log('  [2] MongoDB\n');

  while (true) {
    const answer = await question('Enter your choice (1 or 2): ');
    const choice = answer.trim();

    if (choice === '1') {
      console.log('\n✓ Selected database: PostgreSQL\n');
      return 'postgresql';
    } else if (choice === '2') {
      console.log('\n✓ Selected database: MongoDB\n');
      return 'mongodb';
    } else {
      console.log('⚠️  Invalid selection. Please enter 1 or 2.\n');
    }
  }
}

/**
 * Copy selected schema to prisma/schema.prisma
 */
function copySchema(database: 'postgresql' | 'mongodb'): void {
  const sourceSchema =
    database === 'postgresql' ? POSTGRES_SCHEMA : MONGODB_SCHEMA;

  // Check if source schema exists
  if (!fs.existsSync(sourceSchema)) {
    console.error(
      `❌ Error: Schema file not found at ${sourceSchema}`,
    );
    console.error('   Please ensure schema files exist in prisma/ directory.');
    process.exit(1);
  }

  try {
    fs.copyFileSync(sourceSchema, TARGET_SCHEMA);
    console.log(`✅ Schema copied: ${path.basename(sourceSchema)} → schema.prisma\n`);
  } catch (error) {
    console.error('❌ Error copying schema file:', error);
    process.exit(1);
  }
}

/**
 * Create .env file from .env.example
 */
async function createEnvFile(database: 'postgresql' | 'mongodb'): Promise<void> {
  // Check if .env already exists
  if (fs.existsSync(ENV_FILE)) {
    console.log('⚠️  .env file already exists.');
    const overwrite = await question('   Overwrite existing .env? (y/n): ');

    if (overwrite.trim().toLowerCase() !== 'y') {
      console.log('   Skipping .env file generation.\n');
      return;
    }
  }

  // Check if .env.example exists
  if (!fs.existsSync(ENV_EXAMPLE)) {
    console.error('❌ Error: .env.example file not found.');
    console.error('   Please create .env.example template first.');
    process.exit(1);
  }

  try {
    // Read .env.example
    let envContent = fs.readFileSync(ENV_EXAMPLE, 'utf-8');

    // Set appropriate DATABASE_URL based on selection
    const databaseUrl =
      database === 'postgresql' ? DATABASE_URL_POSTGRES : DATABASE_URL_MONGODB;

    // Replace DATABASE_URL placeholder or add if not exists
    if (envContent.includes('DATABASE_URL=')) {
      envContent = envContent.replace(
        /DATABASE_URL=.*/,
        `DATABASE_URL="${databaseUrl}"`,
      );
    } else {
      envContent += `\nDATABASE_URL="${databaseUrl}"\n`;
    }

    // Write to .env
    fs.writeFileSync(ENV_FILE, envContent);
    console.log('✅ .env file created from template\n');
  } catch (error) {
    console.error('❌ Error creating .env file:', error);
    process.exit(1);
  }
}

/**
 * Display next steps to the user
 */
function displayNextSteps(database: 'postgresql' | 'mongodb'): void {
  console.log('✅ Database setup complete!\n');
  console.log('📋 Next Steps:\n');
  console.log('  1. Edit .env file and update DATABASE_URL with your credentials');
  console.log('  2. Run: npm run prisma:generate');

  if (database === 'postgresql') {
    console.log('  3. Run: npm run prisma:migrate (PostgreSQL only)');
  } else {
    console.log('  3. [Skip] Migrations not needed for MongoDB (schemaless)');
  }

  console.log('  4. Run: npm run prisma:seed');
  console.log('  5. Run: npm run start:dev\n');

  if (database === 'mongodb') {
    console.log('⚠️  Note: MongoDB does not require migrations (schemaless)\n');
  }

  console.log('==============================================\n');
}

/**
 * Main setup function
 */
async function main(): Promise<void> {
  try {
    displayBanner();

    // Warn user this is a one-time selection
    console.log('⚠️  Important: Database selection is a ONE-TIME choice.');
    console.log('   Changing later will require project re-initialization.\n');

    // Select database
    const database = await selectDatabase();

    // Copy schema file
    copySchema(database);

    // Create .env file
    await createEnvFile(database);

    // Display next steps
    displayNextSteps(database);

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error);
    rl.close();
    process.exit(1);
  }
}

// Run main function
main();
