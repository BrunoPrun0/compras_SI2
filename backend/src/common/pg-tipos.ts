import { defaults, types } from 'pg';

/**
 * Parsers de node-postgres. Se registran una vez al arrancar (main.ts), antes de abrir la conexión.
 */
export function configurarTiposPg(): void {
  // timestamp sin zona: se guarda en UTC (ver common/fechas.ts)
  types.setTypeParser(types.builtins.TIMESTAMP, (v) => new Date(`${v.replace(' ', 'T')}Z`));
  // date: se deja como "AAAA-MM-DD" para no correr el día por la zona del proceso
  types.setTypeParser(types.builtins.DATE, (v) => v);
  // numeric: montos CLP y cantidades caben de sobra en un number
  types.setTypeParser(types.builtins.NUMERIC, (v) => Number(v));
  types.setTypeParser(types.builtins.INT8, (v) => Number(v));
  // Fechas JS enviadas como parámetro se serializan en UTC
  defaults.parseInputDatesAsUTC = true;
}
