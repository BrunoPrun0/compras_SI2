import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Entorno } from '../common/config';
import { ErrorDominio } from '../common/errores';
import { AuthGuard, ROLES_MODO_DEV } from './auth.guard';
import { EmpleadosRepository } from './empleados.repository';
import { CLAVE_PUBLICO, CLAVE_ROLES, Rol, UsuarioAutenticado } from './roles';

const CARLOS = { idEmpleado: 301, nombre: 'Carlos Gómez' };

interface Escenario {
  header?: string;
  roles?: Rol[];
  publico?: boolean;
  modo?: 'dev' | 'jwt';
}

function preparar({ header, roles, publico = false, modo = 'dev' }: Escenario) {
  const metadatos: Record<string, unknown> = { [CLAVE_PUBLICO]: publico, [CLAVE_ROLES]: roles };
  const reflector = {
    getAllAndOverride: (clave: string) => metadatos[clave],
  } as unknown as Reflector;
  const porId = jest.fn((id: number) => Promise.resolve(id === CARLOS.idEmpleado ? CARLOS : null));
  const empleados = { porId } as unknown as EmpleadosRepository;
  const config = { get: () => modo } as unknown as ConfigService<Entorno, true>;

  const req: { header: (n: string) => string | undefined; usuario?: UsuarioAutenticado } = {
    header: (n) => (n.toLowerCase() === 'x-empleado-id' ? header : undefined),
  };
  const ctx = {
    getHandler: () => function handler() {},
    getClass: () => class Controlador {},
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;

  return { guard: new AuthGuard(reflector, empleados, config), ctx, req, porId };
}

async function codigoError(promesa: Promise<unknown>): Promise<string> {
  const error = await promesa.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ErrorDominio);
  return (error as ErrorDominio).codigo;
}

describe('AuthGuard (AUTH_MODE=dev)', () => {
  it('deja pasar un endpoint @Publico sin header ni consulta a RRHH', async () => {
    const { guard, ctx, porId } = preparar({ publico: true });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(porId).not.toHaveBeenCalled();
  });

  it('autentica con el header y deja el usuario con los roles de modo dev en req.usuario', async () => {
    const { guard, ctx, req } = preparar({ header: '301', roles: ['SOLICITANTE'] });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.usuario).toEqual({ ...CARLOS, roles: ROLES_MODO_DEV });
  });

  it('sin header → NO_AUTENTICADO', async () => {
    const { guard, ctx } = preparar({ roles: ['SOLICITANTE'] });
    expect(await codigoError(guard.canActivate(ctx))).toBe('NO_AUTENTICADO');
  });

  it.each(['', 'abc', '1e2', '0x12', ' 301', '301 ', '-5', '0', '3.0', '99999999999'])(
    'header %p → NO_AUTENTICADO sin consultar a RRHH',
    async (header) => {
      const { guard, ctx, porId } = preparar({ header, roles: ['SOLICITANTE'] });
      expect(await codigoError(guard.canActivate(ctx))).toBe('NO_AUTENTICADO');
      expect(porId).not.toHaveBeenCalled();
    },
  );

  it('empleado inexistente → NO_AUTENTICADO', async () => {
    const { guard, ctx, porId } = preparar({ header: '9999', roles: ['SOLICITANTE'] });
    expect(await codigoError(guard.canActivate(ctx))).toBe('NO_AUTENTICADO');
    expect(porId).toHaveBeenCalledWith(9999);
  });

  it('rol insuficiente → SIN_PERMISO', async () => {
    const { guard, ctx } = preparar({ header: '301', roles: ['GESTOR_SC', 'ADMIN'] });
    expect(await codigoError(guard.canActivate(ctx))).toBe('SIN_PERMISO');
  });

  it('basta con tener uno de los roles requeridos', async () => {
    const { guard, ctx } = preparar({ header: '301', roles: ['ADMIN', 'COMPRADOR'] });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it.each([undefined, []])('endpoint sin @Roles (%p) → SIN_PERMISO', async (roles) => {
    const { guard, ctx } = preparar({ header: '301', roles });
    jest.spyOn(guard['logger'], 'warn').mockImplementation(() => undefined);
    expect(await codigoError(guard.canActivate(ctx))).toBe('SIN_PERMISO');
  });

  it('AUTH_MODE=jwt aún no autentica (Sprint 3) → NO_AUTENTICADO', async () => {
    const { guard, ctx } = preparar({ header: '301', roles: ['SOLICITANTE'], modo: 'jwt' });
    expect(await codigoError(guard.canActivate(ctx))).toBe('NO_AUTENTICADO');
  });
});
