// Libraries
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Template Not Found Exception
 *
 * Thrown when a template file cannot be found at the expected path.
 * Used by adapters when template files are missing or inaccessible.
 *
 * @extends {HttpException}
 */
export class TemplateNotFoundException extends HttpException {
  /**
   * Constructor
   *
   * @param templatePath - Absolute path to the template file that was not found
   */
  constructor(templatePath: string) {
    const message = `Template not found: ${templatePath}`;
    super(message, HttpStatus.NOT_FOUND);
  }
}
