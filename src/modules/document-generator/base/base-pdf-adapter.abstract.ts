// Libraries
import * as path from 'path';

// Interfaces
import { IPdfAdapter } from '../interfaces/pdf-adapter.interface';

// Services
import { TemplateEngineService } from '../services/template-engine.service';

/**
 * Base PDF Adapter Abstract Class
 *
 * Provides base implementation for PDF document generation adapters.
 * Concrete adapters extend this class and implement the generate() method
 * to define their specific PDF generation logic using EJS templates and Puppeteer.
 *
 * Features:
 * - Template path resolution (templates/pdf/{templateName}.ejs)
 * - Style path resolution (templates/pdf/styles/{styleName}.css)
 * - TemplateEngineService injection for template rendering and PDF generation
 *
 * @abstract
 * @implements {IPdfAdapter}
 */
export abstract class BasePdfAdapter implements IPdfAdapter {
  /**
   * Template's unique identifier name
   * Must be implemented by concrete adapters
   */
  abstract readonly templateName: string;

  /**
   * CSS style file name (optional)
   * If provided, CSS file will be loaded from templates/pdf/styles/{styleName}.css
   */
  abstract readonly styleName?: string;

  /**
   * TemplateEngineService instance for template rendering and PDF generation
   * Injected via constructor and available to concrete adapters
   */
  protected readonly templateEngine: TemplateEngineService;

  /**
   * Constructor
   *
   * @param templateEngine - TemplateEngineService instance for template rendering and PDF generation
   */
  constructor(templateEngine: TemplateEngineService) {
    this.templateEngine = templateEngine;
  }

  /**
   * Generate PDF document as Buffer
   *
   * Abstract method that must be implemented by concrete adapters.
   * This method defines the specific PDF generation logic for each adapter.
   *
   * @param templateName - Template name to use for generation
   * @param data - Data to be used for document generation
   * @param lang - Language code for internationalization (e.g., 'en', 'tr')
   * @returns Promise resolving to PDF file Buffer
   */
  abstract generate(templateName: string, data: any, lang: string): Promise<Buffer>;

  /**
   * Get absolute path to template file
   *
   * Returns the absolute path to the EJS template file
   * located in templates/pdf/ directory.
   *
   * @returns Absolute path to template file (e.g., /path/to/templates/pdf/invoice.ejs)
   */
  getTemplatePath(): string {
    return path.join(process.cwd(), 'templates', 'pdf', `${this.templateName}.ejs`);
  }

  /**
   * Get absolute path to CSS style file
   *
   * Returns the absolute path to the CSS style file
   * located in templates/pdf/styles/ directory, or null if styleName is not provided.
   *
   * @returns Absolute path to CSS file, or null if styleName is undefined
   */
  getStylePath(): string | null {
    if (!this.styleName) {
      return null;
    }

    return path.join(process.cwd(), 'templates', 'pdf', 'styles', `${this.styleName}.css`);
  }
}
