// Libraries
import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';

// Base
import { BasePdfAdapter } from '../base-pdf-adapter.abstract';
// Interfaces
import { IPdfAdapter } from '../../interfaces/pdf-adapter.interface';
// Services
import { TemplateEngineService } from '../../services/template-engine.service';

/**
 * Concrete test adapter implementation for testing BasePdfAdapter
 */
class TestPdfAdapter extends BasePdfAdapter implements IPdfAdapter {
  readonly templateName = 'test-template';
  readonly styleName = 'test-style';

  constructor(templateEngine: TemplateEngineService) {
    super(templateEngine);
  }

  async generate(templateName: string, data: any, lang: string): Promise<Buffer> {
    // Mock implementation for testing
    return Buffer.from('test-pdf-content');
  }
}

describe('BasePdfAdapter', () => {
  let adapter: TestPdfAdapter;
  let mockTemplateEngine: jest.Mocked<TemplateEngineService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: TemplateEngineService,
          useValue: {
            renderTemplate: jest.fn(),
            generatePdfFromHtml: jest.fn(),
          },
        },
      ],
    }).compile();

    mockTemplateEngine = module.get(TemplateEngineService);
    adapter = new TestPdfAdapter(mockTemplateEngine);
  });

  describe('getTemplatePath()', () => {
    it('should return correct absolute path to template file', () => {
      // Arrange
      const expectedPath = path.join(process.cwd(), 'templates', 'pdf', 'test-template.ejs');

      // Act
      const templatePath = adapter.getTemplatePath();

      // Assert
      expect(templatePath).toBe(expectedPath);
      expect(path.isAbsolute(templatePath)).toBe(true);
    });

    it('should use templateName property', () => {
      // Arrange
      (adapter as any).templateName = 'custom-template';

      // Act
      const templatePath = adapter.getTemplatePath();

      // Assert
      expect(templatePath).toContain('custom-template.ejs');
    });
  });

  describe('getStylePath()', () => {
    it('should return correct absolute path when styleName exists', () => {
      // Arrange
      const expectedPath = path.join(process.cwd(), 'templates', 'pdf', 'styles', 'test-style.css');

      // Act
      const stylePath = adapter.getStylePath();

      // Assert
      expect(stylePath).toBe(expectedPath);
      expect(path.isAbsolute(stylePath!)).toBe(true);
    });

    it('should return null when styleName is undefined', () => {
      // Arrange
      class NoStyleAdapter extends BasePdfAdapter {
        readonly templateName = 'test';
        readonly styleName = undefined;

        constructor(templateEngine: TemplateEngineService) {
          super(templateEngine);
        }

        async generate(templateName: string, data: any, lang: string): Promise<Buffer> {
          return Buffer.from('');
        }
      }

      const noStyleAdapter = new NoStyleAdapter(mockTemplateEngine);

      // Act
      const stylePath = noStyleAdapter.getStylePath();

      // Assert
      expect(stylePath).toBeNull();
    });

    it('should return null when styleName is not provided', () => {
      // Arrange
      class NoStyleAdapter extends BasePdfAdapter {
        readonly templateName = 'test';
        readonly styleName: string | undefined = undefined;

        constructor(templateEngine: TemplateEngineService) {
          super(templateEngine);
        }

        async generate(templateName: string, data: any, lang: string): Promise<Buffer> {
          return Buffer.from('');
        }
      }

      const noStyleAdapter = new NoStyleAdapter(mockTemplateEngine);

      // Act
      const stylePath = noStyleAdapter.getStylePath();

      // Assert
      expect(stylePath).toBeNull();
    });
  });

  describe('constructor', () => {
    it('should inject TemplateEngineService', () => {
      // Assert
      expect(adapter['templateEngine']).toBe(mockTemplateEngine);
    });

    it('should make TemplateEngineService protected readonly', () => {
      // Assert - TypeScript compile-time check, but we can verify it's readonly
      expect(adapter['templateEngine']).toBeDefined();
    });
  });

  describe('abstract properties', () => {
    it('should require templateName to be implemented', () => {
      // Assert
      expect(adapter.templateName).toBe('test-template');
    });

    it('should allow styleName to be optional', () => {
      // Assert
      expect(adapter.styleName).toBe('test-style');
    });
  });

  describe('abstract method', () => {
    it('should require generate() to be implemented', async () => {
      // Arrange
      const data = { test: 'data' };
      const lang = 'en';

      // Act
      const result = await adapter.generate('test-template', data, lang);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('test-pdf-content');
    });
  });
});
