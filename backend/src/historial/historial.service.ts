import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { EmpleadosRepository } from '../auth/empleados.repository';
import { aFechaHora } from '../common/fechas';
import type { TipoDocumento } from '../common/folios';
import { HistorialItemDto } from './historial.dto';
import { HistorialEstado } from './historial.entity';

export interface NuevoHistorial {
  tipo: TipoDocumento;
  idDocumento: number;
  estadoAnterior: string | null;
  estadoNuevo: string;
  idEmpleado: number;
  comentario?: string | null;
}

@Injectable()
export class HistorialService {
  constructor(private readonly empleados: EmpleadosRepository) {}

  /** Se llama SIEMPRE con el manager de la transacción que cambia el estado. */
  async registrar(manager: EntityManager, h: NuevoHistorial): Promise<void> {
    await manager.insert(HistorialEstado, {
      tipoDocumento: h.tipo,
      idDocumento: h.idDocumento,
      estadoAnterior: h.estadoAnterior,
      estadoNuevo: h.estadoNuevo,
      idEmpleado: h.idEmpleado,
      comentario: h.comentario ?? null,
    });
  }

  async listar(
    manager: EntityManager,
    tipo: TipoDocumento,
    idDocumento: number,
  ): Promise<HistorialItemDto[]> {
    const filas = await manager.find(HistorialEstado, {
      where: { tipoDocumento: tipo, idDocumento },
      order: { fecha: 'ASC', idHistorial: 'ASC' },
    });
    const empleados = await this.empleados.porIds(filas.map((f) => f.idEmpleado));
    return filas.map((f) => ({
      idHistorial: f.idHistorial,
      estadoAnterior: f.estadoAnterior,
      estadoNuevo: f.estadoNuevo,
      usuario: empleados.get(f.idEmpleado)!,
      fecha: aFechaHora(f.fecha),
      comentario: f.comentario,
    }));
  }
}
