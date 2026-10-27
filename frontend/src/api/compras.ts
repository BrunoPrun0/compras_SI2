// Funciones por endpoint (contrato en docs/decisiones.md §5).
import type {
  DuplicadoSc,
  EmpleadoRef,
  EstadoProveedor,
  EstadoSc,
  Paginado,
  Producto,
  Proveedor,
  ProveedorEntrada,
  SolicitudDetalle,
  SolicitudEntrada,
  SolicitudResumen,
} from '../types/api';
import { pedir } from './cliente';

interface Pagina {
  page?: number;
  pageSize?: number;
}

// ---------- Empleados y catálogo (lectura de RRHH e Inventario) ----------

export const listarEmpleados = (q?: string) => pedir<EmpleadoRef[]>('/empleados', { query: { q } });

export const listarProductos = (f: Pagina & { q?: string; soloActivos?: boolean } = {}) =>
  pedir<Paginado<Producto>>('/catalogo/productos', { query: { ...f } });

// ---------- Proveedores ----------

export const listarProveedores = (f: Pagina & { q?: string; estado?: EstadoProveedor | '' } = {}) =>
  pedir<Paginado<Proveedor>>('/proveedores', { query: { ...f } });

export const crearProveedor = (datos: ProveedorEntrada) =>
  pedir<Proveedor>('/proveedores', { metodo: 'POST', cuerpo: datos });

export const actualizarProveedor = (id: number, datos: Partial<ProveedorEntrada>) =>
  pedir<Proveedor>(`/proveedores/${id}`, { metodo: 'PATCH', cuerpo: datos });

export const cambiarEstadoProveedor = (id: number, estado: EstadoProveedor) =>
  pedir<Proveedor>(`/proveedores/${id}/estado`, { metodo: 'PATCH', cuerpo: { estado } });

// ---------- Solicitudes de compra ----------

export interface FiltrosSolicitudes extends Pagina {
  estado?: EstadoSc | '';
  q?: string;
  idSolicitante?: number;
  desde?: string;
  hasta?: string;
}

export const listarSolicitudes = (f: FiltrosSolicitudes = {}) =>
  pedir<Paginado<SolicitudResumen>>('/solicitudes', { query: { ...f } });

export const obtenerSolicitud = (id: number) => pedir<SolicitudDetalle>(`/solicitudes/${id}`);

export const buscarDuplicados = (idsProducto: number[]) =>
  pedir<DuplicadoSc[]>('/solicitudes/duplicados', { query: { productos: idsProducto.join(',') } });

export const crearSolicitud = (datos: SolicitudEntrada, confirmarDuplicado = false) =>
  pedir<SolicitudDetalle>('/solicitudes', {
    metodo: 'POST',
    cuerpo: { ...datos, ...(confirmarDuplicado ? { confirmarDuplicado: true } : {}) },
  });

export const actualizarSolicitud = (id: number, datos: SolicitudEntrada) =>
  pedir<SolicitudDetalle>(`/solicitudes/${id}`, { metodo: 'PATCH', cuerpo: datos });

export const enviarSolicitud = (id: number, confirmarDuplicado = false) =>
  pedir<SolicitudDetalle>(`/solicitudes/${id}/enviar`, {
    metodo: 'POST',
    cuerpo: confirmarDuplicado ? { confirmarDuplicado: true } : {},
  });

export const anularSolicitud = (id: number) =>
  pedir<SolicitudDetalle>(`/solicitudes/${id}/anular`, { metodo: 'POST', cuerpo: {} });
