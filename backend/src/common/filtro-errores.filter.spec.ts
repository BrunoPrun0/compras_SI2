import { ArgumentsHost } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { FiltroErrores } from './filtro-errores.filter';

function responder(error: unknown) {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const host = {
    switchToHttp: () => ({ getResponse: () => res }),
  } as unknown as ArgumentsHost;
  new FiltroErrores().catch(error, host);
  return { status: res.status.mock.calls[0][0] as number, cuerpo: res.json.mock.calls[0][0] };
}

const errorPg = (code: string, constraint?: string) =>
  new QueryFailedError('SELECT 1', [], Object.assign(new Error('pg'), { code, constraint }));

describe('FiltroErrores: errores de Postgres', () => {
  it('22003 (id fuera del rango de INT) → 400 VALIDACION, no 500', () => {
    const { status, cuerpo } = responder(errorPg('22003'));
    expect(status).toBe(400);
    expect(cuerpo).toMatchObject({ statusCode: 400, code: 'VALIDACION' });
  });

  it('23505 (UNIQUE) → 409 CONFLICTO con la restricción', () => {
    const { status, cuerpo } = responder(errorPg('23505', 'compras_proveedor_rut_nit_key'));
    expect(status).toBe(409);
    expect(cuerpo).toMatchObject({
      code: 'CONFLICTO',
      details: { restriccion: 'compras_proveedor_rut_nit_key' },
    });
  });
});
