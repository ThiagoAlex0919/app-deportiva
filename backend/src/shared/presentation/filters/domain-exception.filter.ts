/**
 * DomainExceptionFilter — frontera entre el dominio y HTTP.
 *
 * Captura toda DomainException lanzada por servicios/entidades y la convierte
 * en una respuesta JSON uniforme:
 *   { statusCode, codigo, mensaje, timestamp, path }
 *
 * Así los controladores no necesitan try/catch y el contrato de errores
 * es idéntico en toda la API.
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException } from '../../domain/exceptions/domain.exception';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    response.status(exception.httpStatus).json({
      statusCode: exception.httpStatus,
      codigo: exception.codigo,
      mensaje: exception.message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
