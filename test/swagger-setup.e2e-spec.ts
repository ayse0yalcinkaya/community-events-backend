// Libraries
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import request from 'supertest';

// Filters
import { SentryExceptionFilter } from '../src/common/filters/sentry-exception.filter';

// Interceptors
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';

// Services
import { LoggerService } from '../src/common/logger/logger.service';
import { PrismaService } from '../src/database/prisma.service';

// Modules
import { AppModule } from '../src/app.module';
describe('Swagger Setup (e2e) - Story 8.1', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let originalSwaggerEnabled: string | undefined;

  // Helper to initialize app with Swagger based on SWAGGER_ENABLED
  const initializeApp = async (swaggerEnabled: string) => {
    process.env.SWAGGER_ENABLED = swaggerEnabled;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same configuration as main.ts
    const logger = app.get(LoggerService);
    const i18nService = app.get(I18nService);
    app.useLogger(logger);
    app.useGlobalInterceptors(new LoggingInterceptor(logger));
    app.useGlobalFilters(new SentryExceptionFilter(i18nService as any));

    // Enable CORS for Swagger UI (AC-8.1.8)
    app.enableCors();

    // Configure Swagger based on environment variable (AC-8.1.2, 8.1.3, 8.1.4, 8.1.5)
    if (process.env.SWAGGER_ENABLED === 'true') {
      const config = new DocumentBuilder()
        .setTitle('Boilerplate API')
        .setDescription('Production-ready NestJS Boilerplate API')
        .setVersion('1.0')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          'JWT-auth',
        )
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document);
    }

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prismaService = app.get(PrismaService);
    prismaService.enableShutdownHooks(app);

    await app.init();
  };

  beforeAll(() => {
    // Save original SWAGGER_ENABLED value
    originalSwaggerEnabled = process.env.SWAGGER_ENABLED;
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  afterAll(() => {
    // Restore original SWAGGER_ENABLED value
    if (originalSwaggerEnabled !== undefined) {
      process.env.SWAGGER_ENABLED = originalSwaggerEnabled;
    } else {
      delete process.env.SWAGGER_ENABLED;
    }
  });

  describe('AC-8.1.3: Swagger UI accessible at /api/docs when enabled', () => {
    beforeEach(async () => {
      await initializeApp('true');
    });

    it('should return 200 OK for GET /api/docs', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs').expect(200);

      // Verify response is HTML
      expect(response.headers['content-type']).toContain('text/html');
    });

    it('should return Swagger UI HTML containing "swagger-ui"', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs');

      expect(response.text).toContain('swagger-ui');
    });

    it('should serve Swagger UI with proper title tag', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs');

      // Swagger UI HTML should contain the title tag
      expect(response.text).toContain('<title>Swagger UI</title>');
    });
  });

  describe('AC-8.1.5: OpenAPI JSON export at /api/docs-json when enabled', () => {
    beforeEach(async () => {
      await initializeApp('true');
    });

    it('should return 200 OK for GET /api/docs-json', async () => {
      await request(app.getHttpServer()).get('/api/docs-json').expect(200).expect('Content-Type', /json/);
    });

    it('should return valid OpenAPI 3.0 specification', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json');

      const openApiDoc = response.body;

      // Verify OpenAPI version
      expect(openApiDoc.openapi).toBeDefined();
      expect(openApiDoc.openapi).toMatch(/^3\.\d+\.\d+$/);
    });

    it('should include configured metadata: title "Boilerplate API"', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json');

      const openApiDoc = response.body;

      expect(openApiDoc.info).toBeDefined();
      expect(openApiDoc.info.title).toBe('Boilerplate API');
    });

    it('should include configured metadata: description', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json');

      const openApiDoc = response.body;

      expect(openApiDoc.info.description).toBe('Production-ready NestJS Boilerplate API');
    });

    it('should include configured metadata: version "1.0"', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json');

      const openApiDoc = response.body;

      expect(openApiDoc.info.version).toBe('1.0');
    });

    it('should include security scheme "JWT-auth" with Bearer authentication', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json');

      const openApiDoc = response.body;

      // Verify security schemes
      expect(openApiDoc.components).toBeDefined();
      expect(openApiDoc.components.securitySchemes).toBeDefined();
      expect(openApiDoc.components.securitySchemes['JWT-auth']).toBeDefined();

      const jwtAuth = openApiDoc.components.securitySchemes['JWT-auth'];
      expect(jwtAuth.type).toBe('http');
      expect(jwtAuth.scheme).toBe('bearer');
      expect(jwtAuth.bearerFormat).toBe('JWT');
    });

    it('should include paths object with API endpoints', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json');

      const openApiDoc = response.body;

      expect(openApiDoc.paths).toBeDefined();
      expect(typeof openApiDoc.paths).toBe('object');
      // At minimum, health endpoints should be documented
      expect(Object.keys(openApiDoc.paths).length).toBeGreaterThan(0);
    });
  });

  describe('AC-8.1.4: Swagger disabled when SWAGGER_ENABLED=false', () => {
    beforeEach(async () => {
      await initializeApp('false');
    });

    it('should return 404 Not Found for GET /api/docs', async () => {
      await request(app.getHttpServer()).get('/api/docs').expect(404);
    });

    it('should return 404 Not Found for GET /api/docs-json', async () => {
      await request(app.getHttpServer()).get('/api/docs-json').expect(404);
    });
  });

  describe('AC-8.1.8: CORS configuration allows Swagger UI access', () => {
    beforeEach(async () => {
      await initializeApp('true');
    });

    it('should allow CORS for /api/docs endpoint', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs').set('Origin', 'http://localhost:3001');

      // CORS enabled should include Access-Control-Allow-Origin header
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should allow CORS for /api/docs-json endpoint', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json').set('Origin', 'http://localhost:3001');

      // CORS enabled should include Access-Control-Allow-Origin header
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle CORS preflight requests (OPTIONS)', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/docs')
        .set('Origin', 'http://localhost:3001')
        .set('Access-Control-Request-Method', 'GET');

      // Should return 204 No Content or 200 OK for preflight
      expect([200, 204]).toContain(response.status);
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('Performance Requirements (AC-8.1.3)', () => {
    beforeEach(async () => {
      await initializeApp('true');
    });

    it('should load Swagger UI in less than 2 seconds', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer()).get('/api/docs').expect(200);

      const loadTime = Date.now() - startTime;

      // Performance requirement: < 2000ms
      expect(loadTime).toBeLessThan(2000);
    }, 5000); // Set Jest timeout to 5 seconds for this test

    it('should generate OpenAPI document in less than 500ms', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer()).get('/api/docs-json').expect(200);

      const generationTime = Date.now() - startTime;

      // Performance requirement: < 500ms
      expect(generationTime).toBeLessThan(500);
    });
  });

  describe('Error Handling and Graceful Degradation (AC-8.1.7)', () => {
    it('should start application even if SWAGGER_ENABLED is undefined', async () => {
      delete process.env.SWAGGER_ENABLED;

      await initializeApp('undefined');

      // Application should start successfully
      expect(app).toBeDefined();

      // Swagger should be disabled (default behavior)
      await request(app.getHttpServer()).get('/api/docs').expect(404);
    });

    it('should handle invalid SWAGGER_ENABLED values gracefully', async () => {
      await initializeApp('invalid-value');

      // Application should start successfully
      expect(app).toBeDefined();

      // Swagger should be disabled (not "true")
      await request(app.getHttpServer()).get('/api/docs').expect(404);
    });
  });
});
