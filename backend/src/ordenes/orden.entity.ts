import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

export const ESTADOS_OC = [
  'BORRADOR',
  'EMITIDA',
  'COMPLETADA',
  'CON_PROBLEMAS',
  'CANCELADA',
] as const;
export type EstadoOc = (typeof ESTADOS_OC)[number];

@Entity({ schema: 'compras', name: 'compras_oc' })
export class OrdenCompra {
  @PrimaryGeneratedColumn('identity', { name: 'id_oc', generatedIdentity: 'ALWAYS' })
  idOc!: number;

  @Column({ type: 'varchar', nullable: true })
  folio!: string | null;

  @Column({ name: 'id_proveedor' })
  idProveedor!: number;

  /** Comprador */
  @Column({ name: 'id_empleado' })
  idEmpleado!: number;

  @Column({ type: 'varchar' })
  estado!: EstadoOc;

  @Column({ name: 'fecha_creacion', type: 'timestamp', insert: false, update: false })
  fechaCreacion!: Date;

  @Column({ name: 'fecha_emision', type: 'timestamp', nullable: true })
  fechaEmision!: Date | null;

  @Column({ name: 'fecha_entrega_esperada', type: 'date', nullable: true })
  fechaEntregaEsperada!: string | null;

  @Column({ name: 'fecha_recepcion_real', type: 'date', nullable: true })
  fechaRecepcionReal!: string | null;

  @Column({ type: 'numeric' })
  subtotal!: number;

  @Column({ type: 'numeric' })
  impuesto!: number;

  @Column({ type: 'numeric' })
  total!: number;

  @Column({ name: 'motivo_cancelacion', type: 'varchar', nullable: true })
  motivoCancelacion!: string | null;

  @OneToMany(() => OrdenDetalle, (d) => d.orden)
  lineas!: OrdenDetalle[];
}

@Entity({ schema: 'compras', name: 'compras_detalle' })
export class OrdenDetalle {
  @PrimaryGeneratedColumn('identity', { name: 'id_detalle', generatedIdentity: 'ALWAYS' })
  idDetalle!: number;

  @Column({ name: 'id_oc' })
  idOc!: number;

  /** Línea de SC que respalda esta línea (V7) */
  @Column({ name: 'id_sc_detalle' })
  idScDetalle!: number;

  @Column({ name: 'id_producto' })
  idProducto!: number;

  @Column({ type: 'int' })
  cantidad!: number;

  @Column({ name: 'precio_unitario', type: 'numeric' })
  precioUnitario!: number;

  /** Columna generada en BD (cantidad × precio_unitario) */
  @Column({ name: 'subtotal_linea', type: 'numeric', insert: false, update: false })
  subtotalLinea!: number;

  @ManyToOne(() => OrdenCompra, (o) => o.lineas)
  @JoinColumn({ name: 'id_oc' })
  orden!: OrdenCompra;
}
