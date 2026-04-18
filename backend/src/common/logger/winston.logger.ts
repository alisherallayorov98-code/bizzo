import { LoggerService, LogLevel } from '@nestjs/common';
import * as winston from 'winston';

const isProd = process.env.NODE_ENV === 'production';

export const winstonLogger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: isProd
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp, context }) =>
          `${timestamp} ${level} ${context ? `[${context}] ` : ''}${message}`,
        ),
      ),
  transports: isProd
    ? [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error', maxsize: 10_485_760, maxFiles: 5 }),
        new winston.transports.File({ filename: 'logs/combined.log', maxsize: 10_485_760, maxFiles: 5 }),
      ]
    : [new winston.transports.Console()],
});

export class WinstonLoggerService implements LoggerService {
  log(message: any, context?: string) { winstonLogger.info(String(message), { context }); }
  error(message: any, trace?: string, context?: string) {
    winstonLogger.error(String(message), { context, trace });
  }
  warn(message: any, context?: string)  { winstonLogger.warn(String(message), { context }); }
  debug(message: any, context?: string) { winstonLogger.debug(String(message), { context }); }
  verbose(message: any, context?: string) { winstonLogger.verbose(String(message), { context }); }
  setLogLevels?(_levels: LogLevel[]) { /* noop */ }
}
