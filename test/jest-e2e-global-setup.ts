import { execSync } from 'child_process';

const TEST_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/community_events_test?connection_limit=10&pool_timeout=20';

export default async function globalSetup() {
  execSync('npx prisma migrate deploy --schema prisma/schema/schema.prisma', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || TEST_DATABASE_URL,
    },
  });
}
