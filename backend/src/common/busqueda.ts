/**
 * Patrón `%texto%` para ILIKE con los comodines del usuario escapados: buscar "%" o "_" busca
 * ese carácter literal y no "cualquier cosa". Usa el escape por defecto de LIKE en Postgres (`\`).
 */
export function patronContiene(texto: string): string {
  return `%${texto.replace(/[\\%_]/g, '\\$&')}%`;
}
