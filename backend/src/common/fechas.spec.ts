import { aFechaHora } from './fechas';
import { generarFolio } from './folios';

describe('fechas y folios', () => {
  it('formatea en America/Santiago con offset de invierno y verano', () => {
    expect(aFechaHora(new Date('2026-07-15T18:30:00Z'))).toBe('2026-07-15T14:30:00-04:00');
    expect(aFechaHora(new Date('2026-10-26T17:30:00Z'))).toBe('2026-10-26T14:30:00-03:00');
    expect(aFechaHora(null)).toBeNull();
  });

  it('folio usa el año local, no el de UTC', () => {
    // 1 de enero 02:00 UTC = 31 de diciembre 23:00 en Chile
    expect(generarFolio('SC', new Date('2027-01-01T02:00:00Z'), 7)).toBe('SC-2026-00007');
    expect(generarFolio('OC', new Date('2026-10-26T15:00:00Z'), 123)).toBe('OC-2026-00123');
  });
});
