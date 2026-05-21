// Libraries
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Generation Failed Exception
 *
 * Thrown when document generation fails due to an error during the generation process.
 * Includes context information for debugging purposes.
 *
 * @extends {HttpException}
 */
export class GenerationFailedException extends HttpException {
  /**
   * Constructor
   *
   * @param message - Error message describing the failure
   * @param context - Additional context information (e.g., template name, adapter name, error details)
   */
  constructor(message: string, context?: Record<string, any>) {
    const errorResponse = {
      message,
      ...(context && { context }),
    };
    super(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
