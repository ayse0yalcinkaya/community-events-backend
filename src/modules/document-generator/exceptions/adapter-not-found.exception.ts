// Libraries
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Adapter Not Found Exception
 *
 * Thrown when a requested adapter cannot be found in the adapter registry.
 * Used by PdfAdapterFactory and ExcelAdapterFactory when getAdapter() is called
 * with a template/adapter name that doesn't exist.
 *
 * @extends {HttpException}
 */
export class AdapterNotFoundException extends HttpException {
  /**
   * Constructor
   *
   * @param templateName - Name of the template/adapter that was not found
   * @param type - Type of adapter ('pdf' or 'excel')
   */
  constructor(templateName: string, type: 'pdf' | 'excel') {
    const message = `Adapter not found: ${templateName} (type: ${type})`;
    super(message, HttpStatus.NOT_FOUND);
  }
}
