import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const ROLES = ['SOLICITANTE', 'GESTOR_SC', 'COMPRADOR', 'INVENTARIO', 'ADMIN'] as const;
export type Rol = (typeof ROLES)[number];

export interface EmpleadoRef {
  idEmpleado: number;
  nombre: string;
}

export interface UsuarioAutenticado extends EmpleadoRef {
  roles: Rol[];
}

export const CLAVE_ROLES = 'roles';
export const CLAVE_PUBLICO = 'publico';

/**
 * Roles que pueden usar el endpoint (basta con uno). Todo usuario autenticado tiene SOLICITANTE,
 * así que `@Roles('SOLICITANTE')` equivale a "autenticado".
 */
export const Roles = (...roles: Rol[]) => SetMetadata(CLAVE_ROLES, roles);

/** Endpoint sin autenticación. */
export const Publico = () => SetMetadata(CLAVE_PUBLICO, true);

export const Usuario = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UsuarioAutenticado =>
    ctx.switchToHttp().getRequest<{ usuario: UsuarioAutenticado }>().usuario,
);

export const puedeVerTodo = (u: UsuarioAutenticado, ...roles: Rol[]) =>
  roles.some((r) => u.roles.includes(r));
