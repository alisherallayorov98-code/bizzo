import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';

const errSchema = (code: number, message: string) => ({
  schema: {
    example: {
      success: false,
      statusCode: code,
      error: message,
      message,
      timestamp: new Date().toISOString(),
      path: '/api/v1/...',
    },
  },
});

export function ApiCommonErrors(opts?: { notFound?: boolean }) {
  const decorators = [
    ApiBadRequestResponse({ description: 'Validatsiya xatosi', ...errSchema(400, 'Bad Request') }),
    ApiUnauthorizedResponse({ description: 'Auth kerak', ...errSchema(401, 'Unauthorized') }),
    ApiForbiddenResponse({ description: 'Ruxsat yo\'q', ...errSchema(403, 'Forbidden') }),
    ApiInternalServerErrorResponse({ description: 'Server xatosi', ...errSchema(500, 'Internal Server Error') }),
  ];
  if (opts?.notFound !== false) {
    decorators.push(ApiNotFoundResponse({ description: 'Topilmadi', ...errSchema(404, 'Not Found') }));
  }
  return applyDecorators(...decorators);
}
