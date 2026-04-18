import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { captureException } from '../monitoring/sentry';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx      = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request  = ctx.getRequest<Request>();

    let status  = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Ichki server xatosi';
    let error   = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as any;
        message = Array.isArray(res.message)
          ? res.message.join(', ')
          : res.message || message;
        error = res.error || error;
      }
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} — ${status}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      captureException(exception, {
        method: request.method,
        url: request.url,
        userId: (request as any).user?.id,
      });
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
