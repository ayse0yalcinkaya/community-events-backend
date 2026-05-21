// Libraries
import { Test, TestingModule } from '@nestjs/testing';
import { ModuleRef } from '@nestjs/core';

// Factories
import { PdfAdapterFactory } from '../pdf-adapter.factory';

// Interfaces
import { IPdfAdapter } from '../../interfaces/pdf-adapter.interface';

// Base
import { BasePdfAdapter } from '../../base/base-pdf-adapter.abstract';

// Services
import { TemplateEngineService } from '../../services/template-engine.service';

// Decorators
import { RegisterPdfAdapter } from '../../decorators/register-pdf-adapter.decorator';

// Exceptions
import { AdapterNotFoundException } from '../../exceptions/adapter-not-found.exception';

/**
 * Test PDF adapter implementation
 */
@RegisterPdfAdapter('test-template')
class TestPdfAdapter extends BasePdfAdapter implements IPdfAdapter {
  readonly templateName = 'test-template';
  readonly styleName = 'test-style';

  constructor(templateEngine: TemplateEngineService) {
    super(templateEngine);
  }

  async generate(templateName: string, data: any, lang: string): Promise<Buffer> {
    return Buffer.from('test-pdf-content');
  }
}

/**
 * Another test PDF adapter implementation
 */
@RegisterPdfAdapter('another-template')
class AnotherTestPdfAdapter extends BasePdfAdapter implements IPdfAdapter {
  readonly templateName = 'another-template';
  readonly styleName = 'another-style';

  constructor(templateEngine: TemplateEngineService) {
    super(templateEngine);
  }

  async generate(templateName: string, data: any, lang: string): Promise<Buffer> {
    return Buffer.from('another-pdf-content');
  }
}

describe('PdfAdapterFactory', () => {
  let factory: PdfAdapterFactory;
  let moduleRef: ModuleRef;
  let mockTemplateEngine: jest.Mocked<TemplateEngineService>;

  beforeEach(async () => {
    mockTemplateEngine = {
      renderTemplate: jest.fn(),
      generatePdfFromHtml: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfAdapterFactory,
        {
          provide: ModuleRef,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: TemplateEngineService,
          useValue: mockTemplateEngine,
        },
        TestPdfAdapter,
        AnotherTestPdfAdapter,
      ],
    }).compile();

    factory = module.get<PdfAdapterFactory>(PdfAdapterFactory);
    moduleRef = module.get<ModuleRef>(ModuleRef);
  });

  describe('onModuleInit', () => {
    it('should initialize factory without errors', () => {
      expect(() => factory.onModuleInit()).not.toThrow();
    });
  });

  describe('registerAdapter', () => {
    it('should register adapter with @RegisterPdfAdapter decorator', () => {
      factory.registerAdapter(TestPdfAdapter);

      const templates = factory.getRegisteredTemplates();
      expect(templates).toContain('test-template');
    });

    it('should normalize template name (trim and lowercase)', () => {
      factory.registerAdapter(TestPdfAdapter);

      const mockAdapter = new TestPdfAdapter(mockTemplateEngine);
      (moduleRef.get as jest.Mock).mockReturnValue(mockAdapter);

      // Try to get adapter with different case and whitespace
      const adapter = factory.getAdapter('  TEST-TEMPLATE  ');
      expect(adapter).toBeDefined();
    });

    it('should skip registration if class does not have decorator', () => {
      class NoDecoratorAdapter extends BasePdfAdapter implements IPdfAdapter {
        readonly templateName = 'no-decorator';
        readonly styleName = 'no-decorator';

        constructor(templateEngine: TemplateEngineService) {
          super(templateEngine);
        }

        async generate(templateName: string, data: any, lang: string): Promise<Buffer> {
          return Buffer.from('test');
        }
      }

      factory.registerAdapter(NoDecoratorAdapter as any);

      const templates = factory.getRegisteredTemplates();
      expect(templates).not.toContain('no-decorator');
    });

    it('should overwrite existing adapter registration', () => {
      factory.registerAdapter(TestPdfAdapter);
      factory.registerAdapter(TestPdfAdapter); // Register again

      const templates = factory.getRegisteredTemplates();
      expect(templates.filter((t) => t === 'test-template')).toHaveLength(1);
    });
  });

  describe('getAdapter', () => {
    beforeEach(() => {
      factory.registerAdapter(TestPdfAdapter);
    });

    it('should return adapter instance via ModuleRef', () => {
      const mockAdapter = new TestPdfAdapter(mockTemplateEngine);
      (moduleRef.get as jest.Mock).mockReturnValue(mockAdapter);

      const adapter = factory.getAdapter('test-template');

      expect(adapter).toBe(mockAdapter);
      expect(moduleRef.get).toHaveBeenCalledWith(TestPdfAdapter, {
        strict: false,
      });
    });

    it('should cache adapter instance on subsequent calls', () => {
      const mockAdapter = new TestPdfAdapter(mockTemplateEngine);
      (moduleRef.get as jest.Mock).mockReturnValue(mockAdapter);

      const adapter1 = factory.getAdapter('test-template');
      const adapter2 = factory.getAdapter('test-template');

      expect(adapter1).toBe(adapter2);
      expect(moduleRef.get).toHaveBeenCalledTimes(1);
    });

    it('should normalize template name before lookup', () => {
      const mockAdapter = new TestPdfAdapter(mockTemplateEngine);
      (moduleRef.get as jest.Mock).mockReturnValue(mockAdapter);

      const adapter = factory.getAdapter('  TEST-TEMPLATE  ');

      expect(adapter).toBeDefined();
    });

    it('should throw AdapterNotFoundException if adapter not found', () => {
      expect(() => factory.getAdapter('non-existent-template')).toThrow(AdapterNotFoundException);
    });

    it('should throw AdapterNotFoundException if ModuleRef.get fails', () => {
      (moduleRef.get as jest.Mock).mockImplementation(() => {
        throw new Error('Provider not found');
      });

      expect(() => factory.getAdapter('test-template')).toThrow(AdapterNotFoundException);
    });
  });

  describe('getRegisteredTemplates', () => {
    it('should return empty array when no adapters registered', () => {
      const templates = factory.getRegisteredTemplates();
      expect(templates).toEqual([]);
    });

    it('should return all registered template names', () => {
      factory.registerAdapter(TestPdfAdapter);
      factory.registerAdapter(AnotherTestPdfAdapter);

      const templates = factory.getRegisteredTemplates();

      expect(templates).toContain('test-template');
      expect(templates).toContain('another-template');
      expect(templates).toHaveLength(2);
    });
  });

  describe('normalizeTemplateName', () => {
    it('should normalize template names consistently', () => {
      factory.registerAdapter(TestPdfAdapter);

      const mockAdapter = new TestPdfAdapter(mockTemplateEngine);
      (moduleRef.get as jest.Mock).mockReturnValue(mockAdapter);

      // All these should resolve to the same adapter
      const adapter1 = factory.getAdapter('test-template');
      const adapter2 = factory.getAdapter('TEST-TEMPLATE');
      const adapter3 = factory.getAdapter('  test-template  ');

      expect(adapter1).toBeDefined();
      expect(adapter2).toBeDefined();
      expect(adapter3).toBeDefined();
    });
  });
});
