import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginacionQuery } from '../common/paginacion.dto';

export class ProductoDto {
  idProducto!: number;
  sku!: string;
  nombre!: string;
  coleccion!: string;
  cantPiezas!: number;
  activo!: boolean;
  /** Último precio unitario pagado en una OC EMITIDA/COMPLETADA; null si nunca se ha comprado */
  precioReferencia!: number | null;
}

export class ProductoPaginadoDto {
  items!: ProductoDto[];
  total!: number;
  page!: number;
  pageSize!: number;
}

export class CatalogoQuery extends PaginacionQuery {
  /** Busca en nombre, SKU o colección */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  /** Por defecto solo productos activos */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  soloActivos: boolean = true;
}
