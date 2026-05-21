// Libraries
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

// Services
import { S3Service } from '../src/modules/files/services/s3.service';

// Modules
import { AppModule } from '../src/app.module';

describe('Health S3 (e2e)', () => {
  let app: INestApplication;
  let s3Service: S3Service;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    s3Service = moduleFixture.get<S3Service>(S3Service);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/health/s3 (GET)', () => {
    it('should return 200 OK when S3 is reachable', async () => {
      // Mock S3Service to return successful connection
      jest.spyOn(s3Service, 'testConnection').mockResolvedValue(true);

      const response = await request(app.getHttpServer()).get('/api/health/s3').expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('s3');
      expect(response.body.s3).toHaveProperty('status', 'up');
      expect(response.body.s3).toHaveProperty('message');
    });

    it('should return service info when S3 is unreachable', async () => {
      // Mock S3Service to return failed connection
      jest.spyOn(s3Service, 'testConnection').mockResolvedValue(false);

      const response = await request(app.getHttpServer()).get('/api/health/s3').expect(200);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('s3');
      expect(response.body.s3).toHaveProperty('status', 'down');
    });

    it('should handle S3Service errors gracefully', async () => {
      // Mock S3Service to throw error
      jest.spyOn(s3Service, 'testConnection').mockRejectedValue(new Error('Connection timeout'));

      const response = await request(app.getHttpServer()).get('/api/health/s3').expect(200);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('s3');
      expect(response.body.s3).toHaveProperty('status', 'down');
      expect(response.body.s3).toHaveProperty('error');
    });
  });
});
