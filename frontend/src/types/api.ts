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

// ---------- Órdenes de compra ----------

export interface LineaOc {
  idDetalle: number;
  idScDetalle: number;
  folioSc: string;
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
  subtotalLinea: number;
}

export interface OrdenResumen {
  idOc: number;
  folio: string;
  proveedor: Pick<Proveedor, 'idProveedor' | 'rutNit' | 'razonSocial'>;
  comprador: EmpleadoRef;
  estado: EstadoOc;
  fechaCreacion: FechaHora;
  fechaEmision: FechaHora | null;
  fechaEntregaEsperada: Fecha | null;
  total: number;
}

export interface OrdenDetalle extends OrdenResumen {
  lineas: LineaOc[];
  subtotal: number;
  impuesto: number;
  fechaRecepcionReal: Fecha | null;
  motivoCancelacion: string | null;
  historial: HistorialItem[];
}

/** Línea de SC APROBADA que todavía no está en una OC activa (para armar una OC). */
export interface LineaDisponible {
  idScDetalle: number;
  folioSc: string;
  solicitante: EmpleadoRef;
  producto: Producto;
  cantidadSolicitada: number;
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

export interface OrdenEntrada {
  idProveedor: number;
  fechaEntregaEsperada: Fecha;
  lineas: { idScDetalle: number; cantidad: number; precioUnitario: number }[];
}

export type ResultadoResolucion = 'COMPLETADA' | 'CANCELADA';
