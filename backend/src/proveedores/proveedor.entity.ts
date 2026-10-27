import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type EstadoProveedor = 'ACTIVO' | 'INACTIVO';

@Entity({ schema: 'compras', name: 'compras_proveedor' })
export class Proveedor {
  @PrimaryGeneratedColumn('identity', { name: 'id_proveedor', generatedIdentity: 'ALWAYS' })
  idProveedor!: number;

  /** RUT normalizado sin puntos y con guion (V1) */
  @Column({ name: 'rut_nit' })
  rutNit!: string;

  @Column({ name: 'razon_social' })
  razonSocial!: string;

  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', nullable: true })
  telefono!: string | null;

  @Column({ type: 'varchar', nullable: true })
  direccion!: string | null;

  @Column({ type: 'varchar' })
  estado!: EstadoProveedor;
}
