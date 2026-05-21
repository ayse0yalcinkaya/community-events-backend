// Libraries
import { HttpStatus } from '@nestjs/common';

// Exceptions
import { TemplateNotFoundException } from '../template-not-found.exception';

describe('TemplateNotFoundException', () => {
  it('should create exception with correct message and status code', () => {
    const templatePath = '/path/to/template.ejs';
    const exception = new TemplateNotFoundException(templatePath);

    expect(exception.message).toBe(`Template not found: ${templatePath}`);
    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
  });
});
