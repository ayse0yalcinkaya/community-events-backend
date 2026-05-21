// Libraries
import { HttpStatus } from '@nestjs/common';

// Exceptions
import { GenerationFailedException } from '../generation-failed.exception';

describe('GenerationFailedException', () => {
  it('should create exception with correct message and status code', () => {
    const message = 'PDF generation failed';
    const exception = new GenerationFailedException(message);

    expect(exception.message).toBe(message);
    expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('should include context information in response', () => {
    const message = 'PDF generation failed';
    const context = {
      templateName: 'invoice',
      error: 'Template rendering error',
    };
    const exception = new GenerationFailedException(message, context);

    expect(exception.message).toBe(message);
    expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

    const response = exception.getResponse() as any;
    expect(response.context).toEqual(context);
  });

  it('should work without context', () => {
    const message = 'PDF generation failed';
    const exception = new GenerationFailedException(message);

    expect(exception.message).toBe(message);
    expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});
