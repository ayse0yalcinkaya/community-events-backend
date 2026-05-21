// Libraries
import 'reflect-metadata';

// Decorators
import { RegisterPdfAdapter, PDF_ADAPTER_TEMPLATE_KEY } from '../register-pdf-adapter.decorator';

describe('@RegisterPdfAdapter Decorator', () => {
  describe('decorator registration', () => {
    it('should set reflection metadata with normalized name', () => {
      // Arrange
      @RegisterPdfAdapter('Test Template')
      class TestAdapter {}

      // Act
      const metadata = Reflect.getMetadata(PDF_ADAPTER_TEMPLATE_KEY, TestAdapter);

      // Assert
      expect(metadata).toBe('test template');
    });

    it('should normalize template name (trim and lowercase)', () => {
      // Arrange
      @RegisterPdfAdapter('  UPPERCASE TEMPLATE  ')
      class TestAdapter {}

      // Act
      const metadata = Reflect.getMetadata(PDF_ADAPTER_TEMPLATE_KEY, TestAdapter);

      // Assert
      expect(metadata).toBe('uppercase template');
    });

    it('should handle empty string', () => {
      // Arrange
      @RegisterPdfAdapter('')
      class TestAdapter {}

      // Act
      const metadata = Reflect.getMetadata(PDF_ADAPTER_TEMPLATE_KEY, TestAdapter);

      // Assert
      expect(metadata).toBe('');
    });

    it('should handle special characters', () => {
      // Arrange
      @RegisterPdfAdapter('Test-Template_123')
      class TestAdapter {}

      // Act
      const metadata = Reflect.getMetadata(PDF_ADAPTER_TEMPLATE_KEY, TestAdapter);

      // Assert
      expect(metadata).toBe('test-template_123');
    });

    it('should handle multiple words', () => {
      // Arrange
      @RegisterPdfAdapter('Invoice Report Template')
      class TestAdapter {}

      // Act
      const metadata = Reflect.getMetadata(PDF_ADAPTER_TEMPLATE_KEY, TestAdapter);

      // Assert
      expect(metadata).toBe('invoice report template');
    });
  });

  describe('PDF_ADAPTER_TEMPLATE_KEY constant', () => {
    it('should export PDF_ADAPTER_TEMPLATE_KEY constant', () => {
      // Assert
      expect(PDF_ADAPTER_TEMPLATE_KEY).toBe('pdf_adapter_template');
    });
  });
});
