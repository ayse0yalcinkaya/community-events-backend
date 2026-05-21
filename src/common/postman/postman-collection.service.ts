// Libraries
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

// Interfaces
import {
  IPostmanCollectionService,
  PostmanCollection,
  PostmanItem,
  OpenApiValidationResult,
  PostmanEnvironment,
  EnvironmentType,
} from './interfaces/postman-collection.interface';

// Services
import { LoggerService } from '../logger/logger.service';
import { RetryService } from '../services/retry.service';
// Third-party
import * as Converter from 'openapi-to-postmanv2';

/**
 * AC-15.1: PostmanCollectionService - Swagger to Postman Converter
 *
 * Converts OpenAPI 3.0 specifications to Postman Collection v2.1.0 format.
 * Integrates with existing Swagger infrastructure from Epic 8 to generate
 * downloadable Postman Collections for API testing.
 *
 * Features:
 * - Fetches OpenAPI spec from /api/docs-json endpoint
 * - Validates OpenAPI 3.0 format before conversion
 * - Uses openapi-to-postmanv2 for conversion
 * - Post-processes collection with metadata and environment variables
 * - Supports HTTP methods: GET, POST, PUT, PATCH, DELETE
 * - Generates downloadable JSON buffer with proper headers
 *
 * @example
 * ```typescript
 * const collection = await postmanService.generateCollectionFromSwagger();
 * const jsonBuffer = await postmanService.getCollectionJson();
 * ```
 */
@Injectable()
export class PostmanCollectionService implements IPostmanCollectionService {
  /**
   * Postman Collection version constant
   */
  private readonly COLLECTION_VERSION = '1.0.0';

  /**
   * Base URL for fetching OpenAPI spec
   */
  private readonly DOCS_JSON_PATH = '/api/docs-json';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly retryService: RetryService,
  ) {
    this.logger.log('PostmanCollectionService initialized', {
      module: 'PostmanCollection',
      service: 'PostmanCollectionService',
    });
  }

  /**
   * AC-15.1.1: Generate Postman Collection from OpenAPI specification
   *
   * Fetches OpenAPI spec, validates it, converts to Postman format,
   * and post-processes with metadata and environment variables.
   *
   * @returns Promise<PostmanCollection> - Converted Postman Collection
   * @throws HttpException if conversion fails
   */
  async generateCollectionFromSwagger(): Promise<PostmanCollection> {
    const context = 'generateCollectionFromSwagger';

    try {
      this.logger.log('Starting OpenAPI to Postman conversion', {
        module: 'PostmanCollection',
        service: 'PostmanCollectionService',
        method: context,
      });

      // Step 1: Fetch OpenAPI spec
      const openApiSpec = await this.fetchOpenApiSpec();

      // Step 2: Validate OpenAPI spec
      const validation = this.validateOpenApiSpec(openApiSpec);
      if (!validation.isValid) {
        throw new HttpException(
          {
            message: 'OpenAPI specification validation failed',
            errors: validation.errors,
            warnings: validation.warnings,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log('OpenAPI spec validated successfully', {
        module: 'PostmanCollection',
        service: 'PostmanCollectionService',
        method: context,
        validationWarnings: validation.warnings?.length || 0,
      });

      // Step 3: Convert using openapi-to-postmanv2
      const convertedCollection = await this.convertToPostman(openApiSpec);

      // Step 4: Post-process collection
      const processedCollection = this.postProcessCollection(convertedCollection);

      this.logger.log('Postman collection generated successfully', {
        module: 'PostmanCollection',
        service: 'PostmanCollectionService',
        method: context,
        endpoints: processedCollection.item.length,
      });

      return processedCollection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to generate Postman collection: ${errorMessage}`, errorStack, {
        module: 'PostmanCollection',
        service: 'PostmanCollectionService',
        method: context,
      });

      throw new HttpException(
        {
          message: 'Failed to generate Postman collection',
          error: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * AC-15.1.2: Convert OpenAPI spec to Postman Collection JSON buffer
   *
   * @returns Promise<Buffer> - JSON buffer for download
   * @throws HttpException if conversion fails
   */
  async getCollectionJson(): Promise<Buffer> {
    try {
      const collection = await this.generateCollectionFromSwagger();
      const jsonString = JSON.stringify(collection, null, 2);
      return Buffer.from(jsonString, 'utf-8');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to generate JSON buffer: ${errorMessage}`, undefined, {
        module: 'PostmanCollection',
        service: 'PostmanCollectionService',
        method: 'getCollectionJson',
      });

      throw new HttpException(
        {
          message: 'Failed to generate Postman collection JSON',
          error: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * AC-15.1.3: Validate OpenAPI 3.0 specification
   *
   * Checks for required OpenAPI 3.0 fields and structure.
   *
   * @param spec - OpenAPI specification object
   * @returns OpenApiValidationResult - Validation result with errors and warnings
   */
  validateOpenApiSpec(spec: any): OpenApiValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if spec exists
    if (!spec || typeof spec !== 'object') {
      errors.push('OpenAPI specification is not a valid object');
      return { isValid: false, errors, warnings };
    }

    // Check for OpenAPI version (3.0 or 3.0.x)
    if (!spec.openapi || typeof spec.openapi !== 'string') {
      errors.push('OpenAPI version (openapi field) is missing or invalid');
      return { isValid: false, errors, warnings };
    }

    if (!spec.openapi.startsWith('3.0')) {
      errors.push(`OpenAPI version ${spec.openapi} is not supported. Requires 3.0.x`);
      return { isValid: false, errors, warnings };
    }

    // Check for info section
    if (!spec.info || typeof spec.info !== 'object') {
      errors.push('OpenAPI info section is missing');
    } else {
      if (!spec.info.title || typeof spec.info.title !== 'string') {
        errors.push('OpenAPI info.title is missing');
      }
      if (!spec.info.version || typeof spec.info.version !== 'string') {
        warnings.push('OpenAPI info.version is missing (recommended)');
      }
    }

    // Check for paths section
    if (!spec.paths || typeof spec.paths !== 'object') {
      errors.push('OpenAPI paths section is missing');
    } else {
      const pathKeys = Object.keys(spec.paths);
      if (pathKeys.length === 0) {
        warnings.push('No API paths defined in OpenAPI spec');
      }
    }

    // Check for components section (optional)
    if (!spec.components) {
      warnings.push('OpenAPI components section is missing (schemas, responses, etc.)');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * AC-15.1.4: Fetch OpenAPI spec from /api/docs-json endpoint
   *
   * Uses retry service with exponential backoff for resilience.
   *
   * @returns Promise<any> - OpenAPI specification
   * @throws HttpException if fetch fails
   */
  async fetchOpenApiSpec(): Promise<any> {
    const context = 'fetchOpenApiSpec';

    try {
      const baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:3000';
      const url = `${baseUrl}${this.DOCS_JSON_PATH}`;

      this.logger.log('Fetching OpenAPI spec', {
        module: 'PostmanCollection',
        service: 'PostmanCollectionService',
        method: context,
        url,
      });

      const result = await this.retryService.executeWithRetry(
        async () => {
          const response = await firstValueFrom(
            this.httpService.get(url, {
              timeout: 5000,
              validateStatus: (status) => status === 200,
            }),
          );
          return response.data;
        },
        {
          context: `Fetch OpenAPI spec from ${url}`,
          maxAttempts: 3,
          baseDelay: 1000,
        },
      );

      this.logger.log('OpenAPI spec fetched successfully', {
        module: 'PostmanCollection',
        service: 'PostmanCollectionService',
        method: context,
        specTitle: result.info?.title,
        specVersion: result.openapi,
        endpointCount: Object.keys(result.paths || {}).length,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to fetch OpenAPI spec: ${errorMessage}`, undefined, {
        module: 'PostmanCollection',
        service: 'PostmanCollectionService',
        method: context,
      });

      throw new HttpException(
        {
          message: 'Failed to fetch OpenAPI specification',
          error: errorMessage,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * AC-15.1.5: Convert OpenAPI spec using openapi-to-postmanv2
   *
   * @param openApiSpec - Validated OpenAPI specification
   * @returns Promise<PostmanCollection> - Converted collection
   * @throws Error if conversion fails
   */
  private async convertToPostman(openApiSpec: any): Promise<PostmanCollection> {
    return new Promise((resolve, reject) => {
      const conversionOptions = {
        outputVersion: '2.1.0',
        includeAuthInfoInDescription: false,
        folderStrategy: 'Paths' as const,
      };

      Converter.convert({ type: 'json', data: openApiSpec }, conversionOptions, (err: any, result: any) => {
        if (err) {
          reject(new Error(`Conversion failed: ${err}`));
          return;
        }

        if (result && result.output && result.output[0] && result.output[0].data) {
          resolve(result.output[0].data);
        } else {
          reject(new Error('Invalid conversion result'));
        }
      });
    });
  }

  /**
   * AC-15.1.6: Post-process collection to add metadata and environment variables
   *
   * Adds collection metadata, auth configuration, and environment variables
   * to make the collection immediately usable in Postman.
   *
   * @param collection - Postman Collection from converter
   * @returns PostmanCollection - Processed collection
   */
  postProcessCollection(collection: PostmanCollection): PostmanCollection {
    const context = 'postProcessCollection';

    try {
      // Ensure info section exists
      if (!collection.info) {
        collection.info = {
          name: 'API Collection',
          description: 'Auto-generated from OpenAPI specification. Contains all endpoints from the API.',
          version: this.COLLECTION_VERSION,
        };
      } else {
        // Update collection metadata
        collection.info = {
          ...collection.info,
          name: collection.info.name || 'API Collection',
          description:
            collection.info.description ||
            'Auto-generated from OpenAPI specification. Contains all endpoints from the API.',
          version: collection.info.version || this.COLLECTION_VERSION,
        };
      }

      // Configure authentication for all requests
      // Add environment variables for common values
      if (!collection.auth && collection.item.length > 0) {
        collection.auth = {
          type: 'bearer',
          bearer: [
            {
              key: 'token',
              value: '{{authToken}}',
            },
          ],
        };

        this.logger.log('Added Bearer token authentication to collection', {
          module: 'PostmanCollection',
          service: 'PostmanCollectionService',
          method: context,
        });
      }

      // Process each item to ensure proper structure
      let endpointCount = 0;
      for (const item of collection.item) {
        if (item.request) {
          endpointCount++;

          // Ensure URL has proper variables
          if (item.request.url && item.request.url.raw) {
            // Add baseUrl variable to raw URL
            const baseUrlPattern = /https?:\/\/[^/]+/;
            if (baseUrlPattern.test(item.request.url.raw)) {
              item.request.url.raw = item.request.url.raw.replace(baseUrlPattern, '{{baseUrl}}');
            }
          }

          // Ensure auth header is set if collection has auth
          if (collection.auth && collection.auth.type === 'bearer') {
            if (!item.request.header) {
              item.request.header = [];
            }

            // Check if Authorization header already exists
            const hasAuthHeader = item.request.header.some((h) => h.key.toLowerCase() === 'authorization');

            if (!hasAuthHeader) {
              item.request.header.push({
                key: 'Authorization',
                value: 'Bearer {{authToken}}',
                type: 'text',
              });
            }
          }
        }
      }

      this.logger.log('Collection post-processing completed', {
        module: 'PostmanCollection',
        service: 'PostmanCollectionService',
        method: context,
        endpointCount,
        hasAuth: !!collection.auth,
      });

      return collection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.warn(`Collection post-processing failed: ${errorMessage}`, {
        module: 'PostmanCollection',
        service: 'PostmanCollectionService',
        method: context,
      });

      // Return original collection if post-processing fails
      return collection;
    }
  }

  /**
   * AC-15.2.1: Generate Postman Environment for specified type
   *
   * Creates environment configuration with baseUrl, authToken, and apiKey variables.
   * Sensitive variables (authToken, apiKey) are marked as type: 'hidden'.
   * baseUrl is marked as type: 'text' for easy visibility.
   *
   * @param envType - Environment type (dev, staging, prod)
   * @returns Promise<PostmanEnvironment> - Generated environment
   * @throws HttpException if environment generation fails
   */
  async generateEnvironment(envType: EnvironmentType): Promise<PostmanEnvironment> {
    const context = 'generateEnvironment';

    try {
      this.logger.log(`Generating environment for: ${envType}`, {
        module: 'PostmanCollection',
        service: 'PostmanCollectionService',
        method: context,
        environment: envType,
      });

      // Get environment configuration
      const config = this.getEnvironmentConfig(envType);

      // Create environment variables
      const environmentVariables = [
        {
          key: 'baseUrl',
          value: config.baseUrl,
          enabled: true,
          type: 'text' as const,
        },
        {
          key: 'authToken',
          value: config.authToken,
          enabled: true,
          type: 'hidden' as const,
        },
        {
          key: 'apiKey',
          value: config.apiKey,
          enabled: true,
          type: 'hidden' as const,
        },
      ];

      // Build environment object
      const environment: PostmanEnvironment = {
        id: this.generateEnvironmentId(envType),
        name: `API Environment - ${this.getEnvironmentDisplayName(envType)}`,
        values: environmentVariables,
        _postman_variable_scope: ['environment'],
        _postman_exported_at: new Date().toISOString(),
        _postman_exported_using: 'BMAD Postman Collection Generator',
      };

      this.logger.log('Environment generated successfully', {
        module: 'PostmanCollection',
        service: 'PostmanCollectionService',
        method: context,
        environment: envType,
        variableCount: environmentVariables.length,
      });

      return environment;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to generate environment: ${errorMessage}`, undefined, {
        module: 'PostmanCollection',
        service: 'PostmanCollectionService',
        method: context,
        environment: envType,
      });

      throw new HttpException(
        {
          message: 'Failed to generate Postman environment',
          error: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * AC-15.2.2: Convert environment to JSON buffer for download
   *
   * @param envType - Environment type
   * @returns Promise<Buffer> - Buffer containing JSON data
   * @throws HttpException if conversion fails
   */
  async getEnvironmentJson(envType: EnvironmentType): Promise<Buffer> {
    try {
      const environment = await this.generateEnvironment(envType);
      const jsonString = JSON.stringify(environment, null, 2);
      return Buffer.from(jsonString, 'utf-8');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to generate environment JSON: ${errorMessage}`, undefined, {
        module: 'PostmanCollection',
        service: 'PostmanCollectionService',
        method: 'getEnvironmentJson',
        environment: envType,
      });

      throw new HttpException(
        {
          message: 'Failed to generate Postman environment JSON',
          error: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * AC-15.2.3: Get environment configuration for specific type
   *
   * Returns environment-specific values for baseUrl, authToken, and apiKey.
   * baseUrl dynamically configures from NODE_ENV environment variable.
   *
   * @param envType - Environment type
   * @returns Environment configuration object
   */
  getEnvironmentConfig(envType: EnvironmentType): {
    baseUrl: string;
    authToken: string;
    apiKey: string;
  } {
    const context = 'getEnvironmentConfig';

    // Get current environment from NODE_ENV
    const currentEnv = this.configService.get<string>('NODE_ENV') || 'development';

    this.logger.log(`Getting configuration for environment: ${envType}`, {
      module: 'PostmanCollection',
      service: 'PostmanCollectionService',
      method: context,
      environment: envType,
      currentNodeEnv: currentEnv,
    });

    // Build base URL based on environment type
    let baseUrl: string;
    let authToken: string;
    let apiKey: string;

    switch (envType) {
      case EnvironmentType.DEVELOPMENT:
        baseUrl = 'http://localhost:3000/api';
        authToken = '';
        apiKey = '';
        break;

      case EnvironmentType.STAGING: {
        // Use STAGING_API_URL from environment, fallback to config
        const stagingApiUrl = this.configService.get<string>('STAGING_API_URL');
        baseUrl = stagingApiUrl ? `${stagingApiUrl}/api` : 'https://staging-api.example.com/api';
        authToken = '';
        apiKey = '';
        break;
      }

      case EnvironmentType.PRODUCTION: {
        // Use PROD_API_URL from environment, fallback to config
        const prodApiUrl = this.configService.get<string>('PROD_API_URL');
        baseUrl = prodApiUrl ? `${prodApiUrl}/api` : 'https://api.example.com/api';
        authToken = '';
        apiKey = '';
        break;
      }

      default:
        throw new HttpException(
          {
            message: `Invalid environment type: ${envType}`,
          },
          HttpStatus.BAD_REQUEST,
        );
    }

    return { baseUrl, authToken, apiKey };
  }

  /**
   * Generate unique environment ID
   * @param envType - Environment type
   * @returns string - Generated ID
   */
  private generateEnvironmentId(envType: EnvironmentType): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `env-${envType}-${timestamp}-${random}`;
  }

  /**
   * Get environment display name
   * @param envType - Environment type
   * @returns string - Display name
   */
  private getEnvironmentDisplayName(envType: EnvironmentType): string {
    const displayNames = {
      [EnvironmentType.DEVELOPMENT]: 'DEVELOPMENT',
      [EnvironmentType.STAGING]: 'STAGING',
      [EnvironmentType.PRODUCTION]: 'PRODUCTION',
    };
    return displayNames[envType];
  }
}
