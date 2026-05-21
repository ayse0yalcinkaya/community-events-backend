// Libraries
import 'reflect-metadata';

// Decorators
import { RegisterExcelAdapter, EXCEL_ADAPTER_NAME_KEY } from '../register-excel-adapter.decorator';

describe('@RegisterExcelAdapter Decorator', () => {
  describe('decorator registration', () => {
    it('should set reflection metadata with normalized name', () => {
      // Arrange
      @RegisterExcelAdapter('Test Adapter')
      class TestAdapter {}

      // Act
      const metadata = Reflect.getMetadata(EXCEL_ADAPTER_NAME_KEY, TestAdapter);

      // Assert
      expect(metadata).toBe('test adapter');
    });

    it('should normalize adapter name (trim and lowercase)', () => {
      // Arrange
      @RegisterExcelAdapter('  UPPERCASE ADAPTER  ')
      class TestAdapter {}

      // Act
      const metadata = Reflect.getMetadata(EXCEL_ADAPTER_NAME_KEY, TestAdapter);

      // Assert
      expect(metadata).toBe('uppercase adapter');
    });

    it('should handle empty string', () => {
      // Arrange
      @RegisterExcelAdapter('')
      class TestAdapter {}

      // Act
      const metadata = Reflect.getMetadata(EXCEL_ADAPTER_NAME_KEY, TestAdapter);

      // Assert
      expect(metadata).toBe('');
    });

    it('should handle special characters', () => {
      // Arrange
      @RegisterExcelAdapter('Test-Adapter_123')
      class TestAdapter {}

      // Act
      const metadata = Reflect.getMetadata(EXCEL_ADAPTER_NAME_KEY, TestAdapter);

      // Assert
      expect(metadata).toBe('test-adapter_123');
    });
  });

  describe('EXCEL_ADAPTER_NAME_KEY constant', () => {
    it('should export EXCEL_ADAPTER_NAME_KEY constant', () => {
      // Assert
      expect(EXCEL_ADAPTER_NAME_KEY).toBe('excel_adapter_name');
    });
  });
});
