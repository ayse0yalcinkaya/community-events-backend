// Libraries
import { Injectable } from '@nestjs/common';
import { Workbook, Worksheet } from 'exceljs';

// Base
import { BaseExcelAdapter } from '../../base/base-excel-adapter.abstract';

// Interfaces
import { IExcelAdapter } from '../../interfaces/excel-adapter.interface';

// Decorators
import { RegisterExcelAdapter } from '../../decorators/register-excel-adapter.decorator';

/**
 * Sales Report Excel Adapter
 *
 * Example Excel adapter implementation for sales report generation.
 * Demonstrates the adapter pattern with Excel workbook creation.
 *
 * Features:
 * - Worksheet: 'Sales'
 * - Columns: Date, Product, Quantity, Unit Price, Total
 * - Header row styling (bold, dark background)
 * - Auto-filter enabled
 * - Freeze panes (first row)
 *
 * @extends {BaseExcelAdapter}
 * @implements {IExcelAdapter}
 */
@RegisterExcelAdapter('sales-report')
@Injectable()
export class SalesReportExcelAdapter extends BaseExcelAdapter implements IExcelAdapter {
  readonly adapterName = 'sales-report';

  /**
   * Build workbook structure and populate with data
   *
   * Creates a 'Sales' worksheet with columns for sales data.
   * Applies styling, auto-filter, and freeze panes.
   *
   * @param workbook - ExcelJS Workbook instance (pre-created)
   * @param data - Sales data object with sales array
   * @param lang - Language code for internationalization (e.g., 'en', 'tr')
   * @returns Promise resolving when workbook is built
   */
  async buildWorkbook(workbook: Workbook, data: any, lang: string): Promise<void> {
    // Create 'Sales' worksheet
    const worksheet: Worksheet = workbook.addWorksheet('Sales');

    // Define columns
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Product', key: 'product', width: 30 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Unit Price', key: 'unitPrice', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
    ];

    // Get header row
    const headerRow = worksheet.getRow(1);

    // Apply header row styling (bold, dark background)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }, // Blue background
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Add data rows
    const sales = data.sales || [];
    sales.forEach((sale: any, index: number) => {
      const row = worksheet.addRow({
        date: sale.date || '',
        product: sale.product || '',
        quantity: sale.quantity || 0,
        unitPrice: sale.unitPrice || 0,
        total: sale.total || 0,
      });

      // Apply number formatting to numeric columns
      const quantityCell = row.getCell('quantity');
      quantityCell.numFmt = '#,##0';

      const unitPriceCell = row.getCell('unitPrice');
      unitPriceCell.numFmt = '#,##0.00';

      const totalCell = row.getCell('total');
      totalCell.numFmt = '#,##0.00';
    });

    // Apply auto-filter to data range
    if (sales.length > 0) {
      const lastRow = sales.length + 1; // +1 for header row
      this.applyAutoFilter(worksheet, {
        start: 'A1',
        end: `E${lastRow}`,
      });
    }

    // Freeze panes (freeze first row)
    this.freezePanes(worksheet, { row: 1 });
  }
}
