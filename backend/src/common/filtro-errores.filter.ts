import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { CodigoError, CuerpoError, ErrorDominio } from './errores';

const CODIGO_POR_STATUS: Record<number, CodigoError> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDACION',
  [HttpStatus.UNAUTHORIZED]: 'NO_AUTENTICADO',
  [HttpStatus.FORBIDDEN]: 'SIN_PERMISO',
  [HttpStatus.NOT_FOUND]: 'NO_ENCONTRADO',
  [HttpStatus.CONFLICT]: 'CONFLICTO',
};

/** Toda respuesta de error sale como `{statusCode, code, message, details?}`. */
@Catch()
export class FiltroErrores implements ExceptionFilter {
  private readonly logger = new Logger(FiltroErrores.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const cuerpo = this.aCuerpo(error);
    if (cuerpo.statusCode >= 500) {
      this.logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    }
    res.status(cuerpo.statusCode).json(cuerpo);
  }

  private aCuerpo(error: unknown): CuerpoError {
    if (error instanceof ErrorDominio) return error.getResponse() as CuerpoError;

    if (error instanceof HttpException) {
      const status = error.getStatus();
      const resp = error.getResponse();
      const mensaje =
        typeof resp === 'object' && resp !== null && 'message' in resp
          ? (resp as { message: unknown }).message
          : error.message;
      return {
        statusCode: status,
        code: CODIGO_POR_STATUS[status] ?? (status >= 500 ? 'ERROR_INTERNO' : 'VALIDACION'),
        message: Array.isArray(mensaje) ? mensaje.join('; ') : String(mensaje),
      };
    }

    // Restricciones de la BD que se escapan de las validaciones del servicio
    if (error instanceof QueryFailedError) {
      const pg = error.driverError as { code?: string; constraint?: string };
      if (pg.code === '23505') {
        return {
          statusCode: 409,
          code: 'CONFLICTO',
          message: 'El registro ya existe',
          details: { restriccion: pg.constraint },
        };
      }
      // 22003: número fuera de rango (p. ej. un id mayor que INT en la ruta, query o body)
      if (pg.code === '22003') {
        return { statusCode: 400, code: 'VALIDACION', message: 'Número fuera de rango' };
      }
      if (pg.code === '23503' || pg.code === '23514') {
        return {
          statusCode: 400,
          code: 'VALIDACION',
          message: 'Datos inconsistentes',
          details: { restriccion: pg.constraint },
        };
      }
    }

    return { statusCode: 500, code: 'ERROR_INTERNO', message: 'Error interno del servidor' };
  }
}
