// Libraries
import { defineConfig } from 'prisma/config';
import 'dotenv/config';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

export default defineConfig({
  // Point Prisma to the folder containing all modularized schema files.
  schema: './prisma/schema',

  datasource: {
    url: databaseUrl,
  },
});
