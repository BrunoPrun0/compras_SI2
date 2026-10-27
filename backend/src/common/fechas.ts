/**
 * Convención de fechas (docs/decisiones.md §5.1):
 * - Los `timestamp` de compras_* se guardan en UTC (la BD está en GMT y se escriben con now()).
 *   El parser de pg (pg-tipos.ts) los lee como UTC.
 * - Hacia el cliente salen como FechaHora ISO 8601 con el offset de America/Santiago.
 * - Las columnas `date` viajan como texto "AAAA-MM-DD" sin conversión.
 */
export const ZONA_SISTEMA = 'America/Santiago';

const formato = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_SISTEMA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'longOffset',
});

/** `2026-10-26T14:30:00-03:00` */
export function aFechaHora(fecha: Date): string;
export function aFechaHora(fecha: Date | null | undefined): string | null;
export function aFechaHora(fecha: Date | null | undefined): string | null {
  if (!fecha) return null;
  const p = Object.fromEntries(formato.formatToParts(fecha).map((x) => [x.type, x.value]));
  const offset = p.timeZoneName === 'GMT' ? '+00:00' : p.timeZoneName.replace('GMT', '');
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${offset}`;
}

/** Año calendario de la fecha en la zona del sistema. */
export function anioLocal(fecha: Date): number {
  return Number(aFechaHora(fecha).slice(0, 4));
}

/**
 * Expresiones SQL para filtrar un timestamp UTC por fecha local (desde inclusive, hasta inclusive).
 * El parámetro es un "AAAA-MM-DD" ya validado.
 */
export const sqlInicioDiaLocal = (param: string) =>
  `((:${param})::date::timestamp AT TIME ZONE '${ZONA_SISTEMA}') AT TIME ZONE 'UTC'`;
export const sqlFinDiaLocal = (param: string) =>
  `(((:${param})::date + 1)::timestamp AT TIME ZONE '${ZONA_SISTEMA}') AT TIME ZONE 'UTC'`;
