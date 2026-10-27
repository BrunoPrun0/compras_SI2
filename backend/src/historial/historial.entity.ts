import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { TipoDocumento } from '../common/folios';

@Entity({ schema: 'compras', name: 'compras_historial_estado' })
export class HistorialEstado {
  @PrimaryGeneratedColumn('identity', { name: 'id_historial', generatedIdentity: 'ALWAYS' })
  idHistorial!: number;

  @Column({ name: 'tipo_documento', type: 'varchar' })
  tipoDocumento!: TipoDocumento;

  @Column({ name: 'id_documento' })
  idDocumento!: number;

  @Column({ name: 'estado_anterior', type: 'varchar', nullable: true })
  estadoAnterior!: string | null;

  @Column({ name: 'estado_nuevo', type: 'varchar' })
  estadoNuevo!: string;

  @Column({ name: 'id_empleado' })
  idEmpleado!: number;

  @Column({ type: 'timestamp', insert: false, update: false })
  fecha!: Date;

  @Column({ type: 'varchar', nullable: true })
  comentario!: string | null;
}
