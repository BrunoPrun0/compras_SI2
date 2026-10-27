import { ErrorDominio } from '../common/errores';

export interface LineaEntrada {
  idProducto: number;
  cantidad: number;
}

export interface ProblemasEnvio {
  /** Campos obligatorios ausentes: `motivo`, `lineas` */
  faltantes: string[];
  /** idProducto de líneas con cantidad ≤ 0 */
  cantidadesInvalidas: number[];
  productosInactivos: number[];
  productosInexistentes: number[];
}

/** Ids de producto que aparecen más de una vez en las líneas. */
export function productosRepetidos(lineas: LineaEntrada[]): number[] {
  const vistos = new Set<number>();
  const repetidos = new Set<number>();
  for (const l of lineas) (vistos.has(l.idProducto) ? repetidos : vistos).add(l.idProducto);
  return [...repetidos];
}

/** Una SC no puede tener dos líneas del mismo producto (en cualquier estado). */
export function validarLineasUnicas(lineas: LineaEntrada[]): void {
  const repetidos = productosRepetidos(lineas);
  if (repetidos.length) {
    throw new ErrorDominio(
      'VALIDACION',
      'Hay productos repetidos en las líneas; suma las cantidades en una sola línea',
      {
        productosRepetidos: repetidos,
      },
    );
  }
}

/**
 * V2: condiciones para enviar una SC (BORRADOR → PENDIENTE).
 * Devuelve null si está completa.
 */
export function revisarEnvio(
  motivo: string | null,
  lineas: LineaEntrada[],
  productos: Map<number, { activo: boolean }>,
): ProblemasEnvio | null {
  const problemas: ProblemasEnvio = {
    faltantes: [],
    cantidadesInvalidas: [],
    productosInactivos: [],
    productosInexistentes: [],
  };
  if (!motivo?.trim()) problemas.faltantes.push('motivo');
  if (lineas.length === 0) problemas.faltantes.push('lineas');
  for (const l of lineas) {
    if (!Number.isInteger(l.cantidad) || l.cantidad <= 0)
      problemas.cantidadesInvalidas.push(l.idProducto);
    const p = productos.get(l.idProducto);
    if (!p) problemas.productosInexistentes.push(l.idProducto);
    else if (!p.activo) problemas.productosInactivos.push(l.idProducto);
  }
  const hayProblemas = Object.values(problemas).some((v: unknown[]) => v.length > 0);
  return hayProblemas ? problemas : null;
}

export function mensajeEnvio(p: ProblemasEnvio): string {
  const partes: string[] = [];
  if (p.faltantes.includes('motivo')) partes.push('falta el motivo');
  if (p.faltantes.includes('lineas')) partes.push('debe tener al menos una línea');
  if (p.cantidadesInvalidas.length) partes.push('hay cantidades que no son mayores a 0');
  if (p.productosInactivos.length) partes.push('hay productos inactivos');
  if (p.productosInexistentes.length) partes.push('hay productos que no existen en el catálogo');
  return `La solicitud no se puede enviar: ${partes.join(', ')}`;
}
