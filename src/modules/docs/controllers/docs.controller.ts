// Libraries
import { Controller, Get, HttpStatus, Res, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiParam, ApiBadRequestResponse } from '@nestjs/swagger';

// Services
import { PostmanCollectionService } from '../../../common/postman/postman-collection.service';
import { EnvironmentType } from '../../../common/postman/interfaces/postman-collection.interface';
/**
 * AC-15.1: DocsController - API Documentation Controller
 *
 * Provides endpoints for accessing and exporting API documentation.
 * Integrates with existing Swagger infrastructure from Epic 8.
 *
 * Endpoints:
 * - GET /api/docs/postman - Download Postman Collection
 */
@ApiTags('Documentation')
@Controller('api/docs')
export class DocsController {
  constructor(private readonly postmanService: PostmanCollectionService) {}

  /**
   * AC-15.1.5: Download Postman Collection
   *
   * Returns the complete OpenAPI specification as a downloadable
   * Postman Collection v2.1.0 compatible JSON file.
   *
   * Response Headers:
   * - Content-Type: application/json
   * - Content-Disposition: attachment; filename="api-collection.json"
   *
   * @param res - Express Response object
   * @returns void (sends JSON buffer with download headers)
   */
  @Get('postman')
  @ApiOperation({
    summary: 'Download Postman Collection',
    description:
      'Downloads the complete API specification as a Postman Collection v2.1.0 compatible JSON file. ' +
      'The collection includes all endpoints, request/response schemas, and authentication configuration.',
  })
  @ApiOkResponse({
    description: 'Postman Collection JSON file download with proper headers for automatic file download.',
  })
  async getPostmanCollection(@Res() res: any): Promise<void> {
    try {
      // Generate Postman Collection JSON buffer
      const jsonBuffer = await this.postmanService.getCollectionJson();

      // Set response headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="api-collection.json"');

      // Send the collection as downloadable file
      res.status(HttpStatus.OK).send(jsonBuffer);
    } catch (error) {
      // Handle errors gracefully
      const err = error as any;
      res.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message || 'Failed to generate Postman collection. Please check API documentation.',
        error: err.response?.message || err.message,
      });
    }
  }

  /**
   * AC-15.2.4: Download Postman Environment
   *
   * Returns environment configuration as a downloadable Postman environment
   * JSON file compatible with Postman v2.1.0 format.
   *
   * Supports three environment types:
   * - dev: Development environment (localhost:3000/api)
   * - staging: Staging environment (from STAGING_API_URL env var)
   * - prod: Production environment (from PROD_API_URL env var)
   *
   * Response Headers:
   * - Content-Type: application/json
   * - Content-Disposition: attachment; filename="api-environment-${env}.postman_environment.json"
   *
   * @param env - Environment type (dev, staging, prod)
   * @param res - Express Response object
   * @returns void (sends JSON buffer with download headers)
   */
  @Get('postman/environment/:env')
  @ApiOperation({
    summary: 'Download Postman Environment',
    description:
      'Downloads environment configuration as a Postman Environment JSON file. ' +
      'Supports development, staging, and production environments with appropriate base URLs. ' +
      'Sensitive variables (authToken, apiKey) are marked as hidden.',
  })
  @ApiParam({
    name: 'env',
    enum: EnvironmentType,
    enumName: 'EnvironmentType',
    description: 'Environment type: dev (development), staging (staging), or prod (production)',
    required: true,
  })
  @ApiOkResponse({
    description:
      'Postman Environment JSON file download with proper headers for automatic file download. ' +
      'Contains baseUrl, authToken, and apiKey variables configured for the specified environment.',
  })
  @ApiBadRequestResponse({
    description: 'Bad request if environment type is invalid or environment generation fails.',
  })
  async getPostmanEnvironment(@Param('env') env: string, @Res() res: any): Promise<void> {
    try {
      // Validate environment type
      if (!Object.values(EnvironmentType).includes(env as EnvironmentType)) {
        res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Invalid environment type: ${env}. Must be one of: ${Object.values(EnvironmentType).join(', ')}`,
        });
        return;
      }

      const envType = env as EnvironmentType;

      // Generate environment JSON buffer
      const jsonBuffer = await this.postmanService.getEnvironmentJson(envType);

      // Set response headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="api-environment-${envType}.postman_environment.json"`,
      );

      // Send the environment as downloadable file
      res.status(HttpStatus.OK).send(jsonBuffer);
    } catch (error) {
      // Handle errors gracefully
      const err = error as any;
      const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;

      res.status(status).json({
        statusCode: status,
        message: err.message || `Failed to generate Postman environment for ${env}. Please check API documentation.`,
        error: err.response?.message || err.message,
      });
    }
  }
}
