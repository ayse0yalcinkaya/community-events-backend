/**
 * PDF Adapter Interface
 *
 * Contract for PDF document generation adapters.
 * All PDF adapters must implement this interface to ensure consistent
 * document generation behavior across different adapter implementations.
 *
 * @interface IPdfAdapter
 */
export interface IPdfAdapter {
  /**
   * Template's unique identifier name
   * Used for adapter discovery and registration
   */
  readonly templateName: string;

  /**
   * CSS style file name (optional)
   * Used to locate CSS file in templates/pdf/styles/ directory
   */
  readonly styleName?: string;

  /**
   * Generate PDF document as Buffer
   *
   * @param templateName - Template name to use for generation
   * @param data - Data to be used for document generation
   * @param lang - Language code for internationalization (e.g., 'en', 'tr')
   * @returns Promise resolving to PDF file Buffer
   */
  generate(templateName: string, data: any, lang: string): Promise<Buffer>;

  /**
   * Get absolute path to template file
   *
   * Returns the absolute path to the EJS template file
   * located in templates/pdf/ directory.
   *
   * @returns Absolute path to template file (e.g., /path/to/templates/pdf/invoice.ejs)
   */
  getTemplatePath(): string;

  /**
   * Get absolute path to CSS style file
   *
   * Returns the absolute path to the CSS style file
   * located in templates/pdf/styles/ directory, or null if styleName is not provided.
   *
   * @returns Absolute path to CSS file, or null if styleName is undefined
   */
  getStylePath(): string | null;
}
