// Libraries
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import * as ejs from 'ejs';
import * as fs from 'fs';
import * as path from 'path';
import puppeteer, { Browser } from 'puppeteer';
/**
 * Template Engine Service
 *
 * Handles EJS template rendering with i18n support and PDF generation via Puppeteer.
 * Provides a shared browser instance for performance optimization.
 *
 * Features:
 * - EJS template rendering with i18n `t()` function injection
 * - HTML to PDF conversion using Puppeteer
 * - Shared browser instance (initialized on module init, closed on module destroy)
 * - CSS injection support for PDF styling
 *
 * Lifecycle:
 * - onModuleInit(): Launches Puppeteer browser instance
 * - onModuleDestroy(): Closes Puppeteer browser instance
 */
@Injectable()
export class TemplateEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TemplateEngineService.name);
  private browser: Browser | null = null;

  constructor(private readonly i18n: I18nService) {}

  /**
   * Initialize Puppeteer browser instance on module initialization
   */
  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Initializing Puppeteer browser instance...');
      const launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
        ],
      };
      this.logger.log(`Puppeteer launch options: ${JSON.stringify(launchOptions)}`);
      this.browser = await puppeteer.launch(launchOptions);
      this.logger.log('Puppeteer browser instance initialized successfully');
    } catch (error) {
      this.logger.error(
        'Failed to initialize Puppeteer browser instance. PDF generation service will be disabled.',
        error instanceof Error ? error.stack : undefined,
      );
      // Do not throw error to allow application startup
    }
  }

  /**
   * Close Puppeteer browser instance on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      try {
        this.logger.log('Closing Puppeteer browser instance...');
        await this.browser.close();
        this.browser = null;
        this.logger.log('Puppeteer browser instance closed successfully');
      } catch (error) {
        this.logger.error('Error closing Puppeteer browser instance', error instanceof Error ? error.stack : undefined);
      }
    }
  }

  /**
   * Render EJS template with i18n support
   *
   * Reads the EJS template file, injects i18n `t()` function into template data,
   * and renders the template to HTML string.
   *
   * @param templatePath - Absolute path to EJS template file
   * @param data - Data object to pass to template
   * @param lang - Language code for internationalization (e.g., 'en', 'tr')
   * @returns Promise resolving to rendered HTML string
   */
  async renderTemplate(templatePath: string, data: any, lang: string): Promise<string> {
    try {
      // Read template file
      const templateContent = fs.readFileSync(templatePath, 'utf-8');

      // Inject i18n `t()` function and lang into template data
      // Support both direct access (e.g., ticket.code) and wrapped access (e.g., data.summary)
      const templateData = {
        ...data,
        data,
        lang,
        t: (key: string, params?: Record<string, any>) => {
          return this.i18n.translate(key, { lang, ...params });
        },
      };

      // Render EJS template
      const html = ejs.render(templateContent, templateData);

      this.logger.debug(`Template rendered successfully: ${templatePath}`);
      return html;
    } catch (error) {
      this.logger.error(`Failed to render template: ${templatePath}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  /**
   * Generate PDF from HTML string using Puppeteer
   *
   * Creates a new page in the shared browser instance, injects HTML and CSS,
   * and generates a PDF buffer. Page is closed after generation for resource cleanup.
   *
   * @param html - HTML string to convert to PDF
   * @param cssPath - Optional absolute path to CSS file for styling
   * @returns Promise resolving to PDF file Buffer
   */
  async generatePdfFromHtml(html: string, cssPath?: string | null): Promise<Buffer> {
    if (!this.browser) {
      throw new Error('PDF generation service is currently not active');
    }

    let page;
    try {
      // Create new page from shared browser instance
      page = await this.browser.newPage();

      // Read CSS file if provided
      let css = '';
      if (cssPath) {
        try {
          css = fs.readFileSync(cssPath, 'utf-8');
        } catch (error) {
          this.logger.warn(`CSS file not found or failed to read: ${cssPath}. Continuing without CSS.`);
        }
      }

      // Inject CSS into HTML
      const htmlWithCss = css ? `<style>${css}</style>${html}` : html;

      // Set page content
      await page.setContent(htmlWithCss, {
        waitUntil: 'networkidle0',
      });

      // Generate PDF with options
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
        timeout: 30000, // 30 seconds timeout
      });

      this.logger.debug('PDF generated successfully');
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error('Failed to generate PDF from HTML', error instanceof Error ? error.stack : undefined);
      throw error;
    } finally {
      // Cleanup: Close page after generation
      if (page) {
        try {
          await page.close();
        } catch (error) {
          this.logger.warn('Error closing page after PDF generation', error instanceof Error ? error.stack : undefined);
        }
      }
    }
  }
}
