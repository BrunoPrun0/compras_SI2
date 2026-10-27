import { ErrorDominio } from '../common/errores';
import { productosRepetidos, revisarEnvio, validarLineasUnicas } from './sc.reglas';

const catalogo = new Map([
  [1, { activo: true }],
  [2, { activo: true }],
  [3, { activo: false }],
]);

describe('V2: SC no se envía incompleta', () => {
  it('completa → null', () => {
    expect(revisarEnvio('Reposición', [{ idProducto: 1, cantidad: 2 }], catalogo)).toBeNull();
  });

  it('sin motivo ni líneas', () => {
    expect(revisarEnvio('   ', [], catalogo)?.faltantes).toEqual(['motivo', 'lineas']);
    expect(revisarEnvio(null, [], catalogo)?.faltantes).toEqual(['motivo', 'lineas']);
  });

  it('cantidades no positivas, productos inactivos e inexistentes', () => {
    const p = revisarEnvio(
      'ok',
      [
        { idProducto: 1, cantidad: 0 },
        { idProducto: 3, cantidad: 1 },
        { idProducto: 99, cantidad: 1 },
      ],
      catalogo,
    );
    expect(p).toEqual({
      faltantes: [],
      cantidadesInvalidas: [1],
      productosInactivos: [3],
      productosInexistentes: [99],
    });
  });
});

describe('líneas únicas por producto', () => {
  it('detecta repetidos', () => {
    expect(
      productosRepetidos([
        { idProducto: 1, cantidad: 1 },
        { idProducto: 2, cantidad: 1 },
        { idProducto: 1, cantidad: 3 },
      ]),
    ).toEqual([1]);
  });

  it('lanza VALIDACION', () => {
    expect(() =>
      validarLineasUnicas([
        { idProducto: 2, cantidad: 1 },
        { idProducto: 2, cantidad: 1 },
      ]),
    ).toThrow(ErrorDominio);
    expect(() => validarLineasUnicas([{ idProducto: 2, cantidad: 1 }])).not.toThrow();
  });
});
