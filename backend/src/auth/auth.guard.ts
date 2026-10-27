import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import type { Entorno } from '../common/config';
import { ErrorDominio, sinPermiso } from '../common/errores';
import { EmpleadosRepository } from './empleados.repository';
import { CLAVE_PUBLICO, CLAVE_ROLES, Rol, UsuarioAutenticado } from './roles';

/** Roles que asume el modo dev (Sprint 2, sin login). */
export const ROLES_MODO_DEV: Rol[] = ['SOLICITANTE', 'COMPRADOR'];
export const HEADER_EMPLEADO = 'x-empleado-id';

/**
 * Guard global: autentica y valida el rol en cada endpoint (RT2, V11).
 * - AUTH_MODE=dev: el usuario viene del header X-Empleado-Id y tiene SOLICITANTE + COMPRADOR.
 * - AUTH_MODE=jwt: Sprint 3 (login con RRHH). Los controladores no cambian.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly modo: Entorno['AUTH_MODE'];

  constructor(
    private readonly reflector: Reflector,
    private readonly empleados: EmpleadosRepository,
    config: ConfigService<Entorno, true>,
  ) {
    this.modo = config.get('AUTH_MODE', { infer: true });
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const objetivos = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, objetivos)) return true;

    const req = ctx.switchToHttp().getRequest<Request & { usuario?: UsuarioAutenticado }>();
    const usuario = await this.autenticar(req);
    req.usuario = usuario;

    const requeridos = this.reflector.getAllAndOverride<Rol[] | undefined>(CLAVE_ROLES, objetivos);
    if (!requeridos?.length) {
      // Criterio de calidad: ningún endpoint sin @Roles. Si se olvida, se niega.
      this.logger.warn(`Endpoint sin @Roles: ${ctx.getClass().name}.${ctx.getHandler().name}`);
      throw sinPermiso();
    }
    if (!requeridos.some((r) => usuario.roles.includes(r))) {
      throw new ErrorDominio('SIN_PERMISO', 'Tu rol no permite usar este recurso', {
        rolesRequeridos: requeridos,
      });
    }
    return true;
  }

  private async autenticar(req: Request): Promise<UsuarioAutenticado> {
    if (this.modo !== 'dev') {
      throw new ErrorDominio(
        'NO_AUTENTICADO',
        'El login con RRHH aún no está disponible (Sprint 3)',
      );
    }
    const valor = req.header(HEADER_EMPLEADO);
    const id = Number(valor);
    if (!valor || !Number.isInteger(id) || id <= 0) {
      throw new ErrorDominio(
        'NO_AUTENTICADO',
        'Falta el header X-Empleado-Id (selecciona un usuario)',
      );
    }
    const empleado = await this.empleados.porId(id);
    if (!empleado) throw new ErrorDominio('NO_AUTENTICADO', `El empleado ${id} no existe`);
    return { ...empleado, roles: [...ROLES_MODO_DEV] };
  }
}
