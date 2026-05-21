// Libraries
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import type { Cache } from 'cache-manager';

// Services
import { LoggerService } from '../../logger/logger.service';
import { CacheService } from '../cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: jest.Mocked<Cache>;
  let loggerService: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    // Mock CacheManager
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      store: {
        reset: jest.fn(),
      },
    };

    // Mock LoggerService
    const mockLoggerService = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    cacheManager = module.get(CACHE_MANAGER);
    loggerService = module.get(LoggerService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateCacheKey (AC-6.5.2)', () => {
    it('should generate cache key with prefix and hash', () => {
      const key = service.generateCacheKey('doc', 'PDF', 'invoice');
      expect(key).toMatch(/^doc:[a-f0-9]{64}$/);
    });

    it('should generate consistent hash for same data', () => {
      const data1 = { userId: 123, template: 'invoice' };
      const data2 = { template: 'invoice', userId: 123 };
      const key1 = service.generateCacheKey('doc', 'PDF', 'invoice', data1);
      const key2 = service.generateCacheKey('doc', 'PDF', 'invoice', data2);
      expect(key1).toBe(key2);
    });

    it('should generate different hash for different data', () => {
      const data1 = { userId: 123 };
      const data2 = { userId: 456 };
      const key1 = service.generateCacheKey('doc', 'PDF', 'invoice', data1);
      const key2 = service.generateCacheKey('doc', 'PDF', 'invoice', data2);
      expect(key1).not.toBe(key2);
    });

    it('should handle various input types (string, number, object, array)', () => {
      const key1 = service.generateCacheKey('user', 'profile', 123);
      const key2 = service.generateCacheKey('user', 'profile', '123');
      const key3 = service.generateCacheKey('user', 'profile', { id: 123 });
      const key4 = service.generateCacheKey('user', 'profile', [123, 456]);

      expect(key1).toMatch(/^user:[a-f0-9]{64}$/);
      expect(key2).toMatch(/^user:[a-f0-9]{64}$/);
      expect(key3).toMatch(/^user:[a-f0-9]{64}$/);
      expect(key4).toMatch(/^user:[a-f0-9]{64}$/);

      // All should be different
      expect(key1).not.toBe(key2);
      expect(key2).not.toBe(key3);
      expect(key3).not.toBe(key4);
    });

    it('should handle nested objects with consistent hash', () => {
      const data1 = { user: { id: 123, name: 'John' }, meta: { count: 5 } };
      const data2 = { meta: { count: 5 }, user: { name: 'John', id: 123 } };
      const key1 = service.generateCacheKey('doc', 'PDF', data1);
      const key2 = service.generateCacheKey('doc', 'PDF', data2);
      expect(key1).toBe(key2);
    });

    it('should handle arrays with consistent hash', () => {
      const data1 = [1, 2, { a: 1, b: 2 }];
      const data2 = [1, 2, { b: 2, a: 1 }];
      const key1 = service.generateCacheKey('doc', 'PDF', data1);
      const key2 = service.generateCacheKey('doc', 'PDF', data2);
      expect(key1).toBe(key2);
    });
  });

  describe('get<T> (AC-6.5.3)', () => {
    it('should return cached value on cache hit', async () => {
      const key = 'doc:abc123...';
      const cachedValue = 's3://bucket/file.pdf';
      (cacheManager.get as jest.Mock).mockResolvedValue(cachedValue);

      const result = await service.get<string>(key);

      expect(result).toBe(cachedValue);
      expect(cacheManager.get).toHaveBeenCalledWith(key);
    });

    it('should return null on cache miss', async () => {
      const key = 'doc:abc123...';
      (cacheManager.get as jest.Mock).mockResolvedValue(undefined);

      const result = await service.get<string>(key);

      expect(result).toBeNull();
      expect(cacheManager.get).toHaveBeenCalledWith(key);
    });

    it('should return null when cache returns null', async () => {
      const key = 'doc:abc123...';
      (cacheManager.get as jest.Mock).mockResolvedValue(null);

      const result = await service.get<string>(key);

      expect(result).toBeNull();
    });

    it('should handle cache errors gracefully and return null', async () => {
      const key = 'doc:abc123...';
      const error = new Error('Cache connection failed');
      (cacheManager.get as jest.Mock).mockRejectedValue(error);

      const result = await service.get<string>(key);

      expect(result).toBeNull();
      expect(loggerService.warn).toHaveBeenCalledWith(
        'Cache get failed',
        expect.objectContaining({
          module: 'CacheService',
          method: 'get',
          key,
        }),
      );
    });

    it('should support generic types (string, number, object, array)', async () => {
      const key = 'test:key';

      // String type
      (cacheManager.get as jest.Mock).mockResolvedValue('test string');
      const stringResult = await service.get<string>(key);
      expect(stringResult).toBe('test string');

      // Number type
      (cacheManager.get as jest.Mock).mockResolvedValue(123);
      const numberResult = await service.get<number>(key);
      expect(numberResult).toBe(123);

      // Object type
      const objValue = { id: 1, name: 'test' };
      (cacheManager.get as jest.Mock).mockResolvedValue(objValue);
      const objResult = await service.get<typeof objValue>(key);
      expect(objResult).toEqual(objValue);

      // Array type
      const arrayValue = [1, 2, 3];
      (cacheManager.get as jest.Mock).mockResolvedValue(arrayValue);
      const arrayResult = await service.get<number[]>(key);
      expect(arrayResult).toEqual(arrayValue);
    });
  });

  describe('set<T> (AC-6.5.4)', () => {
    it('should set cached value with default TTL', async () => {
      const key = 'doc:abc123...';
      const value = 's3://bucket/file.pdf';

      await service.set(key, value);

      expect(cacheManager.set).toHaveBeenCalledWith(key, value, 3600000); // DEFAULT_TTL
    });

    it('should set cached value with custom TTL', async () => {
      const key = 'doc:abc123...';
      const value = 's3://bucket/file.pdf';
      const customTtl = 1800000; // 30 minutes

      await service.set(key, value, customTtl);

      expect(cacheManager.set).toHaveBeenCalledWith(key, value, customTtl);
    });

    it('should handle cache errors gracefully without throwing', async () => {
      const key = 'doc:abc123...';
      const value = 's3://bucket/file.pdf';
      const error = new Error('Cache connection failed');
      (cacheManager.set as jest.Mock).mockRejectedValue(error);

      await expect(service.set(key, value)).resolves.not.toThrow();
      expect(loggerService.warn).toHaveBeenCalledWith(
        'Cache set failed',
        expect.objectContaining({
          module: 'CacheService',
          method: 'set',
          key,
        }),
      );
    });

    it('should support generic types (string, number, object, array)', async () => {
      const key = 'test:key';

      // String type
      await service.set(key, 'test string');
      expect(cacheManager.set).toHaveBeenCalledWith(key, 'test string', 3600000);

      // Number type
      await service.set(key, 123);
      expect(cacheManager.set).toHaveBeenCalledWith(key, 123, 3600000);

      // Object type
      const objValue = { id: 1, name: 'test' };
      await service.set(key, objValue);
      expect(cacheManager.set).toHaveBeenCalledWith(key, objValue, 3600000);

      // Array type
      const arrayValue = [1, 2, 3];
      await service.set(key, arrayValue);
      expect(cacheManager.set).toHaveBeenCalledWith(key, arrayValue, 3600000);
    });
  });

  describe('delete (AC-6.5.5)', () => {
    it('should delete cache entry', async () => {
      const key = 'doc:abc123...';

      await service.delete(key);

      expect(cacheManager.del).toHaveBeenCalledWith(key);
    });

    it('should handle cache miss gracefully (idempotent)', async () => {
      const key = 'doc:abc123...';
      const error = new Error('Key not found');
      (cacheManager.del as jest.Mock).mockRejectedValue(error);

      await expect(service.delete(key)).resolves.not.toThrow();
      expect(loggerService.warn).toHaveBeenCalledWith(
        'Cache delete failed',
        expect.objectContaining({
          module: 'CacheService',
          method: 'delete',
          key,
        }),
      );
    });

    it('should not throw error on cache miss', async () => {
      const key = 'doc:abc123...';
      (cacheManager.del as jest.Mock).mockResolvedValue(undefined);

      await expect(service.delete(key)).resolves.not.toThrow();
    });
  });

  describe('clear (AC-6.5.6)', () => {
    it('should clear all cache entries when store.reset() is available', async () => {
      const mockReset = jest.fn().mockResolvedValue(undefined);
      (cacheManager as any).store = { reset: mockReset };

      await service.clear();

      expect(mockReset).toHaveBeenCalledTimes(1);
    });

    it('should handle clear errors gracefully', async () => {
      const error = new Error('Clear failed');
      const mockReset = jest.fn().mockRejectedValue(error);
      (cacheManager as any).store = { reset: mockReset };

      await expect(service.clear()).resolves.not.toThrow();
      expect(loggerService.warn).toHaveBeenCalledWith(
        'Cache clear failed',
        expect.objectContaining({
          module: 'CacheService',
          method: 'clear',
        }),
      );
    });

    it('should handle missing reset() method gracefully', async () => {
      (cacheManager as any).store = {};

      await expect(service.clear()).resolves.not.toThrow();
      expect(loggerService.warn).toHaveBeenCalledWith(
        'Cache clear: reset() not available, clearing may be incomplete',
        expect.objectContaining({
          module: 'CacheService',
          method: 'clear',
        }),
      );
    });
  });

  describe('Hash consistency (AC-6.5.7)', () => {
    it('should produce same hash for {a:1, b:2} and {b:2, a:1}', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 2, a: 1 };
      const key1 = service.generateCacheKey('test', obj1);
      const key2 = service.generateCacheKey('test', obj2);
      expect(key1).toBe(key2);
    });

    it('should produce same hash for nested objects with different key order', () => {
      const obj1 = { user: { id: 1, name: 'John' }, meta: { count: 5 } };
      const obj2 = { meta: { count: 5 }, user: { name: 'John', id: 1 } };
      const key1 = service.generateCacheKey('test', obj1);
      const key2 = service.generateCacheKey('test', obj2);
      expect(key1).toBe(key2);
    });

    it('should produce same hash for arrays with objects in different key order', () => {
      const arr1 = [{ a: 1, b: 2 }, { c: 3 }];
      const arr2 = [{ b: 2, a: 1 }, { c: 3 }];
      const key1 = service.generateCacheKey('test', arr1);
      const key2 = service.generateCacheKey('test', arr2);
      expect(key1).toBe(key2);
    });
  });

  describe('Service initialization', () => {
    it('should initialize without logger service', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: CACHE_MANAGER,
            useValue: {
              get: jest.fn(),
              set: jest.fn(),
              del: jest.fn(),
              store: { reset: jest.fn() },
            },
          },
        ],
      }).compile();

      const serviceWithoutLogger = module.get<CacheService>(CacheService);
      expect(serviceWithoutLogger).toBeDefined();
    });

    it('should log initialization when logger is provided', async () => {
      const mockLogger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: CACHE_MANAGER,
            useValue: {
              get: jest.fn().mockResolvedValue('test'),
              set: jest.fn().mockResolvedValue(undefined),
              del: jest.fn().mockResolvedValue(undefined),
              store: { reset: jest.fn() },
            },
          },
          {
            provide: LoggerService,
            useValue: mockLogger,
          },
        ],
      }).compile();

      const serviceWithLogger = module.get<CacheService>(CacheService);
      await serviceWithLogger.onModuleInit();

      expect(serviceWithLogger).toBeDefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'CacheService initialized - Redis connection successful',
        expect.objectContaining({
          module: 'CacheService',
          method: 'onModuleInit',
        }),
      );
    });
  });
});
