import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Códigos de error del contrato (docs/decisiones.md §3 y §5).
 * Cada código tiene un único status HTTP.
 */
export const STATUS_POR_CODIGO = {
  // Reglas de negocio
  PROVEEDOR_RUT_INVALIDO: HttpStatus.BAD_REQUEST,
  PROVEEDOR_RUT_DUPLICADO: HttpStatus.CONFLICT,
  SC_INCOMPLETA: HttpStatus.BAD_REQUEST,
  SC_POSIBLE_DUPLICADO: HttpStatus.CONFLICT,
  SC_MOTIVO_RECHAZO_REQUERIDO: HttpStatus.BAD_REQUEST,
  SC_AUTOAPROBACION: HttpStatus.FORBIDDEN,
  TRANSICION_INVALIDA: HttpStatus.CONFLICT,
  OC_LINEA_SIN_RESPALDO: HttpStatus.BAD_REQUEST,
  OC_LINEA_YA_USADA: HttpStatus.CONFLICT,
  OC_CANTIDAD_INVALIDA: HttpStatus.BAD_REQUEST,
  OC_PRECIO_INVALIDO: HttpStatus.BAD_REQUEST,
  OC_PROVEEDOR_INACTIVO: HttpStatus.CONFLICT,
  OC_INCOMPLETA: HttpStatus.BAD_REQUEST,
  OC_INMUTABLE: HttpStatus.CONFLICT,
  SIN_PERMISO: HttpStatus.FORBIDDEN,
  // Genéricos
  VALIDACION: HttpStatus.BAD_REQUEST,
  NO_AUTENTICADO: HttpStatus.UNAUTHORIZED,
  NO_ENCONTRADO: HttpStatus.NOT_FOUND,
  CONFLICTO: HttpStatus.CONFLICT,
  ERROR_INTERNO: HttpStatus.INTERNAL_SERVER_ERROR,
} as const;

export type CodigoError = keyof typeof STATUS_POR_CODIGO;

export interface CuerpoError {
  statusCode: number;
  code: CodigoError;
  message: string;
  details?: unknown;
}

/** Excepción de dominio: el filtro global la serializa como `{statusCode, code, message, details?}`. */
export class ErrorDominio extends HttpException {
  constructor(
    readonly codigo: CodigoError,
    mensaje: string,
    readonly detalles?: unknown,
  ) {
    const cuerpo: CuerpoError = {
      statusCode: STATUS_POR_CODIGO[codigo],
      code: codigo,
      message: mensaje,
    };
    if (detalles !== undefined) cuerpo.details = detalles;
    super(cuerpo, STATUS_POR_CODIGO[codigo]);
  }
}

export const noEncontrado = (recurso: string, id: number | string) =>
  new ErrorDominio('NO_ENCONTRADO', `${recurso} ${id} no existe`);

export const sinPermiso = (mensaje = 'No tienes permiso para realizar esta acción') =>
  new ErrorDominio('SIN_PERMISO', mensaje);
