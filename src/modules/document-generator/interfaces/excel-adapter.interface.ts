// Libraries
import { Workbook } from 'exceljs';

/**
 * Excel Adapter Interface
 *
 * Contract for Excel document generation adapters.
 * All Excel adapters must implement this interface to ensure consistent
 * document generation behavior across different adapter implementations.
 *
 * @interface IExcelAdapter
 */
export interface IExcelAdapter {
  /**
   * Adapter's unique identifier name
   * Used for adapter discovery and registration
   */
  readonly adapterName: string;

  /**
   * Generate Excel document as Buffer
   *
   * @param data - Data to be used for document generation
   * @param lang - Language code for internationalization (e.g., 'en', 'tr')
   * @returns Promise resolving to Excel file Buffer
   */
  generate(data: any, lang: string): Promise<Buffer>;

  /**
   * Build workbook structure and populate with data
   *
   * This method is called by generate() to construct the Excel workbook.
   * Concrete adapters implement this method to define their specific
   * workbook structure, formatting, and data population logic.
   *
   * @param workbook - ExcelJS Workbook instance (pre-created)
   * @param data - Data to be used for workbook population
   * @param lang - Language code for internationalization
   * @returns Promise resolving when workbook is built
   */
  buildWorkbook(workbook: Workbook, data: any, lang: string): Promise<void>;
}
