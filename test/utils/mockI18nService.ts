/**
 * Mock I18nService for Unit Tests
 *
 * Usage:
 * ```typescript
 * import { createMockI18nService } from 'test/utils';
 *
 * const module = await Test.createTestingModule({
 *   providers: [
 *     MyService,
 *     { provide: I18nService, useValue: createMockI18nService() },
 *   ],
 * }).compile();
 * ```
 */
export const createMockI18nService = () => ({
  t: jest.fn((key: string) => key),
  translate: jest.fn((key: string) => key),
  lang: jest.fn(() => 'en'),
});

export type MockI18nService = ReturnType<typeof createMockI18nService>;
