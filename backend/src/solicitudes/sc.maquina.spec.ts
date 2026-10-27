import type { Rol, UsuarioAutenticado } from '../auth/roles';
import { ErrorDominio } from '../common/errores';
import { validarTransicion } from '../common/maquina-estados';
import { AccionSc, MAQUINA_SC } from './sc.maquina';
import { ESTADOS_SC, EstadoSc } from './solicitud.entity';

const DUENO = 10;
const usuario = (id: number, ...roles: Rol[]): UsuarioAutenticado => ({
  idEmpleado: id,
  nombre: `E${id}`,
  roles: ['SOLICITANTE', ...roles],
});

const codigo = (fn: () => unknown): string | null => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof ErrorDominio ? e.codigo : 'OTRO';
  }
};

const intentar = (accion: AccionSc, estado: EstadoSc, u: UsuarioAutenticado) =>
  codigo(() =>
    validarTransicion(MAQUINA_SC, accion, { estadoActual: estado, usuario: u, idDueno: DUENO }),
  );

describe('Máquina de estados de SC (V6)', () => {
  // Matriz completa: [acción, estado de origen] → resultado para el actor autorizado
  const permitidas: Record<AccionSc, EstadoSc[]> = {
    editar: ['BORRADOR'],
    enviar: ['BORRADOR'],
    anular: ['BORRADOR', 'PENDIENTE'],
    aprobar: ['PENDIENTE'],
    rechazar: ['PENDIENTE'],
  };
  const actor: Record<AccionSc, UsuarioAutenticado> = {
    editar: usuario(DUENO),
    enviar: usuario(DUENO),
    anular: usuario(DUENO),
    aprobar: usuario(99, 'GESTOR_SC'),
    rechazar: usuario(99, 'GESTOR_SC'),
  };

  for (const accion of Object.keys(permitidas) as AccionSc[]) {
    for (const estado of ESTADOS_SC) {
      const ok = permitidas[accion].includes(estado);
      it(`${accion} desde ${estado} → ${ok ? 'permitido' : 'TRANSICION_INVALIDA'}`, () => {
        expect(intentar(accion, estado, actor[accion])).toBe(ok ? null : 'TRANSICION_INVALIDA');
      });
    }
  }

  it('destinos', () => {
    expect(MAQUINA_SC.enviar.hacia).toBe('PENDIENTE');
    expect(MAQUINA_SC.anular.hacia).toBe('ANULADA');
    expect(MAQUINA_SC.aprobar.hacia).toBe('APROBADA');
    expect(MAQUINA_SC.rechazar.hacia).toBe('RECHAZADA');
  });

  it('solo el dueño edita, envía y anula', () => {
    const otro = usuario(20, 'COMPRADOR');
    expect(intentar('editar', 'BORRADOR', otro)).toBe('SIN_PERMISO');
    expect(intentar('enviar', 'BORRADOR', otro)).toBe('SIN_PERMISO');
    expect(intentar('anular', 'PENDIENTE', otro)).toBe('SIN_PERMISO');
  });

  it('ADMIN anula SC ajenas', () => {
    expect(intentar('anular', 'PENDIENTE', usuario(20, 'ADMIN'))).toBeNull();
  });

  it('V5: un gestor no aprueba ni rechaza su propia SC', () => {
    const gestorDueno = usuario(DUENO, 'GESTOR_SC');
    expect(intentar('aprobar', 'PENDIENTE', gestorDueno)).toBe('SC_AUTOAPROBACION');
    expect(intentar('rechazar', 'PENDIENTE', gestorDueno)).toBe('SC_AUTOAPROBACION');
  });

  it('V11: sin GESTOR_SC no se aprueba (ni siendo COMPRADOR o ADMIN)', () => {
    expect(intentar('aprobar', 'PENDIENTE', usuario(20, 'COMPRADOR'))).toBe('SIN_PERMISO');
    expect(intentar('aprobar', 'PENDIENTE', usuario(20, 'ADMIN'))).toBe('SIN_PERMISO');
  });
});
