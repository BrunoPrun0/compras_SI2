import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

export const ESTADOS_SC = ['BORRADOR', 'PENDIENTE', 'APROBADA', 'RECHAZADA', 'ANULADA'] as const;
export type EstadoSc = (typeof ESTADOS_SC)[number];

@Entity({ schema: 'compras', name: 'compras_sc' })
export class Solicitud {
  @PrimaryGeneratedColumn('identity', { name: 'id_solicitud', generatedIdentity: 'ALWAYS' })
  idSolicitud!: number;

  @Column({ type: 'varchar', nullable: true })
  folio!: string | null;

  /** Solicitante (dueño de la SC) */
  @Column({ name: 'id_empleado' })
  idEmpleado!: number;

  @Column({ name: 'fecha_solicitud', type: 'timestamp', insert: false, update: false })
  fechaSolicitud!: Date;

  @Column({ type: 'varchar', nullable: true })
  motivo!: string | null;

  @Column({ type: 'varchar' })
  estado!: EstadoSc;

  @Column({ name: 'motivo_rechazo', type: 'varchar', nullable: true })
  motivoRechazo!: string | null;

  @Column({ name: 'id_gestor', type: 'int', nullable: true })
  idGestor!: number | null;

  @Column({ name: 'fecha_resolucion', type: 'timestamp', nullable: true })
  fechaResolucion!: Date | null;

  @OneToMany(() => SolicitudDetalle, (d) => d.solicitud)
  lineas!: SolicitudDetalle[];
}

@Entity({ schema: 'compras', name: 'compras_sc_detalle' })
export class SolicitudDetalle {
  @PrimaryGeneratedColumn('identity', { name: 'id_sc_detalle', generatedIdentity: 'ALWAYS' })
  idScDetalle!: number;

  @Column({ name: 'id_solicitud' })
  idSolicitud!: number;

  @Column({ name: 'id_producto' })
  idProducto!: number;

  @Column({ type: 'int' })
  cantidad!: number;

  @ManyToOne(() => Solicitud, (s) => s.lineas)
  @JoinColumn({ name: 'id_solicitud' })
  solicitud!: Solicitud;
}
