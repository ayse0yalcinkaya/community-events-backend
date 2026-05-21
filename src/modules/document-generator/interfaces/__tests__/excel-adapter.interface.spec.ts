// Libraries
import { Workbook } from 'exceljs';

// Interfaces
import { IExcelAdapter } from '../excel-adapter.interface';

/**
 * Type checking test for IExcelAdapter interface
 *
 * This test ensures that the interface has the correct structure
 * and that implementations conform to the interface contract.
 */
describe('IExcelAdapter Interface', () => {
  /**
   * Test implementation of IExcelAdapter
   */
  class TestAdapter implements IExcelAdapter {
    readonly adapterName = 'test-adapter';

    async generate(data: any, lang: string): Promise<Buffer> {
      return Buffer.from('');
    }

    async buildWorkbook(workbook: Workbook, data: any, lang: string): Promise<void> {
      // Implementation
    }
  }

  it('should have adapterName property', () => {
    // Arrange
    const adapter = new TestAdapter();

    // Assert
    expect(adapter.adapterName).toBe('test-adapter');
    expect(typeof adapter.adapterName).toBe('string');
  });

  it('should have generate method', () => {
    // Arrange
    const adapter = new TestAdapter();

    // Assert
    expect(typeof adapter.generate).toBe('function');
    expect(adapter.generate.length).toBe(2); // data, lang parameters
  });

  it('should have buildWorkbook method', () => {
    // Arrange
    const adapter = new TestAdapter();

    // Assert
    expect(typeof adapter.buildWorkbook).toBe('function');
    expect(adapter.buildWorkbook.length).toBe(3); // workbook, data, lang parameters
  });

  it('should return Promise<Buffer> from generate', async () => {
    // Arrange
    const adapter = new TestAdapter();

    // Act
    const result = await adapter.generate({}, 'en');

    // Assert
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('should accept Workbook parameter in buildWorkbook', async () => {
    // Arrange
    const adapter = new TestAdapter();
    const workbook = new Workbook();

    // Act & Assert - Should not throw
    await expect(adapter.buildWorkbook(workbook, {}, 'en')).resolves.toBeUndefined();
  });
});
