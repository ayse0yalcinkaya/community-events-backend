// Interfaces
import { IPdfAdapter } from '../pdf-adapter.interface';

describe('IPdfAdapter Interface', () => {
  /**
   * Test implementation of IPdfAdapter interface
   */
  class TestPdfAdapter implements IPdfAdapter {
    readonly templateName: string = 'test-template';
    readonly styleName?: string = 'test-style';

    async generate(templateName: string, data: any, lang: string): Promise<Buffer> {
      return Buffer.from('');
    }

    getTemplatePath(): string {
      return '/path/to/template.ejs';
    }

    getStylePath(): string | null {
      return '/path/to/style.css';
    }
  }

  describe('interface contract', () => {
    it('should require templateName property', () => {
      // Arrange
      const adapter = new TestPdfAdapter();

      // Assert
      expect(adapter.templateName).toBeDefined();
      expect(typeof adapter.templateName).toBe('string');
    });

    it('should allow styleName to be optional', () => {
      // Arrange
      class NoStyleAdapter implements IPdfAdapter {
        readonly templateName: string = 'test';
        readonly styleName?: string;

        async generate(templateName: string, data: any, lang: string): Promise<Buffer> {
          return Buffer.from('');
        }

        getTemplatePath(): string {
          return '/path/to/template.ejs';
        }

        getStylePath(): string | null {
          return null;
        }
      }

      const adapter = new NoStyleAdapter();

      // Assert
      expect(adapter.styleName).toBeUndefined();
    });

    it('should require generate() method', () => {
      // Arrange
      const adapter = new TestPdfAdapter();

      // Assert
      expect(typeof adapter.generate).toBe('function');
      expect(adapter.generate.length).toBe(3); // templateName, data, lang
    });

    it('should require getTemplatePath() method', () => {
      // Arrange
      const adapter = new TestPdfAdapter();

      // Assert
      expect(typeof adapter.getTemplatePath).toBe('function');
      expect(adapter.getTemplatePath.length).toBe(0);
    });

    it('should require getStylePath() method', () => {
      // Arrange
      const adapter = new TestPdfAdapter();

      // Assert
      expect(typeof adapter.getStylePath).toBe('function');
      expect(adapter.getStylePath.length).toBe(0);
    });
  });

  describe('generate() method signature', () => {
    it('should accept templateName, data, and lang parameters', async () => {
      // Arrange
      const adapter = new TestPdfAdapter();
      const templateName = 'test-template';
      const data = { test: 'data' };
      const lang = 'en';

      // Act
      const result = await adapter.generate(templateName, data, lang);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should return Promise<Buffer>', async () => {
      // Arrange
      const adapter = new TestPdfAdapter();

      // Act
      const result = await adapter.generate('test', {}, 'en');

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('getTemplatePath() method signature', () => {
    it('should return string', () => {
      // Arrange
      const adapter = new TestPdfAdapter();

      // Act
      const result = adapter.getTemplatePath();

      // Assert
      expect(typeof result).toBe('string');
    });
  });

  describe('getStylePath() method signature', () => {
    it('should return string or null', () => {
      // Arrange
      const adapter = new TestPdfAdapter();

      // Act
      const result = adapter.getStylePath();

      // Assert
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should return null when styleName is undefined', () => {
      // Arrange
      class NoStyleAdapter implements IPdfAdapter {
        readonly templateName: string = 'test';
        readonly styleName?: string;

        async generate(templateName: string, data: any, lang: string): Promise<Buffer> {
          return Buffer.from('');
        }

        getTemplatePath(): string {
          return '/path/to/template.ejs';
        }

        getStylePath(): string | null {
          return null;
        }
      }

      const adapter = new NoStyleAdapter();

      // Act
      const result = adapter.getStylePath();

      // Assert
      expect(result).toBeNull();
    });
  });
});
