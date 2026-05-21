// Libraries
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required but not defined');
  }

  // Detect database provider from URL
  const provider = databaseUrl.startsWith('mongodb')
    ? 'mongodb'
    : databaseUrl.startsWith('postgresql')
      ? 'postgresql'
      : 'unknown';

  return {
    url: databaseUrl,
    provider,
    // Connection pooling config (optional, with defaults)
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    },
  };
});
