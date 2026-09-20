import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  InvalidOperationError,
  ResourceNotFoundError,
} from '../../domain/domain-error';

const STATUS_BY_ERROR: Array<[new (message: string) => DomainError, HttpStatus]> = [
  [ResourceNotFoundError, HttpStatus.NOT_FOUND],
  [ConflictError, HttpStatus.CONFLICT],
  [InvalidOperationError, HttpStatus.BAD_REQUEST],
  [ForbiddenError, HttpStatus.FORBIDDEN],
];

/**
 * Translates domain errors into HTTP responses so the domain layer never
 * depends on the framework.
 */
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const match = STATUS_BY_ERROR.find(([type]) => error instanceof type);
    const status = match ? match[1] : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: status,
      message: error.message,
      error: error.name,
    });
  }
}

