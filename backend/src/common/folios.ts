import { anioLocal } from './fechas';

export type TipoDocumento = 'SC' | 'OC';

/** Folio `SC-AAAA-NNNNN` / `OC-AAAA-NNNNN`: año local de creación + id con ceros a la izquierda. */
export function generarFolio(tipo: TipoDocumento, fechaCreacion: Date, id: number): string {
  return `${tipo}-${anioLocal(fechaCreacion)}-${String(id).padStart(5, '0')}`;
}
