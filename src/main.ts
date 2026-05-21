// Libraries
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { I18nService, I18nValidationPipe } from 'nestjs-i18n';
// Guards/Decorators/Interceptors
import { I18nValidationExceptionFilter } from './common/filters/i18n-validation-exception.filter';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { initializeSentry } from './config/sentry.config';
import { LoggerService } from './common/logger/logger.service';
import { PrismaService } from './database/prisma.service';
// Services
import { AppModule } from './app.module';
import { writeFileSync } from 'fs';

async function bootstrap() {
  // AC-7.5.1: Initialize Sentry BEFORE creating NestJS app to catch early bootstrap errors
  initializeSentry();

  const app = await NestFactory.create(AppModule);

  // AC-7.3.1: Use Winston logger globally for all NestJS logs
  const logger = app.get(LoggerService);
  app.useLogger(logger);

  // AC-8.5-2.5: Get I18nService for response message translation
  const i18nService = app.get<I18nService<Record<string, unknown>>>(I18nService);

  // AC-8.5-2.5: Register TransformResponseInterceptor globally for response standardization
  // MUST be registered BEFORE LoggingInterceptor to transform data before logging
  app.useGlobalInterceptors(new TransformResponseInterceptor(i18nService));

  // AC-7.4.1: Register LoggingInterceptor globally for request/response logging
  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  // AC-7.5.3: Register exception filters globally
  // IMPORTANT: NestJS processes filters in REVERSE order - last registered runs first!
  // SentryExceptionFilter (@Catch()) must be registered first so it runs last (catches remaining)
  // I18nValidationExceptionFilter must be registered last so it runs first (catches I18nValidationException)
  app.useGlobalFilters(new SentryExceptionFilter(i18nService), new I18nValidationExceptionFilter(i18nService));

  // Log application startup
  logger.log('Application starting...', {
    module: 'Bootstrap',
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT ?? 3000,
  });

  // AC-8.1.8: Enable CORS for Swagger UI and API access
  app.enableCors();

  // AC-8.1.2, 8.1.3, 8.1.4, 8.1.5, 8.1.7: Configure Swagger/OpenAPI documentation
  if (process.env.SWAGGER_ENABLED === 'true') {
    try {
      const config = new DocumentBuilder()
        .setTitle('Community Events API')
        .setDescription('Backend API for the community events platform')
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

      // JSON dosyası olarak kaydet
      writeFileSync('./swagger.json', JSON.stringify(document, null, 2));
      SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
          persistAuthorization: true, // Keep JWT token between page reloads
        },
      });

      logger.log('Swagger UI available at /api/docs', {
        module: 'Bootstrap',
        url: `http://localhost:${process.env.PORT ?? 3000}/api/docs`,
      });
    } catch (error) {
      logger.error('Failed to initialize Swagger', error instanceof Error ? error.message : String(error), {
        module: 'Bootstrap',
      });
    }
  } else {
    logger.log('Swagger disabled', { module: 'Bootstrap' });
  }

  // Enable global validation pipe with i18n support for class-validator
  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable graceful shutdown
  const prismaService = app.get(PrismaService);
  prismaService.enableShutdownHooks(app);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application started successfully on port ${port}`, {
    module: 'Bootstrap',
    url: `http://localhost:${port}`,
  });
}
bootstrap();
