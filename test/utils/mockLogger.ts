/**
 * Mock Logger for Unit Tests
 *
 * Usage:
 * ```typescript
 * import { createMockLogger } from 'test/utils';
 *
 * const module = await Test.createTestingModule({
 *   providers: [
 *     MyService,
 *     { provide: Logger, useValue: createMockLogger() },
 *   ],
 * }).compile();
 * ```
 */
export const createMockLogger = () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  setContext: jest.fn(),
});

export type MockLogger = ReturnType<typeof createMockLogger>;
