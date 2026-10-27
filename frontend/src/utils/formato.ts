// Formatos de presentación (CLP, fechas en hora de Chile, RUT).

const ZONA = 'America/Santiago';

const formatoClp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export const clp = (monto: number | null | undefined) =>
  monto === null || monto === undefined ? '—' : formatoClp.format(monto);

const formatoFechaHora = new Intl.DateTimeFormat('es-CL', {
  timeZone: ZONA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const formatoFecha = new Intl.DateTimeFormat('es-CL', {
  timeZone: ZONA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export const fechaHora = (iso: string | null | undefined) =>
  iso ? formatoFechaHora.format(new Date(iso)) : '—';

export const fecha = (iso: string | null | undefined) =>
  iso ? formatoFecha.format(new Date(iso)) : '—';

/** Dígito verificador (módulo 11). Misma regla que el backend (V1). */
function calcularDv(cuerpo: string): string {
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  return resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
}

/** true si el RUT tiene formato y dígito verificador válidos (con o sin puntos/guion). */
export function rutValido(entrada: string): boolean {
  const limpio = entrada.replace(/[.\s]/g, '').toUpperCase();
  const m = /^(\d{1,8})-?([\dK])$/.exec(limpio);
  if (!m) return false;
  const cuerpo = m[1].replace(/^0+/, '');
  return cuerpo.length > 0 && calcularDv(cuerpo) === m[2];
}

/** "76123456-0" → "76.123.456-0" */
export function rutConPuntos(rut: string): string {
  const [cuerpo, dv] = rut.split('-');
  if (!dv) return rut;
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}
