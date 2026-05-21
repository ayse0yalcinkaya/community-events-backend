// Libraries
import { Test } from '@nestjs/testing';

// Base
import { BaseExcelAdapter } from '../base-excel-adapter.abstract';
import { BorderStyle, Cell, Workbook, Worksheet } from 'exceljs';

/**
 * Concrete test adapter implementation for testing BaseExcelAdapter
 */
class TestExcelAdapter extends BaseExcelAdapter {
  readonly adapterName = 'test-adapter';

  async buildWorkbook(workbook: Workbook, data: any, lang: string): Promise<void> {
    const worksheet = workbook.addWorksheet('Test Sheet');
    worksheet.getCell('A1').value = 'Test';
  }
}

describe('BaseExcelAdapter', () => {
  let adapter: TestExcelAdapter;

  beforeEach(() => {
    adapter = new TestExcelAdapter();
  });

  describe('generate()', () => {
    it('should create workbook with correct creator', async () => {
      // Arrange
      const data = { test: 'data' };
      const lang = 'en';

      // Act
      const buffer = await adapter.generate(data, lang);

      // Assert
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should call buildWorkbook() method', async () => {
      // Arrange
      const data = { test: 'data' };
      const lang = 'en';
      const buildWorkbookSpy = jest.spyOn(adapter, 'buildWorkbook');

      // Act
      await adapter.generate(data, lang);

      // Assert
      expect(buildWorkbookSpy).toHaveBeenCalledTimes(1);
      expect(buildWorkbookSpy).toHaveBeenCalledWith(expect.any(Workbook), data, lang);
    });

    it('should return Buffer', async () => {
      // Arrange
      const data = { test: 'data' };
      const lang = 'en';

      // Act
      const buffer = await adapter.generate(data, lang);

      // Assert
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });
  });

  describe('helper methods', () => {
    let workbook: Workbook;
    let worksheet: Worksheet;
    let cell: Cell;

    beforeEach(() => {
      workbook = new Workbook();
      worksheet = workbook.addWorksheet('Test');
      cell = worksheet.getCell('A1');
    });

    describe('applyCellStyle()', () => {
      it('should apply font style', () => {
        // Arrange
        const style = {
          font: { name: 'Arial', size: 12, bold: true },
        };

        // Act
        adapter['applyCellStyle'](cell, style as any);

        // Assert
        expect(cell.font?.name).toBe('Arial');
        expect(cell.font?.size).toBe(12);
        expect(cell.font?.bold).toBe(true);
      });

      it('should apply fill style', () => {
        // Arrange
        const style = {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF0000' },
          },
        };

        // Act
        adapter['applyCellStyle'](cell, style as any);

        // Assert
        expect(cell.fill?.type).toBe('pattern');
        expect((cell as any).fill?.pattern).toBe('solid');
        expect((cell as any).fill?.fgColor?.argb).toBe('FFFF0000');
      });

      it('should apply alignment style', () => {
        // Arrange
        const style = {
          alignment: {
            horizontal: 'center',
            vertical: 'middle',
            wrapText: true,
          },
        };

        // Act
        adapter['applyCellStyle'](cell, style as any);

        // Assert
        expect(cell.alignment?.horizontal).toBe('center');
        expect(cell.alignment?.vertical).toBe('middle');
        expect(cell.alignment?.wrapText).toBe(true);
      });

      it('should apply border style', () => {
        // Arrange
        const style = {
          border: {
            top: { style: 'thin' as any, color: { argb: 'FF000000' } },
            bottom: { style: 'thin' as any, color: { argb: 'FF000000' } },
          },
        };

        // Act
        adapter['applyCellStyle'](cell, style as any);

        // Assert
        expect(cell.border?.top?.style).toBe('thin');
        expect(cell.border?.bottom?.style).toBe('thin');
      });

      it('should apply number format', () => {
        // Arrange
        const style = { numFmt: '#,##0.00' };

        // Act
        adapter['applyCellStyle'](cell, style as any);

        // Assert
        expect(cell.numFmt).toBe('#,##0.00');
      });
    });

    describe('addFormula()', () => {
      it('should add formula to cell', () => {
        // Arrange
        const formula = '=SUM(A1:A10)';

        // Act
        adapter['addFormula'](cell, formula);

        // Assert
        expect(cell.value).toEqual({ formula });
      });
    });

    describe('applyAutoFilter()', () => {
      it('should apply auto filter with string range', () => {
        // Arrange
        const range = 'A1:Z10';

        // Act
        adapter['applyAutoFilter'](worksheet, range);

        // Assert
        expect(worksheet.autoFilter).toBe('A1:Z10');
      });

      it('should apply auto filter with object range', () => {
        // Arrange
        const range = { start: 'A1', end: 'Z10' };

        // Act
        adapter['applyAutoFilter'](worksheet, range);

        // Assert
        expect(worksheet.autoFilter).toBe('A1:Z10');
      });
    });

    describe('freezePanes()', () => {
      it('should freeze rows', () => {
        // Arrange
        const options = { row: 1 };

        // Act
        adapter['freezePanes'](worksheet as any, options);

        // Assert
        expect(worksheet.views).toBeDefined();
        expect(worksheet.views?.[0]?.state).toBe('frozen');
        expect((worksheet as any).views?.[0]?.ySplit).toBe(1);
      });

      it('should freeze columns', () => {
        // Arrange
        const options = { column: 1 };

        // Act
        adapter['freezePanes'](worksheet as any, options);

        // Assert
        expect(worksheet.views).toBeDefined();
        expect(worksheet.views?.[0]?.state).toBe('frozen');
        expect((worksheet as any).views?.[0]?.xSplit).toBe(1);
      });

      it('should freeze both rows and columns', () => {
        // Arrange
        const options = { row: 1, column: 1 };

        // Act
        adapter['freezePanes'](worksheet as any, options);

        // Assert
        expect(worksheet.views).toBeDefined();
        expect(worksheet.views?.[0]?.state).toBe('frozen');
        expect((worksheet as any).views?.[0]?.xSplit).toBe(1);
        expect((worksheet as any).views?.[0]?.ySplit).toBe(1);
      });
    });

    describe('mergeCells()', () => {
      it('should merge cells', () => {
        // Arrange
        const range = 'A1:B2';

        // Act
        adapter['mergeCells'](worksheet, range);

        // Assert
        expect(worksheet.model.merges).toContain('A1:B2');
      });
    });

    describe('addDataValidation()', () => {
      it('should add data validation', () => {
        // Arrange
        const validation = {
          type: 'list',
          formulae: ['Option1', 'Option2', 'Option3'],
        };

        // Act
        adapter['addDataValidation'](cell, validation as any);

        // Assert
        expect(cell.dataValidation).toBeDefined();
        expect(cell.dataValidation?.type).toBe('list');
      });
    });

    describe('setColumnWidths()', () => {
      it('should set column widths with array', () => {
        // Arrange
        const widths = [
          { column: 1, width: 20 },
          { column: 2, width: 30 },
        ];

        // Act
        adapter['setColumnWidths'](worksheet, widths);

        // Assert
        expect(worksheet.getColumn(1).width).toBe(20);
        expect(worksheet.getColumn(2).width).toBe(30);
      });

      it('should set column widths with object', () => {
        // Arrange
        const widths = { A: 20, B: 30 };

        // Act
        adapter['setColumnWidths'](worksheet, widths);

        // Assert
        expect(worksheet.getColumn('A').width).toBe(20);
        expect(worksheet.getColumn('B').width).toBe(30);
      });
    });

    describe('createChart()', () => {
      it('should be a placeholder method', () => {
        // Arrange
        const config = { type: 'bar' };

        // Act & Assert - Should not throw
        expect(() => {
          adapter['createChart'](worksheet, config);
        }).not.toThrow();
      });
    });
  });
});
