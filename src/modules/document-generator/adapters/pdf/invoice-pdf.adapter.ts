// Libraries
import { Injectable } from '@nestjs/common';

// Base
import { BasePdfAdapter } from '../../base/base-pdf-adapter.abstract';

// Interfaces
import { IPdfAdapter } from '../../interfaces/pdf-adapter.interface';

// Services
import { TemplateEngineService } from '../../services/template-engine.service';

// Decorators
import { RegisterPdfAdapter } from '../../decorators/register-pdf-adapter.decorator';

/**
 * Invoice PDF Adapter
 *
 * Example PDF adapter implementation for invoice document generation.
 * Demonstrates the adapter pattern with template-based PDF generation.
 *
 * Features:
 * - Template: invoice.ejs
 * - Style: invoice.css
 * - Uses TemplateEngineService for rendering and PDF generation
 *
 * @extends {BasePdfAdapter}
 * @implements {IPdfAdapter}
 */
@RegisterPdfAdapter('invoice')
@Injectable()
export class InvoicePdfAdapter extends BasePdfAdapter implements IPdfAdapter {
  readonly templateName = 'invoice';
  readonly styleName = 'invoice';

  constructor(templateEngine: TemplateEngineService) {
    super(templateEngine);
  }

  /**
   * Generate PDF document as Buffer
   *
   * Renders the invoice template with provided data and generates PDF.
   *
   * @param templateName - Template name to use (should be 'invoice')
   * @param data - Invoice data object
   * @param lang - Language code for internationalization (e.g., 'en', 'tr')
   * @returns Promise resolving to PDF file Buffer
   */
  async generate(templateName: string, data: any, lang: string): Promise<Buffer> {
    // Get template and style paths
    const templatePath = this.getTemplatePath();
    const stylePath = this.getStylePath();

    // Render template to HTML
    const html = await this.templateEngine.renderTemplate(templatePath, data, lang);

    // Generate PDF from HTML
    const pdfBuffer = await this.templateEngine.generatePdfFromHtml(html, stylePath);

    return pdfBuffer;
  }
}
