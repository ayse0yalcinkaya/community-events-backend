/**
 * Environment Configuration for Database Seeding
 *
 * Defines data volumes for each NODE_ENV environment
 * Ensures appropriate test data scale per environment
 *
 * Usage:
 *   import { ENVIRONMENT_CONFIG } from './environment.config';
 *   const userCount = ENVIRONMENT_CONFIG[getEnvironment()].users;
 */

export interface IEnvironmentConfig {
  users: number;
  files: number;
  sms: number;
  roles: string[];
  notifications: number;
  notificationPreferences: number;
  deviceTokens: number;
  otpVerifications: number;
  refreshTokens: number;
}

/**
 * Get current environment with fallback
 */
export function getEnvironment(): string {
  const env = process.env.NODE_ENV || 'development';
  const validEnvs = ['development', 'test', 'staging', 'production'];
  return validEnvs.includes(env) ? env : 'development';
}

/**
 * Environment-specific data volumes
 *
 * Volumes are calibrated for:
 * - Test: Minimal for CI/CD speed (< 3 seconds)
 * - Development: Full dataset for feature testing
 * - Staging: Medium dataset for pre-production validation
 * - Production: Disabled (never seed production)
 */
export const ENVIRONMENT_CONFIG: Record<string, IEnvironmentConfig> = {
  development: {
    users: 50,
    files: 20,
    sms: 100,
    roles: ['admin', 'staff', 'user', 'guest'],
    notifications: 200,
    notificationPreferences: 150,
    deviceTokens: 150,
    otpVerifications: 100,
    refreshTokens: 50
  },
  test: {
    users: 5,
    files: 3,
    sms: 10,
    roles: ['admin', 'staff'],
    notifications: 10,
    notificationPreferences: 10,
    deviceTokens: 10,
    otpVerifications: 10,
    refreshTokens: 10
  },
  staging: {
    users: 25,
    files: 10,
    sms: 50,
    roles: ['admin', 'staff', 'user'],
    notifications: 100,
    notificationPreferences: 75,
    deviceTokens: 75,
    otpVerifications: 50,
    refreshTokens: 25
  },
  production: {
    users: 0,
    files: 0,
    sms: 0,
    roles: [],
    notifications: 0,
    notificationPreferences: 0,
    deviceTokens: 0,
    otpVerifications: 0,
    refreshTokens: 0
  }
};

/**
 * Get current environment configuration
 */
export function getCurrentEnvironmentConfig(): IEnvironmentConfig {
  return ENVIRONMENT_CONFIG[getEnvironment()];
}
