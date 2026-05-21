/**
 * Postman Collection Interface Definitions
 * Part of Epic 15: Postman Collection Export
 */

import { Request } from 'express';

/**
 * Postman Collection structure matching v2.1.0 format
 */
export interface PostmanCollection {
  info: {
    name: string;
    description?: string;
    version: string;
  };
  auth?: {
    type: 'bearer' | 'apikey' | 'basic' | 'oauth2';
    bearer?: Array<{ key: string; value: string }>;
    apikey?: Array<{ key: string; value: string }>;
    basic?: Array<{ key: string; value: string }>;
    oauth2?: Array<{ key: string; value: string }>;
  };
  item: PostmanItem[];
}

/**
 * Individual request/folder in Postman collection
 */
export interface PostmanItem {
  name: string;
  request: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
    header?: PostmanHeader[];
    url: {
      raw: string;
      host: string[];
      path: string[];
      query?: Array<{ key: string; value: string }>;
      variable?: Array<{ key: string; value: string }>;
    };
    body?: {
      mode: 'raw' | 'urlencoded' | 'formdata' | 'file';
      raw?: string;
      urlencoded?: Array<{ key: string; value: string }>;
      formdata?: Array<{ key: string; value: string | object }>;
    };
  };
  response?: PostmanResponse[];
}

/**
 * Postman request/response header
 */
export interface PostmanHeader {
  key: string;
  value: string;
  type?: string;
}

/**
 * Sample response definition
 */
export interface PostmanResponse {
  name?: string;
  originalRequest: Request;
  status: string;
  code: number;
  _postman_previewlanguage?: string;
  header?: PostmanHeader[];
  body?: string;
}

/**
 * OpenAPI 3.0 spec validation result
 */
export interface OpenApiValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Environment types for different deployment stages
 */
export enum EnvironmentType {
  DEVELOPMENT = 'dev',
  STAGING = 'staging',
  PRODUCTION = 'prod',
}

/**
 * Individual variable in Postman environment
 */
export interface PostmanEnvironmentVariable {
  key: string;
  value: string;
  enabled: boolean;
  type?: 'text' | 'hidden' | 'default';
}

/**
 * Postman Environment structure matching v2.1.0 format
 */
export interface PostmanEnvironment {
  id: string;
  name: string;
  values: PostmanEnvironmentVariable[];
  _postman_variable_scope?: string[];
  _postman_exported_at?: string;
  _postman_exported_using?: string;
}

/**
 * Postman Collection Service Interface
 * Defines the contract for converting OpenAPI specs to Postman Collections
 */
export interface IPostmanCollectionService {
  /**
   * Generate Postman Collection from OpenAPI specification
   * @returns Promise<PostmanCollection> - Formatted collection
   */
  generateCollectionFromSwagger(): Promise<PostmanCollection>;

  /**
   * Convert OpenAPI spec to Postman Collection JSON buffer
   * @returns Promise<Buffer> - Buffer containing JSON data
   */
  getCollectionJson(): Promise<Buffer>;

  /**
   * Validate OpenAPI 3.0 specification
   * @param spec - OpenAPI specification object
   * @returns OpenApiValidationResult - Validation result
   */
  validateOpenApiSpec(spec: any): OpenApiValidationResult;

  /**
   * Fetch OpenAPI spec from /api/docs-json endpoint
   * @returns Promise<any> - OpenAPI specification
   */
  fetchOpenApiSpec(): Promise<any>;

  /**
   * Post-process collection to add metadata and environment variables
   * @param collection - Postman Collection
   * @returns PostmanCollection - Processed collection
   */
  postProcessCollection(collection: PostmanCollection): PostmanCollection;

  /**
   * Generate Postman Environment for specified type
   * @param envType - Environment type (dev, staging, prod)
   * @returns Promise<PostmanEnvironment> - Generated environment
   */
  generateEnvironment(envType: EnvironmentType): Promise<PostmanEnvironment>;

  /**
   * Convert environment to JSON buffer for download
   * @param envType - Environment type
   * @returns Promise<Buffer> - Buffer containing JSON data
   */
  getEnvironmentJson(envType: EnvironmentType): Promise<Buffer>;

  /**
   * Get environment configuration for specific type
   * @param envType - Environment type
   * @returns Environment configuration object
   */
  getEnvironmentConfig(envType: EnvironmentType): {
    baseUrl: string;
    authToken: string;
    apiKey: string;
  };
}
