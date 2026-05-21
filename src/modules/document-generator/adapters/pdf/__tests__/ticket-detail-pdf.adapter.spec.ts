// Libraries
import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';

// Adapters
import { TicketDetailPdfAdapter } from '../ticket-detail-pdf.adapter';

// Base
import { BasePdfAdapter } from '../../../base/base-pdf-adapter.abstract';

// Services
import { TemplateEngineService } from '../../../services/template-engine.service';

// Decorators
import { PDF_ADAPTER_TEMPLATE_KEY } from '../../../decorators/register-pdf-adapter.decorator';

describe('TicketDetailPdfAdapter', () => {
  let adapter: TicketDetailPdfAdapter;
  let mockTemplateEngine: jest.Mocked<TemplateEngineService>;

  const mockTicketPdfData = {
    ticket: {
      id: '123',
      code: 'TKT-001',
      subject: 'Test Ticket',
      description: 'Test description',
      severity: 'HIGH',
      severityLabel: 'High',
      channel: 'WEB',
      channelLabel: 'Web',
      status: 'OPEN',
      statusLabel: 'Open',
      createdAt: 'January 15, 2024',
      updatedAt: 'January 16, 2024',
    },
    user: {
      id: 'user-1',
      fullName: 'John Doe',
      email: 'john@example.com',
      phoneNumber: '+905551234567',
    },
    category: {
      id: 'cat-1',
      name: 'Technical Support',
    },
    messages: [],
    solutionSteps: [],
    slaStatus: [],
    assignments: [],
    generatedAt: 'January 17, 2024',
    lang: 'en',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketDetailPdfAdapter,
        {
          provide: TemplateEngineService,
          useValue: {
            renderTemplate: jest.fn(),
            generatePdfFromHtml: jest.fn(),
          },
        },
      ],
    }).compile();

    adapter = module.get<TicketDetailPdfAdapter>(TicketDetailPdfAdapter);
    mockTemplateEngine = module.get(TemplateEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('decorator registration', () => {
    it('should be registered with decorator "ticket-detail"', () => {
      const metadata = Reflect.getMetadata(PDF_ADAPTER_TEMPLATE_KEY, TicketDetailPdfAdapter);
      expect(metadata).toBe('ticket-detail');
    });
  });

  describe('inheritance', () => {
    it('should extend BasePdfAdapter', () => {
      expect(adapter).toBeInstanceOf(BasePdfAdapter);
    });
  });

  describe('template properties', () => {
    it('should have templateName set to "ticket-detail"', () => {
      expect(adapter.templateName).toBe('ticket-detail');
    });

    it('should have styleName set to "ticket-detail"', () => {
      expect(adapter.styleName).toBe('ticket-detail');
    });
  });

  describe('getTemplatePath()', () => {
    it('should return correct path to ticket-detail.ejs', () => {
      const expectedPath = path.join(process.cwd(), 'templates', 'pdf', 'ticket-detail.ejs');
      const templatePath = adapter.getTemplatePath();
      expect(templatePath).toBe(expectedPath);
    });
  });

  describe('getStylePath()', () => {
    it('should return correct path to ticket-detail.css', () => {
      const expectedPath = path.join(process.cwd(), 'templates', 'pdf', 'styles', 'ticket-detail.css');
      const stylePath = adapter.getStylePath();
      expect(stylePath).toBe(expectedPath);
    });
  });

  describe('generate()', () => {
    it('should call templateEngine.renderTemplate with correct params', async () => {
      const mockHtml = '<html><body>Test</body></html>';
      const mockPdfBuffer = Buffer.from('pdf-content');

      mockTemplateEngine.renderTemplate.mockResolvedValue(mockHtml);
      mockTemplateEngine.generatePdfFromHtml.mockResolvedValue(mockPdfBuffer);

      await adapter.generate('ticket-detail', mockTicketPdfData, 'en');

      expect(mockTemplateEngine.renderTemplate).toHaveBeenCalledWith(
        expect.stringContaining('ticket-detail.ejs'),
        mockTicketPdfData,
        'en',
      );
    });

    it('should call templateEngine.generatePdfFromHtml with rendered HTML', async () => {
      const mockHtml = '<html><body>Rendered</body></html>';
      const mockPdfBuffer = Buffer.from('pdf-content');

      mockTemplateEngine.renderTemplate.mockResolvedValue(mockHtml);
      mockTemplateEngine.generatePdfFromHtml.mockResolvedValue(mockPdfBuffer);

      await adapter.generate('ticket-detail', mockTicketPdfData, 'en');

      expect(mockTemplateEngine.generatePdfFromHtml).toHaveBeenCalledWith(
        mockHtml,
        expect.stringContaining('ticket-detail.css'),
      );
    });

    it('should return Buffer from generatePdfFromHtml', async () => {
      const mockHtml = '<html><body>Test</body></html>';
      const mockPdfBuffer = Buffer.from('pdf-content');

      mockTemplateEngine.renderTemplate.mockResolvedValue(mockHtml);
      mockTemplateEngine.generatePdfFromHtml.mockResolvedValue(mockPdfBuffer);

      const result = await adapter.generate('ticket-detail', mockTicketPdfData, 'en');

      expect(result).toBeInstanceOf(Buffer);
      expect(result).toBe(mockPdfBuffer);
    });

    it('should pass language to renderTemplate', async () => {
      const mockHtml = '<html></html>';
      const mockPdfBuffer = Buffer.from('pdf');

      mockTemplateEngine.renderTemplate.mockResolvedValue(mockHtml);
      mockTemplateEngine.generatePdfFromHtml.mockResolvedValue(mockPdfBuffer);

      await adapter.generate('ticket-detail', mockTicketPdfData, 'tr');

      expect(mockTemplateEngine.renderTemplate).toHaveBeenCalledWith(expect.any(String), mockTicketPdfData, 'tr');
    });
  });
});
