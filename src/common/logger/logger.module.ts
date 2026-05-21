// Libraries
import { Global, Module } from '@nestjs/common';

// Services
import { LoggerService } from './logger.service';

/**
 * AC-7.3.1: Logger Module - Provides Winston logger globally
 * @Global() decorator makes LoggerService available across all modules
 * without needing explicit imports
 */
@Global()
@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
