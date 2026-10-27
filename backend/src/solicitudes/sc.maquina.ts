import { Maquina } from '../common/maquina-estados';
import type { EstadoSc } from './solicitud.entity';

export type AccionSc = 'editar' | 'enviar' | 'anular' | 'aprobar' | 'rechazar';

/**
 * Máquina de estados de la SC (docs/decisiones.md §2). `editar` no cambia el estado,
 * pero comparte las mismas reglas (solo el dueño, solo en BORRADOR) y no escribe historial.
 */
export const MAQUINA_SC: Maquina<AccionSc, EstadoSc> = {
  editar: { desde: ['BORRADOR'], hacia: 'BORRADOR', roles: ['SOLICITANTE'], dueno: 'requerido' },
  enviar: { desde: ['BORRADOR'], hacia: 'PENDIENTE', roles: ['SOLICITANTE'], dueno: 'requerido' },
  anular: {
    desde: ['BORRADOR', 'PENDIENTE'],
    hacia: 'ANULADA',
    roles: ['SOLICITANTE', 'ADMIN'],
    dueno: 'requerido',
    rolesExentosDueno: ['ADMIN'],
  },
  aprobar: {
    desde: ['PENDIENTE'],
    hacia: 'APROBADA',
    roles: ['GESTOR_SC'],
    dueno: 'prohibido',
    codigoDueno: 'SC_AUTOAPROBACION',
  },
  rechazar: {
    desde: ['PENDIENTE'],
    hacia: 'RECHAZADA',
    roles: ['GESTOR_SC'],
    dueno: 'prohibido',
    codigoDueno: 'SC_AUTOAPROBACION',
  },
};
