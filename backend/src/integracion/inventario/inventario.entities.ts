import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

/**
 * Tablas de Inventario (schema `inventario`). SOLO LECTURA: Compras nunca escribe en ellas.
 * Solo se mapean las columnas que usamos (docs/decisiones.md §1.1).
 */
@Entity({ schema: 'inventario', name: 'inv_temas' })
export class TemaInv {
  @PrimaryColumn({ name: 'id_tema' })
  idTema!: number;

  @Column({ name: 'nombre_tema' })
  nombreTema!: string;
}

@Entity({ schema: 'inventario', name: 'inv_producto' })
export class ProductoInv {
  @PrimaryColumn({ name: 'id_producto' })
  idProducto!: number;

  @Column({ name: 'id_tema' })
  idTema!: number;

  @Column()
  sku!: string;

  @Column({ name: 'nombre_set' })
  nombreSet!: string;

  @Column({ name: 'cant_piezas' })
  cantPiezas!: number;

  @Column()
  activo!: boolean;

  @ManyToOne(() => TemaInv)
  @JoinColumn({ name: 'id_tema' })
  tema!: TemaInv;
}
