import type { Rol, UsuarioAutenticado } from '../auth/roles';
import { CodigoError, ErrorDominio } from './errores';

/**
 * Regla de una transición de estado. Las máquinas de cada documento (SC, OC) son tablas
 * `accion → regla`; ningún cambio de estado se hace fuera de ellas.
 */
export interface ReglaTransicion<E extends string> {
  desde: readonly E[];
  hacia: E;
  /** Basta con tener uno de estos roles. */
  roles: readonly Rol[];
  /** `requerido`: solo el dueño del documento; `prohibido`: nunca el dueño (V5). */
  dueno?: 'requerido' | 'prohibido';
  /** Roles que no están sujetos a la condición de dueño (p. ej. ADMIN anula SC ajenas). */
  rolesExentosDueno?: readonly Rol[];
  /** Código si falla la condición de dueño (por defecto SIN_PERMISO). */
  codigoDueno?: CodigoError;
}

export type Maquina<A extends string, E extends string> = Record<A, ReglaTransicion<E>>;

export interface ContextoTransicion<E extends string> {
  estadoActual: E;
  usuario: UsuarioAutenticado;
  idDueno: number;
}

/**
 * Valida rol, condición de dueño y estado de origen. Lanza ErrorDominio
 * (SIN_PERMISO / código de dueño / TRANSICION_INVALIDA) o devuelve la regla aplicada.
 */
export function validarTransicion<A extends string, E extends string>(
  maquina: Maquina<A, E>,
  accion: A,
  ctx: ContextoTransicion<E>,
): ReglaTransicion<E> {
  const regla = maquina[accion];
  const { usuario } = ctx;

  if (!regla.roles.some((r) => usuario.roles.includes(r))) {
    throw new ErrorDominio('SIN_PERMISO', `Tu rol no permite la acción "${accion}"`);
  }

  const exento = (regla.rolesExentosDueno ?? []).some((r) => usuario.roles.includes(r));
  const esDueno = usuario.idEmpleado === ctx.idDueno;
  if (!exento && regla.dueno === 'requerido' && !esDueno) {
    throw new ErrorDominio(
      regla.codigoDueno ?? 'SIN_PERMISO',
      'Solo el creador del documento puede hacer esto',
    );
  }
  if (!exento && regla.dueno === 'prohibido' && esDueno) {
    throw new ErrorDominio(
      regla.codigoDueno ?? 'SIN_PERMISO',
      'No puedes realizar esta acción sobre un documento propio',
    );
  }

  if (!regla.desde.includes(ctx.estadoActual)) {
    throw new ErrorDominio(
      'TRANSICION_INVALIDA',
      `No se puede "${accion}" un documento en estado ${ctx.estadoActual}`,
      { accion, estadoActual: ctx.estadoActual, estadosPermitidos: regla.desde },
    );
  }
  return regla;
}
