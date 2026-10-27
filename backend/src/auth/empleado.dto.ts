import { IsOptional, IsString, MaxLength } from 'class-validator';

export class EmpleadoRefDto {
  idEmpleado!: number;
  nombre!: string;
}

export class BuscarEmpleadosQuery {
  /** Texto en el nombre o id exacto */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
