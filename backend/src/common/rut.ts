/**
 * V1: RUT chileno. Formato canónico guardado en BD: cuerpo sin puntos + guion + DV en mayúscula
 * (`76123456-0`, `12345678-K`).
 */

/** Dígito verificador por módulo 11. */
export function calcularDv(cuerpo: string): string {
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

/**
 * Normaliza (quita puntos y espacios, DV en mayúscula, agrega el guion) y valida el DV.
 * Devuelve `null` si el RUT no es válido.
 */
export function normalizarRut(entrada: string): string | null {
  const limpio = entrada.replace(/[.\s]/g, '').toUpperCase();
  const m = /^(\d{1,8})-?([\dK])$/.exec(limpio);
  if (!m) return null;
  const cuerpo = m[1].replace(/^0+/, '');
  if (cuerpo.length === 0) return null;
  return calcularDv(cuerpo) === m[2] ? `${cuerpo}-${m[2]}` : null;
}
