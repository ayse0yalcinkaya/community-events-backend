// Libraries
import { HttpStatus } from '@nestjs/common';

// Exceptions
import { AdapterNotFoundException } from '../adapter-not-found.exception';

describe('AdapterNotFoundException', () => {
  it('should create exception with correct message and status code', () => {
    const exception = new AdapterNotFoundException('test-template', 'pdf');

    expect(exception.message).toBe('Adapter not found: test-template (type: pdf)');
    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
  });

  it('should handle excel adapter type', () => {
    const exception = new AdapterNotFoundException('test-adapter', 'excel');

    expect(exception.message).toBe('Adapter not found: test-adapter (type: excel)');
    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
  });
});
