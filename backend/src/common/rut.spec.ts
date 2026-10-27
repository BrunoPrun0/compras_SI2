import { calcularDv, normalizarRut } from './rut';

describe('V1: RUT chileno', () => {
  it.each([
    ['12345678', '5'],
    ['11111111', '1'],
    ['77845310', 'K'],
    ['76111222', '8'],
    ['96730582', '0'],
  ])('DV de %s es %s', (cuerpo, dv) => {
    expect(calcularDv(cuerpo)).toBe(dv);
  });

  it.each([
    ['12.345.678-5', '12345678-5'],
    ['12345678-5', '12345678-5'],
    ['123456785', '12345678-5'],
    [' 77.845.310-k ', '77845310-K'],
    ['1-9', '1-9'],
  ])('normaliza %p → %p', (entrada, esperado) => {
    expect(normalizarRut(entrada)).toBe(esperado);
  });

  it.each(['12.345.678-9', '12345678-K', '', 'abc', '123456789-5', '0-0', '12.345.678-'])(
    'rechaza %p',
    (entrada) => {
      expect(normalizarRut(entrada)).toBeNull();
    },
  );
});
