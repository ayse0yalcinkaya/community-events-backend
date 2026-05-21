// Libraries
import { Test, TestingModule } from '@nestjs/testing';
import { ModuleRef } from '@nestjs/core';

// Factories
import { ExcelAdapterFactory } from '../excel-adapter.factory';

// Interfaces
import { IExcelAdapter } from '../../interfaces/excel-adapter.interface';

// Base
import { BaseExcelAdapter } from '../../base/base-excel-adapter.abstract';

// Decorators
import { RegisterExcelAdapter } from '../../decorators/register-excel-adapter.decorator';

// Exceptions
import { AdapterNotFoundException } from '../../exceptions/adapter-not-found.exception';

/**
 * Test Excel adapter implementation
 */
@RegisterExcelAdapter('test-adapter')
class TestExcelAdapter extends BaseExcelAdapter implements IExcelAdapter {
  readonly adapterName = 'test-adapter';

  async buildWorkbook(workbook: any, data: any, lang: string): Promise<void> {
    // Mock implementation for testing
  }
}

/**
 * Another test Excel adapter implementation
 */
@RegisterExcelAdapter('another-adapter')
class AnotherTestExcelAdapter extends BaseExcelAdapter implements IExcelAdapter {
  readonly adapterName = 'another-adapter';

  async buildWorkbook(workbook: any, data: any, lang: string): Promise<void> {
    // Mock implementation for testing
  }
}

describe('ExcelAdapterFactory', () => {
  let factory: ExcelAdapterFactory;
  let moduleRef: ModuleRef;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExcelAdapterFactory,
        {
          provide: ModuleRef,
          useValue: {
            get: jest.fn(),
          },
        },
        TestExcelAdapter,
        AnotherTestExcelAdapter,
      ],
    }).compile();

    factory = module.get<ExcelAdapterFactory>(ExcelAdapterFactory);
    moduleRef = module.get<ModuleRef>(ModuleRef);
  });

  describe('onModuleInit', () => {
    it('should initialize factory without errors', () => {
      expect(() => factory.onModuleInit()).not.toThrow();
    });
  });

  describe('registerAdapter', () => {
    it('should register adapter with @RegisterExcelAdapter decorator', () => {
      factory.registerAdapter(TestExcelAdapter);

      const adapters = factory.getRegisteredAdapters();
      expect(adapters).toContain('test-adapter');
    });

    it('should normalize adapter name (trim and lowercase)', () => {
      factory.registerAdapter(TestExcelAdapter);

      const mockAdapter = new TestExcelAdapter();
      (moduleRef.get as jest.Mock).mockReturnValue(mockAdapter);

      // Try to get adapter with different case and whitespace
      const adapter = factory.getAdapter('  TEST-ADAPTER  ');
      expect(adapter).toBeDefined();
    });

    it('should skip registration if class does not have decorator', () => {
      class NoDecoratorAdapter extends BaseExcelAdapter implements IExcelAdapter {
        readonly adapterName = 'no-decorator';

        async buildWorkbook(workbook: any, data: any, lang: string): Promise<void> {
          // Mock implementation
        }
      }

      factory.registerAdapter(NoDecoratorAdapter as any);

      const adapters = factory.getRegisteredAdapters();
      expect(adapters).not.toContain('no-decorator');
    });

    it('should overwrite existing adapter registration', () => {
      factory.registerAdapter(TestExcelAdapter);
      factory.registerAdapter(TestExcelAdapter); // Register again

      const adapters = factory.getRegisteredAdapters();
      expect(adapters.filter((a) => a === 'test-adapter')).toHaveLength(1);
    });
  });

  describe('getAdapter', () => {
    beforeEach(() => {
      factory.registerAdapter(TestExcelAdapter);
    });

    it('should return adapter instance via ModuleRef', () => {
      const mockAdapter = new TestExcelAdapter();
      (moduleRef.get as jest.Mock).mockReturnValue(mockAdapter);

      const adapter = factory.getAdapter('test-adapter');

      expect(adapter).toBe(mockAdapter);
      expect(moduleRef.get).toHaveBeenCalledWith(TestExcelAdapter, {
        strict: false,
      });
    });

    it('should cache adapter instance on subsequent calls', () => {
      const mockAdapter = new TestExcelAdapter();
      (moduleRef.get as jest.Mock).mockReturnValue(mockAdapter);

      const adapter1 = factory.getAdapter('test-adapter');
      const adapter2 = factory.getAdapter('test-adapter');

      expect(adapter1).toBe(adapter2);
      expect(moduleRef.get).toHaveBeenCalledTimes(1);
    });

    it('should normalize adapter name before lookup', () => {
      const mockAdapter = new TestExcelAdapter();
      (moduleRef.get as jest.Mock).mockReturnValue(mockAdapter);

      const adapter = factory.getAdapter('  TEST-ADAPTER  ');

      expect(adapter).toBeDefined();
    });

    it('should throw AdapterNotFoundException if adapter not found', () => {
      expect(() => factory.getAdapter('non-existent-adapter')).toThrow(AdapterNotFoundException);
    });

    it('should throw AdapterNotFoundException if ModuleRef.get fails', () => {
      (moduleRef.get as jest.Mock).mockImplementation(() => {
        throw new Error('Provider not found');
      });

      expect(() => factory.getAdapter('test-adapter')).toThrow(AdapterNotFoundException);
    });
  });

  describe('getRegisteredAdapters', () => {
    it('should return empty array when no adapters registered', () => {
      const adapters = factory.getRegisteredAdapters();
      expect(adapters).toEqual([]);
    });

    it('should return all registered adapter names', () => {
      factory.registerAdapter(TestExcelAdapter);
      factory.registerAdapter(AnotherTestExcelAdapter);

      const adapters = factory.getRegisteredAdapters();

      expect(adapters).toContain('test-adapter');
      expect(adapters).toContain('another-adapter');
      expect(adapters).toHaveLength(2);
    });
  });

  describe('normalizeAdapterName', () => {
    it('should normalize adapter names consistently', () => {
      factory.registerAdapter(TestExcelAdapter);

      const mockAdapter = new TestExcelAdapter();
      (moduleRef.get as jest.Mock).mockReturnValue(mockAdapter);

      // All these should resolve to the same adapter
      const adapter1 = factory.getAdapter('test-adapter');
      const adapter2 = factory.getAdapter('TEST-ADAPTER');
      const adapter3 = factory.getAdapter('  test-adapter  ');

      expect(adapter1).toBeDefined();
      expect(adapter2).toBeDefined();
      expect(adapter3).toBeDefined();
    });
  });
});
