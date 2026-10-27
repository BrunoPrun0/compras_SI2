/** Para `@Transform`: quita espacios y convierte "" en null (campo vaciado). */
export const recortar = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const v = value.trim();
  return v === '' ? null : v;
};
