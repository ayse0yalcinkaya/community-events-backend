// Libraries
import * as fs from 'fs/promises';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as handlebars from 'handlebars';
import { I18nService } from 'nestjs-i18n';

// Services
import { TemplateService } from '../../services/template.service';

// Mock fs/promises
jest.mock('fs/promises');

describe('TemplateService', () => {
  let service: TemplateService;
  let i18nService: any;

  const templateName = 'verification';
  const templatePath = expect.stringContaining('verification.hbs');
  const templateContent = '<h1>Hello {{firstName}}</h1><a href="{{verificationLink}}">Verify</a>';
  const templateData = {
    firstName: 'John',
    verificationLink: 'https://example.com/verify?token=abc123',
  };
  // Handlebars escapes special characters in URLs, so = becomes &#x3D;
  const expectedHtml = '<h1>Hello John</h1><a href="https://example.com/verify?token&#x3D;abc123">Verify</a>';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        {
          provide: I18nService,
          useValue: {
            t: jest.fn((key: string, options?: any) => {
              if (options?.args) {
                return `${key}: ${JSON.stringify(options.args)}`;
              }
              return key;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
    i18nService = module.get(I18nService);

    jest.clearAllMocks();
  });

  describe('render', () => {
    it('should load template file, compile it, cache it, and render with data on first call (cache miss)', async () => {
      // Arrange
      (fs.readFile as jest.Mock).mockResolvedValue(templateContent);

      // Act
      const result = await service.render(templateName, templateData);

      // Assert
      expect(fs.readFile).toHaveBeenCalledWith(templatePath, 'utf-8');
      expect(result).toBe(expectedHtml);
    });

    it('should use cached compiled template on subsequent calls (cache hit)', async () => {
      // Arrange
      (fs.readFile as jest.Mock).mockResolvedValue(templateContent);

      // Act - First call (cache miss)
      await service.render(templateName, templateData);

      // Clear mock call history
      (fs.readFile as jest.Mock).mockClear();

      // Act - Second call (cache hit)
      const result = await service.render(templateName, templateData);

      // Assert - File should not be read again
      expect(fs.readFile).not.toHaveBeenCalled();
      expect(result).toBe(expectedHtml);
    });

    it('should render template with data variables correctly', async () => {
      // Arrange
      const customTemplate = '<p>Welcome {{firstName}}, reset link: {{resetLink}}</p>';
      (fs.readFile as jest.Mock).mockResolvedValue(customTemplate);

      // Act
      const result = await service.render('password-reset', {
        firstName: 'Jane',
        resetLink: 'https://example.com/reset?token=xyz789',
      });

      // Assert
      expect(result).toBe('<p>Welcome Jane, reset link: https://example.com/reset?token&#x3D;xyz789</p>');
    });

    it('should throw NotFoundException when template file not found', async () => {
      // Arrange
      const fileNotFoundError = new Error('ENOENT: no such file or directory');
      (fs.readFile as jest.Mock).mockRejectedValue(fileNotFoundError);

      // Act & Assert
      await expect(service.render('nonexistent', templateData)).rejects.toThrow(NotFoundException);
      expect(i18nService.t).toHaveBeenCalledWith(
        'errors.TEMPLATE_NOT_FOUND',
        expect.objectContaining({
          args: { templateName: 'nonexistent' },
        }),
      );
    });

    it('should throw BadRequestException when template syntax is invalid', async () => {
      // Arrange
      const invalidTemplate = '<h1>Hello {{firstName}</h1>'; // Missing closing brace
      (fs.readFile as jest.Mock).mockResolvedValue(invalidTemplate);

      // Act & Assert
      await expect(service.render(templateName, templateData)).rejects.toThrow(BadRequestException);
      // Template compilation errors are caught during compilation, but Handlebars
      // may throw during render. Check that error was thrown with template name.
      expect(i18nService.t).toHaveBeenCalledWith(
        expect.stringMatching(/TEMPLATE_(COMPILATION|RENDERING)_FAILED/),
        expect.objectContaining({
          args: expect.objectContaining({
            templateName,
          }),
        }),
      );
    });

    it('should handle missing template variables gracefully (Handlebars default behavior)', async () => {
      // Arrange
      const templateWithMissingVar = '<h1>Hello {{firstName}}, missing: {{missingVar}}</h1>';
      (fs.readFile as jest.Mock).mockResolvedValue(templateWithMissingVar);

      // Act
      const result = await service.render(templateName, {
        firstName: 'John',
        // missingVar is not provided
      });

      // Assert - Handlebars replaces missing variables with empty string
      expect(result).toBe('<h1>Hello John, missing: </h1>');
    });

    it('should throw BadRequestException when template rendering fails', async () => {
      // Arrange
      const templateContent = '<h1>{{#each items}}{{name}}{{/each}}</h1>';
      (fs.readFile as jest.Mock).mockResolvedValue(templateContent);

      // Mock handlebars.compile to return a function that throws
      const originalCompile = handlebars.compile;
      jest.spyOn(handlebars, 'compile').mockReturnValue(() => {
        throw new Error('Rendering error');
      });

      // Act & Assert
      await expect(service.render(templateName, { items: null })).rejects.toThrow(BadRequestException);
      expect(i18nService.t).toHaveBeenCalledWith(
        'errors.TEMPLATE_RENDERING_FAILED',
        expect.objectContaining({
          args: expect.objectContaining({
            templateName,
          }),
        }),
      );

      // Restore original compile
      jest.spyOn(handlebars, 'compile').mockRestore();
    });

    it('should handle file read errors and throw NotFoundException', async () => {
      // Arrange
      const readError = new Error('Permission denied');
      (fs.readFile as jest.Mock).mockRejectedValue(readError);

      // Act & Assert
      await expect(service.render(templateName, templateData)).rejects.toThrow(NotFoundException);
    });

    it('should wrap unexpected errors in BadRequestException', async () => {
      // Arrange - Use a different error type that doesn't trigger NotFoundException
      const unexpectedError = new Error('Unexpected error');
      // Mock readFile to succeed but then throw during compilation
      (fs.readFile as jest.Mock).mockResolvedValue(templateContent);

      // Mock handlebars.compile to throw unexpected error
      const originalCompile = handlebars.compile;
      jest.spyOn(handlebars, 'compile').mockImplementation(() => {
        throw unexpectedError;
      });

      // Act & Assert
      await expect(service.render(templateName, templateData)).rejects.toThrow(BadRequestException);

      // Restore original compile
      jest.spyOn(handlebars, 'compile').mockRestore();
    });
  });
});
