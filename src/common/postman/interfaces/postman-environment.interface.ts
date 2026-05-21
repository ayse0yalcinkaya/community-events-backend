/**
 * Postman Environment Interface Definitions
 * Part of Epic 15: Postman Collection Export - Story 15-2
 */

import { PostmanCollection } from './postman-collection.interface';

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
 *
 * Environment files in Postman define variables that can be referenced
 * in collection requests using {{variableName}} syntax.
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
 * Result of environment generation operation
 */
export interface EnvironmentGenerationResult {
  environment: PostmanEnvironment;
  jsonBuffer: Buffer;
  fileName: string;
}

/**
 * Postman Environment Service Interface
 * Defines the contract for generating Postman environment files
 */
export interface IPostmanEnvironmentService {
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

  /**
   * Generate environment with all environment types
   * @returns Promise<Map<EnvironmentType, PostmanEnvironment>> - Map of all environments
   */
  generateAllEnvironments(): Promise<Map<EnvironmentType, PostmanEnvironment>>;
}
