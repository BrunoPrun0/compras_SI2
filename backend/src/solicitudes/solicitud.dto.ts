import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { EmpleadoRefDto } from '../auth/empleado.dto';
import { ProductoDto } from '../catalogo/producto.dto';
import { PaginacionQuery, REGEX_FECHA } from '../common/paginacion.dto';
import { recortar } from '../common/transformar';
import { HistorialItemDto } from '../historial/historial.dto';
import { ESTADOS_SC, EstadoSc } from './solicitud.entity';

// ---------- Respuestas (docs/decisiones.md §5.1) ----------

export class LineaScDto {
  idScDetalle!: number;
  producto!: ProductoDto;
  cantidad!: number;
  /** Folio de la OC no cancelada que usa esta línea */
  folioOc!: string | null;
}

export class SolicitudResumenDto {
  idSolicitud!: number;
  folio!: string;
  solicitante!: EmpleadoRefDto;
  /** FechaHora ISO 8601 con zona */
  fechaSolicitud!: string;
  motivo!: string | null;
  estado!: EstadoSc;
  cantidadLineas!: number;
}

export class SolicitudDetalleDto extends SolicitudResumenDto {
  lineas!: LineaScDto[];
  motivoRechazo!: string | null;
  gestor!: EmpleadoRefDto | null;
  fechaResolucion!: string | null;
  historial!: HistorialItemDto[];
}

export class SolicitudPaginadoDto {
  items!: SolicitudResumenDto[];
  total!: number;
  page!: number;
  pageSize!: number;
}

export class DuplicadoScDto {
  idSolicitud!: number;
  folio!: string;
  estado!: EstadoSc;
  producto!: ProductoDto;
  cantidad!: number;
}

// ---------- Entradas ----------

export class LineaScEntradaDto {
  @IsInt()
  @Min(1)
  idProducto!: number;

  /** Unidades (sets), entero > 0 */
  @IsInt()
  @Min(1)
  @Max(100000)
  cantidad!: number;
}

export class CrearSolicitudDto {
  @Transform(recortar)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string | null;

  /** Puede ir vacío mientras la SC esté en BORRADOR */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => LineaScEntradaDto)
  lineas: LineaScEntradaDto[] = [];

  /** V3: true para crear aunque haya SC pendientes/aprobadas con los mismos productos */
  @IsOptional()
  @IsBoolean()
  confirmarDuplicado?: boolean;
}

export class ActualizarSolicitudDto {
  @Transform(recortar)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string | null;

  /** Si viene, reemplaza el conjunto completo de líneas */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => LineaScEntradaDto)
  lineas?: LineaScEntradaDto[];
}

export class EnviarSolicitudDto {
  /** V3: true para enviar aunque haya SC pendientes/aprobadas con los mismos productos */
  @IsOptional()
  @IsBoolean()
  confirmarDuplicado?: boolean;
}

export class ListarSolicitudesQuery extends PaginacionQuery {
  @IsOptional()
  @IsIn(ESTADOS_SC)
  estado?: EstadoSc;

  /** Ignorado para quien solo es SOLICITANTE (ve únicamente las suyas) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idSolicitante?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idProducto?: number;

  /** Fecha AAAA-MM-DD (inclusive, hora de Chile) */
  @IsOptional()
  @Matches(REGEX_FECHA, { message: 'desde debe tener formato AAAA-MM-DD' })
  desde?: string;

  /** Fecha AAAA-MM-DD (inclusive, hora de Chile) */
  @IsOptional()
  @Matches(REGEX_FECHA, { message: 'hasta debe tener formato AAAA-MM-DD' })
  hasta?: string;

  /** Busca en folio o motivo */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class DuplicadosQuery {
  /** Ids de producto separados por coma: `1,2,3` */
  @Transform(({ value }: { value: unknown }) =>
    String(value ?? '')
      .split(',')
      .filter((x) => x.trim() !== '')
      .map((x) => Number(x)),
  )
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  productos!: number[];
}
