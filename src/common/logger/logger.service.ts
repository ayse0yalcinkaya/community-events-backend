// Libraries
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

// Configs
import { winstonLogger } from '../../config/logger.config';

/**
 * AC-7.3.1: Winston Logger Service - Injectable logger for use across all modules
 * Implements NestJS LoggerService interface to be used as global logger
 *
 * AC-7.3.3: Log levels implemented: debug, info, warn, error
 * Each method corresponds to a winston log level
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  /**
   * Log an informational message
   * AC-7.3.3: logger.info() method
   *
   * @param message - Log message
   * @param context - Optional context object with metadata (module, method, requestId, userId, domainId)
   */
  log(message: string, context?: any) {
    winstonLogger.info(message, { context });
  }

  /**
   * Log an error message with optional stack trace
   * AC-7.3.3: logger.error() method
   *
   * @param message - Error message
   * @param trace - Optional stack trace
   * @param context - Optional context object with metadata
   */
  error(message: string, trace?: string, context?: any) {
    winstonLogger.error(message, { context, stack: trace });
  }

  /**
   * Log a warning message
   * AC-7.3.3: logger.warn() method
   *
   * @param message - Warning message
   * @param context - Optional context object with metadata
   */
  warn(message: string, context?: any) {
    winstonLogger.warn(message, { context });
  }

  /**
   * Log a debug message
   * AC-7.3.3: logger.debug() method
   *
   * @param message - Debug message
   * @param context - Optional context object with metadata
   */
  debug(message: string, context?: any) {
    winstonLogger.debug(message, { context });
  }

  /**
   * Log a verbose message (mapped to debug level in Winston)
   * NestJS LoggerService interface requirement
   *
   * @param message - Verbose message
   * @param context - Optional context object with metadata
   */
  verbose(message: string, context?: any) {
    winstonLogger.debug(message, { context });
  }
}
