// Libraries
import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Modules
import { FilesModule } from '@/modules/files/files.module';

// Services
import { DocumentGeneratorService } from './services/document-generator.service';
import { TemplateEngineService } from './services/template-engine.service';

// Factories
import { PdfAdapterFactory } from './factories/pdf-adapter.factory';
import { ExcelAdapterFactory } from './factories/excel-adapter.factory';

// PDF Adapters
import { InvoicePdfAdapter } from './adapters/pdf/invoice-pdf.adapter';
import { TicketDetailPdfAdapter } from './adapters/pdf/ticket-detail-pdf.adapter';

// Excel Adapters
import { SalesReportExcelAdapter } from './adapters/excel/sales-report-excel.adapter';
import { TicketsReportExcelAdapter } from './adapters/excel/tickets-report-excel.adapter';

// Reports PDF Adapters
import { TicketsReportPdfAdapter } from './adapters/pdf/tickets-report-pdf.adapter';

/**
 * Document Generator Module
 *
 * Provides document generation services for PDF and Excel exports:
 * - DocumentGeneratorService: Main orchestrator for document generation
 * - TemplateEngineService: EJS template rendering + Puppeteer PDF generation
 * - PdfAdapterFactory: Factory for PDF adapters
 * - ExcelAdapterFactory: Factory for Excel adapters
 *
 * Usage in consuming modules:
 * 1. Import DocumentGeneratorModule
 * 2. Inject DocumentGeneratorService
 * 3. Call generate(DocumentType.PDF, { templateName: 'xxx', data: {...}, ... })
 */
@Module({
  imports: [
    ConfigModule,
    FilesModule, // For S3Service
  ],
  providers: [
    // Services
    DocumentGeneratorService,
    TemplateEngineService,
    // Factories
    PdfAdapterFactory,
    ExcelAdapterFactory,
    // PDF Adapters
    InvoicePdfAdapter,
    TicketDetailPdfAdapter,
    // Excel Adapters
    SalesReportExcelAdapter,
    TicketsReportExcelAdapter,
    TicketsReportPdfAdapter,
  ],
  exports: [
    DocumentGeneratorService, // Main service for document generation
  ],
})
export class DocumentGeneratorModule implements OnModuleInit {
  constructor(
    private readonly pdfAdapterFactory: PdfAdapterFactory,
    private readonly excelAdapterFactory: ExcelAdapterFactory,
  ) {}

  /**
   * Register adapters on module initialization
   *
   * Since the factory uses manual registration via registerAdapter(),
   * we register all PDF and Excel adapters here.
   */
  onModuleInit(): void {
    // Register PDF adapters
    this.pdfAdapterFactory.registerAdapter(InvoicePdfAdapter);
    this.pdfAdapterFactory.registerAdapter(TicketDetailPdfAdapter);

    // Register Excel adapters
    this.excelAdapterFactory.registerAdapter(SalesReportExcelAdapter);
    this.excelAdapterFactory.registerAdapter(TicketsReportExcelAdapter);

    // Register Reports adapters
    this.pdfAdapterFactory.registerAdapter(TicketsReportPdfAdapter);
  }
}
