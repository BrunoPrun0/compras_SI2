import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import type { CatalogoQuery, ProductoDto } from '../../catalogo/producto.dto';
import { patronContiene } from '../../common/busqueda';
import { Paginado, saltar } from '../../common/paginacion.dto';
import { ProductoInv } from './inventario.entities';

/** Último precio pagado en una OC EMITIDA/COMPLETADA (Inventario no guarda precios). */
const SQL_PRECIO_REFERENCIA = `(
  SELECT d.precio_unitario FROM compras.compras_detalle d
  JOIN compras.compras_oc o ON o.id_oc = d.id_oc
  WHERE d.id_producto = p.id_producto AND o.estado IN ('EMITIDA', 'COMPLETADA')
  ORDER BY o.fecha_emision DESC, d.id_detalle DESC LIMIT 1)`;

interface FilaProducto {
  id_producto: number;
  sku: string;
  nombre_set: string;
  nombre_tema: string;
  cant_piezas: number;
  activo: boolean;
  precio_referencia: number | null;
}

/** ÚNICO punto de acceso al catálogo de Inventario (inv_producto + inv_temas), solo lectura. */
@Injectable()
export class ProductosInventarioService {
  constructor(@InjectRepository(ProductoInv) private readonly repo: Repository<ProductoInv>) {}

  async listar(q: CatalogoQuery): Promise<Paginado<ProductoDto>> {
    const qb = this.base();
    if (q.soloActivos) qb.andWhere('p.activo = true');
    if (q.q?.trim()) {
      qb.andWhere('(p.nombre_set ILIKE :q OR p.sku ILIKE :q OR t.nombre_tema ILIKE :q)', {
        q: patronContiene(q.q.trim()),
      });
    }
    const total = await qb.getCount();
    const filas = await qb
      .orderBy('t.nombre_tema')
      .addOrderBy('p.nombre_set')
      .addOrderBy('p.id_producto')
      .offset(saltar(q))
      .limit(q.pageSize)
      .getRawMany<FilaProducto>();
    return { items: filas.map(aProducto), total, page: q.page, pageSize: q.pageSize };
  }

  /** Productos por id (activos o no). Los ids inexistentes no aparecen en el mapa. */
  async porIds(ids: Iterable<number>, manager?: EntityManager): Promise<Map<number, ProductoDto>> {
    const unicos = [...new Set(ids)];
    if (unicos.length === 0) return new Map();
    const filas = await this.base(manager)
      .where('p.id_producto IN (:...ids)', { ids: unicos })
      .getRawMany<FilaProducto>();
    return new Map(filas.map((f) => [f.id_producto, aProducto(f)]));
  }

  private base(manager?: EntityManager): SelectQueryBuilder<ProductoInv> {
    const repo = manager ? manager.getRepository(ProductoInv) : this.repo;
    return repo
      .createQueryBuilder('p')
      .innerJoin('p.tema', 't')
      .select([
        'p.id_producto AS id_producto',
        'p.sku AS sku',
        'p.nombre_set AS nombre_set',
        't.nombre_tema AS nombre_tema',
        'p.cant_piezas AS cant_piezas',
        'p.activo AS activo',
      ])
      .addSelect(SQL_PRECIO_REFERENCIA, 'precio_referencia');
  }
}

const aProducto = (f: FilaProducto): ProductoDto => ({
  idProducto: f.id_producto,
  sku: f.sku,
  nombre: f.nombre_set,
  coleccion: f.nombre_tema,
  cantPiezas: f.cant_piezas,
  activo: f.activo,
  precioReferencia: f.precio_referencia === null ? null : Number(f.precio_referencia),
});
