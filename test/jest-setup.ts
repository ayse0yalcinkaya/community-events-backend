/**
 * Jest Setup File
 *
 * This file runs before all tests to configure the test environment.
 * It loads environment variables from .env.test for integration and e2e tests.
 */
// Libraries
import { join } from 'path';
import { config } from 'dotenv';

// Load .env.test file for integration tests
// This overrides .env and uses the test database (community_events_test)
config({ path: join(__dirname, '..', '.env.test') });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Increase Jest timeout for integration tests (database operations can be slower)
jest.setTimeout(30000); // 30 seconds
