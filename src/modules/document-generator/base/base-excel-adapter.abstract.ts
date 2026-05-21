// Libraries
import { Borders, BorderStyle, Cell, Column, DataValidation, Workbook, Worksheet } from 'exceljs';

// Interfaces
import { IExcelAdapter } from '../interfaces/excel-adapter.interface';

/**
 * Base Excel Adapter Abstract Class
 *
 * Provides base implementation for Excel document generation adapters.
 * Concrete adapters extend this class and implement the buildWorkbook() method
 * to define their specific workbook structure and data population logic.
 *
 * Features:
 * - Workbook creation with standardized creator name
 * - Buffer generation from workbook
 * - Helper methods for common Excel operations (styling, formulas, filters, etc.)
 *
 * @abstract
 * @implements {IExcelAdapter}
 */
export abstract class BaseExcelAdapter implements IExcelAdapter {
  /**
   * Adapter's unique identifier name
   * Must be implemented by concrete adapters
   */
  abstract readonly adapterName: string;

  /**
   * Generate Excel document as Buffer
   *
   * Creates a new ExcelJS Workbook instance, sets the creator,
   * calls buildWorkbook() to populate it, and returns the buffer.
   *
   * @param data - Data to be used for document generation
   * @param lang - Language code for internationalization (e.g., 'en', 'tr')
   * @returns Promise resolving to Excel file Buffer
   */
  async generate(data: any, lang: string): Promise<Buffer> {
    const workbook = new Workbook();
    workbook.creator = 'Community Events Document Generator';

    await this.buildWorkbook(workbook, data, lang);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Build workbook structure and populate with data
   *
   * Abstract method that must be implemented by concrete adapters.
   * This method defines the specific workbook structure, worksheets,
   * formatting, and data population logic for each adapter.
   *
   * @param workbook - ExcelJS Workbook instance (pre-created)
   * @param data - Data to be used for workbook population
   * @param lang - Language code for internationalization
   * @returns Promise resolving when workbook is built
   */
  abstract buildWorkbook(workbook: Workbook, data: any, lang: string): Promise<void>;

  /**
   * Apply cell styling (font, fill, alignment, border, number format)
   *
   * @param cell - ExcelJS Cell instance
   * @param style - Style object with optional properties:
   *   - font?: { name?, size?, bold?, italic?, color? }
   *   - fill?: { type: 'pattern', pattern: 'solid', fgColor?: { argb: string } }
   *   - alignment?: { horizontal?, vertical?, wrapText? }
   *   - border?: { top?, bottom?, left?, right? }
   *   - numFmt?: string (Excel number format string)
   */
  protected applyCellStyle(
    cell: Cell,
    style: {
      font?: Partial<{
        name: string;
        size: number;
        bold: boolean;
        italic: boolean;
        color: { argb: string };
      }>;
      fill?: {
        type: 'pattern';
        pattern: 'solid';
        fgColor?: { argb: string };
      };
      alignment?: Partial<{
        horizontal: 'left' | 'center' | 'right' | 'fill' | 'justify';
        vertical: 'top' | 'middle' | 'bottom';
        wrapText: boolean;
      }>;
      border?: Partial<{
        top: { style: BorderStyle; color?: { argb: string } };
        bottom: { style: BorderStyle; color?: { argb: string } };
        left: { style: BorderStyle; color?: { argb: string } };
        right: { style: BorderStyle; color?: { argb: string } };
      }>;
      numFmt?: string;
    },
  ): void {
    if (style.font) {
      cell.font = { ...cell.font, ...style.font };
    }
    if (style.fill) {
      cell.fill = style.fill;
    }
    if (style.alignment) {
      cell.alignment = { ...cell.alignment, ...style.alignment };
    }
    if (style.border) {
      cell.border = { ...cell.border, ...style.border };
    }
    if (style.numFmt) {
      cell.numFmt = style.numFmt;
    }
  }

  /**
   * Add Excel formula to cell
   *
   * @param cell - ExcelJS Cell instance
   * @param formula - Excel formula string (e.g., "=SUM(A1:A10)")
   */
  protected addFormula(cell: Cell, formula: string): void {
    cell.value = { formula };
  }

  /**
   * Enable auto-filter on worksheet range
   *
   * @param worksheet - ExcelJS Worksheet instance
   * @param range - Range string (e.g., "A1:Z10") or object with start/end
   */
  protected applyAutoFilter(worksheet: Worksheet, range: string | { start: string; end: string }): void {
    const rangeString = typeof range === 'string' ? range : `${range.start}:${range.end}`;
    worksheet.autoFilter = rangeString;
  }

  /**
   * Freeze panes (rows and/or columns)
   *
   * @param worksheet - ExcelJS Worksheet instance
   * @param options - Freeze options:
   *   - row?: number - Row number to freeze (1-based, rows above will be frozen)
   *   - column?: number - Column number to freeze (1-based, columns left will be frozen)
   */
  protected freezePanes(worksheet: Worksheet, options: { row?: number; column?: number }): void {
    if (options.row !== undefined || options.column !== undefined) {
      const xSplit = options.column || 0;
      const ySplit = options.row || 0;
      worksheet.views = [
        {
          state: 'frozen',
          xSplit,
          ySplit,
          topLeftCell:
            options.row && options.column ? worksheet.getCell(options.row + 1, options.column + 1).address : undefined,
        },
      ];
    }
  }

  /**
   * Merge cells in worksheet
   *
   * @param worksheet - ExcelJS Worksheet instance
   * @param range - Range string (e.g., "A1:B2")
   */
  protected mergeCells(worksheet: Worksheet, range: string): void {
    worksheet.mergeCells(range);
  }

  /**
   * Add data validation (dropdown, number range, etc.)
   *
   * @param cell - ExcelJS Cell instance
   * @param validation - DataValidation object with type, formulae, etc.
   */
  protected addDataValidation(cell: Cell, validation: DataValidation): void {
    cell.dataValidation = validation;
  }

  /**
   * Set column widths for worksheet
   *
   * @param worksheet - ExcelJS Worksheet instance
   * @param widths - Array of width objects: [{ column: number, width: number }, ...]
   *   or object mapping column letters to widths: { A: 20, B: 30 }
   */
  protected setColumnWidths(
    worksheet: Worksheet,
    widths: Array<{ column: number; width: number }> | Record<string, number>,
  ): void {
    if (Array.isArray(widths)) {
      widths.forEach(({ column, width }) => {
        const col = worksheet.getColumn(column);
        col.width = width;
      });
    } else {
      Object.entries(widths).forEach(([columnLetter, width]) => {
        const col = worksheet.getColumn(columnLetter);
        col.width = width;
      });
    }
  }

  /**
   * Create chart placeholder (future implementation)
   *
   * This method is a placeholder for future chart creation functionality.
   * Concrete adapters can override this method when chart support is needed.
   *
   * @param worksheet - ExcelJS Worksheet instance
   * @param config - Chart configuration (to be defined)
   */
  protected createChart(worksheet: Worksheet, config: any): void {
    // Placeholder for future chart implementation
    // Chart creation will be implemented when needed
  }
}
