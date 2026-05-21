// Libraries
import * as fs from 'fs';
import { Test, TestingModule } from '@nestjs/testing';
import * as ejs from 'ejs';
// Import I18nService after mock
import { I18nService } from 'nestjs-i18n';
import puppeteer, { Browser, Page } from 'puppeteer';
// Services
import { TemplateEngineService } from '../template-engine.service';

// Mock I18nService
const mockI18nService = {
  translate: jest.fn().mockImplementation((key: string, options?: any) => {
    return Promise.resolve(`translated-${key}`);
  }),
};

// Mock nestjs-i18n module
jest.mock('nestjs-i18n', () => ({
  I18nService: jest.fn().mockImplementation(() => mockI18nService),
}));

// Mock fs module
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

// Mock ejs module
jest.mock('ejs', () => ({
  render: jest.fn(),
}));

// Mock puppeteer module
jest.mock('puppeteer', () => ({
  launch: jest.fn(),
}));

describe('TemplateEngineService', () => {
  let service: TemplateEngineService;
  let mockBrowser: jest.Mocked<Browser>;
  let mockPage: jest.Mocked<Page>;

  beforeEach(async () => {
    // Reset mock
    mockI18nService.translate.mockResolvedValue('translated-text');

    // Mock Puppeteer Page
    mockPage = {
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock Puppeteer Browser
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;

    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateEngineService,
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    service = module.get<TemplateEngineService>(TemplateEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit()', () => {
    it('should launch Puppeteer browser instance', async () => {
      // Act
      await service.onModuleInit();

      // Assert
      const expectedOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
        ],
      };
      expect(puppeteer.launch).toHaveBeenCalledWith(expectedOptions);
      expect(service['browser']).toBe(mockBrowser);
    });

    it('should handle browser launch errors gracefully without crashing', async () => {
      // Arrange
      const error = new Error('Browser launch failed');
      (puppeteer.launch as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(service.onModuleInit()).resolves.not.toThrow();
      expect(service['browser']).toBeNull();
    });
  });

  describe('onModuleDestroy()', () => {
    it('should close browser instance if exists', async () => {
      // Arrange
      await service.onModuleInit();
      service['browser'] = mockBrowser;

      // Act
      await service.onModuleDestroy();

      // Assert
      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
      expect(service['browser']).toBeNull();
    });

    it('should handle browser close errors gracefully', async () => {
      // Arrange
      await service.onModuleInit();
      service['browser'] = mockBrowser;
      const error = new Error('Close failed');
      mockBrowser.close.mockRejectedValue(error);

      // Act - Should not throw
      await service.onModuleDestroy();

      // Assert
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should not throw if browser is null', async () => {
      // Arrange
      service['browser'] = null;

      // Act & Assert - Should not throw
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('renderTemplate()', () => {
    beforeEach(() => {
      (fs.readFileSync as jest.Mock).mockReturnValue('<h1><%= title %></h1>');
      (ejs.render as jest.Mock).mockReturnValue('<h1>Test Title</h1>');
    });

    it('should read template file from path', async () => {
      // Arrange
      const templatePath = '/path/to/template.ejs';
      const data = { title: 'Test Title' };
      const lang = 'en';

      // Act
      await service.renderTemplate(templatePath, data, lang);

      // Assert
      expect(fs.readFileSync).toHaveBeenCalledWith(templatePath, 'utf-8');
    });

    it('should inject i18n t() function into template data', async () => {
      // Arrange
      const templatePath = '/path/to/template.ejs';
      const data = { title: 'Test Title' };
      const lang = 'en';

      // Act
      await service.renderTemplate(templatePath, data, lang);

      // Assert
      expect(ejs.render).toHaveBeenCalledWith(
        '<h1><%= title %></h1>',
        expect.objectContaining({
          title: 'Test Title',
          t: expect.any(Function),
        }),
      );
    });

    it('should call i18n.translate when t() function is called', async () => {
      // Arrange
      const templatePath = '/path/to/template.ejs';
      const data = {};
      const lang = 'tr';

      let injectedTFunction: any;

      (ejs.render as jest.Mock).mockImplementation((template, templateData) => {
        injectedTFunction = templateData.t;
        return '<h1>Rendered</h1>';
      });

      // Act
      await service.renderTemplate(templatePath, data, lang);
      await injectedTFunction('test.key', { param: 'value' });

      // Assert
      expect(mockI18nService.translate).toHaveBeenCalledWith('test.key', {
        lang: 'tr',
        param: 'value',
      });
    });

    it('should return rendered HTML string', async () => {
      // Arrange
      const templatePath = '/path/to/template.ejs';
      const data = { title: 'Test Title' };
      const lang = 'en';
      const expectedHtml = '<h1>Test Title</h1>';

      // Act
      const result = await service.renderTemplate(templatePath, data, lang);

      // Assert
      expect(result).toBe(expectedHtml);
    });

    it('should handle template read errors', async () => {
      // Arrange
      const templatePath = '/path/to/template.ejs';
      const error = new Error('File not found');
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      await expect(service.renderTemplate(templatePath, {}, 'en')).rejects.toThrow(error);
    });
  });

  describe('generatePdfFromHtml()', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should throw error if browser is not initialized', async () => {
      // Arrange
      service['browser'] = null;

      // Act & Assert
      await expect(service.generatePdfFromHtml('<html></html>')).rejects.toThrow(
        'PDF generation service is currently not active',
      );
    });

    it('should create new page from browser instance', async () => {
      // Arrange
      const html = '<html><body>Test</body></html>';

      // Act
      await service.generatePdfFromHtml(html);

      // Assert
      expect(mockBrowser.newPage).toHaveBeenCalledTimes(1);
    });

    it('should read CSS file if cssPath is provided', async () => {
      // Arrange
      const html = '<html><body>Test</body></html>';
      const cssPath = '/path/to/style.css';
      (fs.readFileSync as jest.Mock).mockReturnValue('body { color: red; }');

      // Act
      await service.generatePdfFromHtml(html, cssPath);

      // Assert
      expect(fs.readFileSync).toHaveBeenCalledWith(cssPath, 'utf-8');
    });

    it('should inject CSS into HTML when cssPath is provided', async () => {
      // Arrange
      const html = '<html><body>Test</body></html>';
      const cssPath = '/path/to/style.css';
      const css = 'body { color: red; }';
      (fs.readFileSync as jest.Mock).mockReturnValue(css);

      // Act
      await service.generatePdfFromHtml(html, cssPath);

      // Assert
      expect(mockPage.setContent).toHaveBeenCalledWith(`<style>${css}</style>${html}`, {
        waitUntil: 'networkidle0',
      });
    });

    it('should not inject CSS when cssPath is null', async () => {
      // Arrange
      const html = '<html><body>Test</body></html>';

      // Act
      await service.generatePdfFromHtml(html, null);

      // Assert
      expect(mockPage.setContent).toHaveBeenCalledWith(html, {
        waitUntil: 'networkidle0',
      });
    });

    it('should handle CSS file read errors gracefully', async () => {
      // Arrange
      const html = '<html><body>Test</body></html>';
      const cssPath = '/path/to/style.css';
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('CSS file not found');
      });

      // Act - Should continue without CSS
      await service.generatePdfFromHtml(html, cssPath);

      // Assert
      expect(mockPage.setContent).toHaveBeenCalledWith(html, {
        waitUntil: 'networkidle0',
      });
    });

    it('should generate PDF with correct options', async () => {
      // Arrange
      const html = '<html><body>Test</body></html>';

      // Act
      await service.generatePdfFromHtml(html);

      // Assert
      expect(mockPage.pdf).toHaveBeenCalledWith({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
        timeout: 30000,
      });
    });

    it('should return PDF buffer', async () => {
      // Arrange
      const html = '<html><body>Test</body></html>';
      const expectedBuffer = Buffer.from('pdf-content');
      mockPage.pdf.mockResolvedValue(expectedBuffer);

      // Act
      const result = await service.generatePdfFromHtml(html);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(Buffer.from(result)).toEqual(expectedBuffer);
    });

    it('should close page after PDF generation', async () => {
      // Arrange
      const html = '<html><body>Test</body></html>';

      // Act
      await service.generatePdfFromHtml(html);

      // Assert
      expect(mockPage.close).toHaveBeenCalledTimes(1);
    });

    it('should handle page close errors gracefully', async () => {
      // Arrange
      const html = '<html><body>Test</body></html>';
      const error = new Error('Close failed');
      mockPage.close.mockRejectedValue(error);

      // Act - Should not throw
      await service.generatePdfFromHtml(html);

      // Assert
      expect(mockPage.close).toHaveBeenCalled();
    });
  });
});
