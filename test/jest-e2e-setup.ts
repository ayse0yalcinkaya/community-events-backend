/**
 * Jest E2E test environment setup
 * Sets up required environment variables for testing
 */

// Set NODE_ENV for config validation
process.env.NODE_ENV = 'development';

// CRITICAL: Use separate test database to avoid destroying production/development data
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('/community_events')) {
  // Override to use test database (must be different from main database!)
  // Add connection pool limits for parallel test execution
  process.env.DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5432/community_events_test?connection_limit=10&pool_timeout=20';
  console.warn('⚠️  Using TEST database: community_events_test (isolated from main database)');
}

// Set required environment variables if not already set
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-key-min-32-characters-long-for-testing';
}

if (!process.env.JWT_ACCESS_EXPIRATION) {
  process.env.JWT_ACCESS_EXPIRATION = '15m';
}

if (!process.env.JWT_REFRESH_EXPIRATION) {
  process.env.JWT_REFRESH_EXPIRATION = '7d';
}

// SMS/FONIVA service configuration
if (!process.env.FONIVA_API_URL) {
  process.env.FONIVA_API_URL = 'https://test-foniva-api.example.com';
}

if (!process.env.FONIVA_USERNAME) {
  process.env.FONIVA_USERNAME = 'test-username';
}

if (!process.env.FONIVA_PASSWORD) {
  process.env.FONIVA_PASSWORD = 'test-password';
}

if (!process.env.FONIVA_API_KEY) {
  process.env.FONIVA_API_KEY = 'test-api-key';
}

// SendGrid/Email configuration
if (!process.env.SENDGRID_API_KEY) {
  process.env.SENDGRID_API_KEY = 'SG.test-key-for-testing';
}

if (!process.env.MAIL_FROM) {
  process.env.MAIL_FROM = 'test@example.com';
}

if (!process.env.REDIS_PASSWORD) {
  process.env.REDIS_PASSWORD = 'test-redis-password';
}
