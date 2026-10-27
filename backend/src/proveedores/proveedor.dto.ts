import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaginacionQuery } from '../common/paginacion.dto';
import { recortar } from '../common/transformar';
import type { EstadoOc } from '../ordenes/orden.entity';
import type { EstadoProveedor } from './proveedor.entity';

const ESTADOS_PROVEEDOR = ['ACTIVO', 'INACTIVO'] as const;

export class ProveedorDto {
  idProveedor!: number;
  /** RUT normalizado: sin puntos y con guion (76123456-0) */
  rutNit!: string;
  razonSocial!: string;
  email!: string | null;
  telefono!: string | null;
  direccion!: string | null;
  estado!: EstadoProveedor;
}

export class ResumenOcProveedorDto {
  /** Cantidad de OC del proveedor por estado */
  cantidadPorEstado!: Record<EstadoOc, number>;
  /** Σ total de OC EMITIDA/COMPLETADA (CLP) */
  montoComprado!: number;
  /** Fecha de la última OC emitida (FechaHora) */
  ultimaEmision!: string | null;
}

export class ProveedorDetalleDto extends ProveedorDto {
  resumenOc!: ResumenOcProveedorDto;
}

export class ProveedorPaginadoDto {
  items!: ProveedorDto[];
  total!: number;
  page!: number;
  pageSize!: number;
}

export class CrearProveedorDto {
  /** RUT chileno; se acepta con o sin puntos y guion (V1) */
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  rutNit!: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  razonSocial!: string;

  @Transform(recortar)
  @IsOptional()
  @IsEmail({}, { message: 'email no es un correo válido' })
  @MaxLength(120)
  email?: string | null;

  @Transform(recortar)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string | null;

  @Transform(recortar)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccion?: string | null;
}

/** Edición parcial: solo se cambian los campos enviados; email/teléfono/dirección aceptan null. */
export class ActualizarProveedorDto {
  @Transform(recortar)
  @ValidateIf((o: ActualizarProveedorDto) => o.rutNit !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  rutNit?: string;

  @Transform(recortar)
  @ValidateIf((o: ActualizarProveedorDto) => o.razonSocial !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  razonSocial?: string;

  @Transform(recortar)
  @IsOptional()
  @IsEmail({}, { message: 'email no es un correo válido' })
  @MaxLength(120)
  email?: string | null;

  @Transform(recortar)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string | null;

  @Transform(recortar)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccion?: string | null;
}

export class CambiarEstadoProveedorDto {
  @IsIn(ESTADOS_PROVEEDOR)
  estado!: EstadoProveedor;
}

export class ListarProveedoresQuery extends PaginacionQuery {
  /** Busca en razón social o RUT (con o sin puntos) */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(ESTADOS_PROVEEDOR)
  estado?: EstadoProveedor;
}
