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

@RegisterPdfAdapter('tickets-report')
@Injectable()
export class TicketsReportPdfAdapter extends BasePdfAdapter implements IPdfAdapter {
  readonly templateName = 'tickets-report';
  readonly styleName = 'tickets-report';

  constructor(templateEngine: TemplateEngineService) {
    super(templateEngine);
  }

  async generate(templateName: string, data: any, lang: string): Promise<Buffer> {
    const templatePath = this.getTemplatePath();
    const stylePath = this.getStylePath();

    const html = await this.templateEngine.renderTemplate(templatePath, data, lang);
    const pdfBuffer = await this.templateEngine.generatePdfFromHtml(html, stylePath);

    return pdfBuffer;
  }
}
