// Libraries
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import * as handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Template Service
 * Handles Handlebars template compilation, caching, and rendering
 *
 * This service provides template rendering functionality with performance
 * optimization through template compilation caching.
 */
@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templateCache = new Map<string, handlebars.TemplateDelegate>();
  private readonly templatesPath: string;

  constructor(private readonly i18n: I18nService) {
    // Resolve templates directory path relative to project root
    this.templatesPath = path.join(process.cwd(), 'src', 'modules', 'mail', 'templates');
  }

  /**
   * Render a Handlebars template with provided data
   * @param templateName - Name of the template file (without .hbs extension)
   * @param data - Data object to pass to template (e.g., { firstName: 'John', verificationLink: '...' })
   * @returns Promise resolving to rendered HTML string
   * @throws NotFoundException if template file not found
   * @throws BadRequestException if template compilation or rendering fails
   */
  async render(templateName: string, data: object): Promise<string> {
    try {
      // Check cache first
      let compiledTemplate = this.templateCache.get(templateName);

      if (!compiledTemplate) {
        // Cache miss: Load and compile template
        this.logger.debug(`Template cache miss: ${templateName}, compiling...`);

        // Resolve template file path
        const templatePath = path.join(this.templatesPath, `${templateName}.hbs`);

        // Load template file
        let templateContent: string;
        try {
          templateContent = await fs.readFile(templatePath, 'utf-8');
        } catch (error) {
          // File not found or read error
          this.logger.error(
            `Template file not found: ${templatePath}`,
            error instanceof Error ? error.stack : undefined,
          );
          throw new NotFoundException(
            this.i18n.t('errors.TEMPLATE_NOT_FOUND', {
              args: { templateName },
            }),
          );
        }

        // Compile template
        try {
          compiledTemplate = handlebars.compile(templateContent);
        } catch (error) {
          // Template compilation error (invalid Handlebars syntax)
          this.logger.error(
            `Template compilation failed: ${templateName}`,
            error instanceof Error ? error.stack : undefined,
          );
          throw new BadRequestException(
            this.i18n.t('errors.TEMPLATE_COMPILATION_FAILED', {
              args: {
                templateName,
                error: error instanceof Error ? error.message : String(error),
              },
            }),
          );
        }

        // Cache compiled template
        this.templateCache.set(templateName, compiledTemplate);
        this.logger.debug(`Template compiled and cached: ${templateName}`);
      } else {
        // Cache hit: Use cached template
        this.logger.debug(`Template cache hit: ${templateName}`);
      }

      // Render template with data
      try {
        const renderedHtml = compiledTemplate(data);
        this.logger.debug(`Template rendered successfully: ${templateName}`);
        return renderedHtml;
      } catch (error) {
        // Template rendering error (e.g., missing required variables)
        this.logger.error(
          `Template rendering failed: ${templateName}`,
          error instanceof Error ? error.stack : undefined,
        );
        throw new BadRequestException(
          this.i18n.t('errors.TEMPLATE_RENDERING_FAILED', {
            args: {
              templateName,
              error: error instanceof Error ? error.message : String(error),
            },
          }),
        );
      }
    } catch (error) {
      // Re-throw NotFoundException and BadRequestException as-is
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      // Wrap unexpected errors
      this.logger.error(
        `Unexpected error in TemplateService.render: ${templateName}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException(
        this.i18n.t('errors.TEMPLATE_RENDERING_FAILED', {
          args: {
            templateName,
            error: error instanceof Error ? error.message : String(error),
          },
        }),
      );
    }
  }
}
