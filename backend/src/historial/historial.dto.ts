import { EmpleadoRefDto } from '../auth/empleado.dto';

export class HistorialItemDto {
  idHistorial!: number;
  estadoAnterior!: string | null;
  estadoNuevo!: string;
  usuario!: EmpleadoRefDto;
  /** FechaHora ISO 8601 con zona */
  fecha!: string;
  comentario!: string | null;
}
