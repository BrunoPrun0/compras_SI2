// Tipos del contrato de la API (docs/decisiones.md §5.1). Deben coincidir con los DTO del backend.

export type EstadoSc = 'BORRADOR' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'ANULADA';
export type EstadoOc = 'BORRADOR' | 'EMITIDA' | 'COMPLETADA' | 'CON_PROBLEMAS' | 'CANCELADA';
export type EstadoProveedor = 'ACTIVO' | 'INACTIVO';

/** "AAAA-MM-DD" */
export type Fecha = string;
/** ISO 8601 con zona: "2026-10-26T14:30:00-03:00" */
export type FechaHora = string;

export interface EmpleadoRef {
  idEmpleado: number;
  nombre: string;
}

export interface Producto {
  idProducto: number;
  sku: string;
  nombre: string;
  coleccion: string;
  cantPiezas: number;
  activo: boolean;
  precioReferencia: number | null;
}

export interface Proveedor {
  idProveedor: number;
  rutNit: string;
  razonSocial: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  estado: EstadoProveedor;
}

export interface LineaSc {
  idScDetalle: number;
  producto: Producto;
  cantidad: number;
  folioOc: string | null;
}

export interface HistorialItem {
  idHistorial: number;
  estadoAnterior: string | null;
  estadoNuevo: string;
  usuario: EmpleadoRef;
  fecha: FechaHora;
  comentario: string | null;
}

export interface SolicitudResumen {
  idSolicitud: number;
  folio: string;
  solicitante: EmpleadoRef;
  fechaSolicitud: FechaHora;
  motivo: string | null;
  estado: EstadoSc;
  cantidadLineas: number;
}

export interface SolicitudDetalle extends SolicitudResumen {
  lineas: LineaSc[];
  motivoRechazo: string | null;
  gestor: EmpleadoRef | null;
  fechaResolucion: FechaHora | null;
  historial: HistorialItem[];
}

export interface DuplicadoSc {
  idSolicitud: number;
  folio: string;
  estado: EstadoSc;
  producto: Producto;
  cantidad: number;
}

export interface Paginado<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------- Entradas ----------

export interface LineaEntrada {
  idProducto: number;
  cantidad: number;
}

export interface ProveedorEntrada {
  rutNit: string;
  razonSocial: string;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
}

export interface SolicitudEntrada {
  motivo?: string | null;
  lineas: LineaEntrada[];
}
