// Libraries
import { registerAs } from '@nestjs/config';

export default registerAs('aws', () => ({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  s3: {
    bucket: process.env.S3_BUCKET,
    endpoint: process.env.S3_ENDPOINT, // Optional: for MinIO local dev
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true', // Optional: for MinIO
  },
}));
