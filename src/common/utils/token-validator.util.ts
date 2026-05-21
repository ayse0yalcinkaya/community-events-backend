/**
 * Token validation utilities
 *
 * This module provides utility functions for validating various types of tokens
 * used throughout the application.
 */

/**
 * Validate FCM token format
 *
 * @param token - FCM token to validate
 * @returns boolean - True if token format is valid
 *
 * @example
 * ```typescript
 * const isValid = isValidFcmToken('fcm_token_here');
 * ```
 */
export function isValidFcmToken(token: string): boolean {
  // Basic FCM token validation (starts with specific patterns)
  const validPatterns = [
    /^[A-Za-z0-9:_-]{140,}$/, // Standard FCM token pattern
    /^[A-Za-z0-9:_-]{32,}$/, // Shortened token pattern
  ];

  return validPatterns.some((pattern) => pattern.test(token));
}

/**
 * Validate Firebase topic name format
 *
 * @param topic - Topic name to validate
 * @returns boolean - True if topic name is valid
 *
 * @example
 * ```typescript
 * const isValid = isValidTopicName('news');
 * ```
 */
export function isValidTopicName(topic: string): boolean {
  // Firebase topic names must match pattern: [a-zA-Z0-9-_.~%]+
  const topicPattern = /^[a-zA-Z0-9\-_.~%]+$/;
  return topicPattern.test(topic) && topic.length > 0 && topic.length <= 255;
}

/**
 * Validate JWT token format
 *
 * @param token - JWT token to validate
 * @returns boolean - True if token format is valid
 *
 * @example
 * ```typescript
 * const isValid = isValidJwtToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
 * ```
 */
export function isValidJwtToken(token: string): boolean {
  // JWT tokens have 3 parts separated by dots
  const jwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
  return jwtPattern.test(token) && token.length > 0;
}

/**
 * Validate API key format
 *
 * @param apiKey - API key to validate
 * @returns boolean - True if API key format is valid
 *
 * @example
 * ```typescript
 * const isValid = isValidApiKey('api_key_123456789');
 * ```
 */
export function isValidApiKey(apiKey: string): boolean {
  // API keys should be alphanumeric with optional underscores/dashes
  const apiKeyPattern = /^[A-Za-z0-9_-]{16,}$/;
  return apiKeyPattern.test(apiKey);
}
