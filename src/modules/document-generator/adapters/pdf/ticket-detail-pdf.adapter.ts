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
 * Ticket Detail PDF Adapter
 *
 * Generates comprehensive ticket detail PDF including:
 * - Ticket information (code, subject, status, severity, channel)
 * - User and category information
 * - All messages (conversations) with embedded images
 * - Solution steps and assignments
 * - SLA status tracking
 *
 * @extends {BasePdfAdapter}
 * @implements {IPdfAdapter}
 */
@RegisterPdfAdapter('ticket-detail')
@Injectable()
export class TicketDetailPdfAdapter extends BasePdfAdapter implements IPdfAdapter {
  readonly templateName = 'ticket-detail';
  readonly styleName = 'ticket-detail';

  constructor(templateEngine: TemplateEngineService) {
    super(templateEngine);
  }

  /**
   * Generate ticket detail PDF
   *
   * @param templateName - Template name (should be 'ticket-detail')
   * @param data - TicketPdfData object with complete ticket information
   * @param lang - Language code ('en' or 'tr')
   * @returns Promise resolving to PDF file Buffer
   */
  async generate(templateName: string, data: any, lang: string): Promise<Buffer> {
    const templatePath = this.getTemplatePath();
    const stylePath = this.getStylePath();

    // Render template to HTML
    const html = await this.templateEngine.renderTemplate(templatePath, data, lang);

    // Generate PDF from HTML
    const pdfBuffer = await this.templateEngine.generatePdfFromHtml(html, stylePath);

    return pdfBuffer;
  }
}
