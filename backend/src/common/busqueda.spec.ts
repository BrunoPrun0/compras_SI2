import { patronContiene } from './busqueda';

describe('patronContiene', () => {
  it.each([
    ['gómez', '%gómez%'],
    ['%', '%\\%%'],
    ['a_b', '%a\\_b%'],
    ['c:\\x', '%c:\\\\x%'],
  ])('%p → %p', (texto, esperado) => {
    expect(patronContiene(texto)).toBe(esperado);
  });
});
