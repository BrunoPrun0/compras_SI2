import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { Entorno } from '../common/config';
import type { EmpleadoRef } from './roles';

/**
 * ÚNICO punto de acceso a la tabla de empleados de RRHH (solo lectura).
 *
 * RRHH aún no publica su tabla (schema `rrhh` vacío al 27/10/2026); mientras tanto se usa
 * `logistica.test_log_rrhh_empleado`. La tabla se fija con RRHH_EMPLEADO_TABLE (validada como
 * `schema.tabla` al arrancar, nunca viene del usuario). Columnas usadas: id_empleado, nombre.
 * Si RRHH cambia las columnas, se ajusta solo este archivo.
 */
@Injectable()
export class EmpleadosRepository {
  private readonly tabla: string;

  constructor(
    private readonly ds: DataSource,
    config: ConfigService<Entorno, true>,
  ) {
    const [schema, tabla] = config.get('RRHH_EMPLEADO_TABLE', { infer: true }).split('.');
    this.tabla = `"${schema}"."${tabla}"`;
  }

  async buscar(q?: string, limite = 50): Promise<EmpleadoRef[]> {
    const filas: { id_empleado: number; nombre: string }[] = await this.ds.query(
      `SELECT id_empleado, nombre FROM ${this.tabla}
       WHERE $1::text IS NULL OR nombre ILIKE '%' || $1 || '%' OR id_empleado::text = $1
       ORDER BY nombre LIMIT $2`,
      [q?.trim() || null, limite],
    );
    return filas.map(aRef);
  }

  async porId(id: number): Promise<EmpleadoRef | null> {
    const filas: { id_empleado: number; nombre: string }[] = await this.ds.query(
      `SELECT id_empleado, nombre FROM ${this.tabla} WHERE id_empleado = $1`,
      [id],
    );
    return filas.length ? aRef(filas[0]) : null;
  }

  /** Mapa id → EmpleadoRef. Ids sin registro en RRHH quedan como "Empleado <id>". */
  async porIds(ids: Iterable<number>): Promise<Map<number, EmpleadoRef>> {
    const unicos = [...new Set(ids)];
    const mapa = new Map<number, EmpleadoRef>(
      unicos.map((id) => [id, { idEmpleado: id, nombre: `Empleado ${id}` }]),
    );
    if (unicos.length === 0) return mapa;
    const filas: { id_empleado: number; nombre: string }[] = await this.ds.query(
      `SELECT id_empleado, nombre FROM ${this.tabla} WHERE id_empleado = ANY($1::int[])`,
      [unicos],
    );
    for (const f of filas) mapa.set(f.id_empleado, aRef(f));
    return mapa;
  }
}

const aRef = (f: { id_empleado: number; nombre: string }): EmpleadoRef => ({
  idEmpleado: f.id_empleado,
  nombre: f.nombre,
});
