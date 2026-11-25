// Funciones de órdenes de compra (contrato en docs/decisiones.md §5).
// Mientras el backend no tenga los endpoints /ordenes, la pantalla usa datos de ejemplo
// (ordenes.mock.ts) con la misma forma. Con VITE_ORDENES_MOCK=false se usa la API real.
import type {
  EstadoOc,
  LineaDisponible,
  OrdenDetalle,
  OrdenEntrada,
  OrdenResumen,
  Paginado,
  ResultadoResolucion,
} from '../types/api';
import { pedir } from './cliente';
import * as mock from './ordenes.mock';

export interface FiltrosOrdenes {
  page?: number;
  pageSize?: number;
  estado?: EstadoOc | '';
  q?: string;
  idProveedor?: number;
  desde?: string;
  hasta?: string;
}

const real = {
  listarOrdenes: (f: FiltrosOrdenes = {}) =>
    pedir<Paginado<OrdenResumen>>('/ordenes', { query: { ...f } }),

  obtenerOrden: (id: number) => pedir<OrdenDetalle>(`/ordenes/${id}`),

  listarLineasDisponibles: () => pedir<LineaDisponible[]>('/solicitudes/lineas-disponibles'),

  crearOrden: (datos: OrdenEntrada) =>
    pedir<OrdenDetalle>('/ordenes', { metodo: 'POST', cuerpo: datos }),

  actualizarOrden: (id: number, datos: OrdenEntrada) =>
    pedir<OrdenDetalle>(`/ordenes/${id}`, { metodo: 'PATCH', cuerpo: datos }),

  emitirOrden: (id: number) =>
    pedir<OrdenDetalle>(`/ordenes/${id}/emitir`, { metodo: 'POST', cuerpo: {} }),

  cancelarOrden: (id: number, motivo: string) =>
    pedir<OrdenDetalle>(`/ordenes/${id}/cancelar`, { metodo: 'POST', cuerpo: { motivo } }),

  resolverOrden: (id: number, resultado: ResultadoResolucion, comentario: string) =>
    pedir<OrdenDetalle>(`/ordenes/${id}/resolver`, {
      metodo: 'POST',
      cuerpo: { resultado, comentario },
    }),
};

/** true mientras la pantalla muestra datos de ejemplo en vez de la API. */
export const ordenesSimuladas = import.meta.env.VITE_ORDENES_MOCK !== 'false';

const fuente: typeof real = ordenesSimuladas ? mock : real;

export const {
  listarOrdenes,
  obtenerOrden,
  listarLineasDisponibles,
  crearOrden,
  actualizarOrden,
  emitirOrden,
  cancelarOrden,
  resolverOrden,
} = fuente;
