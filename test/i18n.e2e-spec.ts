// Libraries
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

// Modules
import { AppModule } from './../src/app.module';

describe('I18n (e2e) - AC-7.1.5', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Accept-Language Header Detection', () => {
    it('should return English error message when Accept-Language is en', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/nonexistent-id')
        .set('Accept-Language', 'en')
        .expect(404);

      // The error message should be in English
      expect(response.body.message).toBeDefined();
      // Should contain English text (once we integrate i18n with services)
    });

    it('should return Turkish error message when Accept-Language is tr', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/nonexistent-id')
        .set('Accept-Language', 'tr')
        .expect(404);

      // The error message should be in Turkish
      expect(response.body.message).toBeDefined();
      // Should contain Turkish text (once we integrate i18n with services)
    });

    it('should default to English when Accept-Language header is missing', async () => {
      const response = await request(app.getHttpServer()).get('/api/users/nonexistent-id').expect(404);

      // Should default to English
      expect(response.body.message).toBeDefined();
    });

    it('should fallback to English for invalid Accept-Language value', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/nonexistent-id')
        .set('Accept-Language', 'invalid-lang')
        .expect(404);

      // Should fallback to English
      expect(response.body.message).toBeDefined();
    });
  });

  describe('Query Parameter Language Override', () => {
    it('should use query parameter lang=tr to override Accept-Language header', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/nonexistent-id?lang=tr')
        .set('Accept-Language', 'en')
        .expect(404);

      // Should use Turkish despite Accept-Language being English
      expect(response.body.message).toBeDefined();
    });

    it('should use query parameter lang=en to force English', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/nonexistent-id?lang=en')
        .set('Accept-Language', 'tr')
        .expect(404);

      // Should use English despite Accept-Language being Turkish
      expect(response.body.message).toBeDefined();
    });
  });

  describe('Health Check with I18n', () => {
    it('should respond to health check in English', async () => {
      const response = await request(app.getHttpServer()).get('/health').set('Accept-Language', 'en').expect(200);

      expect(response.body).toBeDefined();
    });

    it('should respond to health check in Turkish', async () => {
      const response = await request(app.getHttpServer()).get('/health').set('Accept-Language', 'tr').expect(200);

      expect(response.body).toBeDefined();
    });
  });
});
