import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BuscarEmpleadosQuery, EmpleadoRefDto } from './empleado.dto';
import { EmpleadosRepository } from './empleados.repository';
import { EmpleadoRef, Publico } from './roles';

@ApiTags('empleados')
@Controller('empleados')
export class EmpleadosController {
  constructor(private readonly empleados: EmpleadosRepository) {}

  /** En Sprint 2 es público: alimenta el selector de usuario (no hay login). */
  @Get()
  @Publico()
  @ApiOperation({ summary: 'Empleados de RRHH (selector de usuario y filtros por solicitante)' })
  @ApiOkResponse({ type: [EmpleadoRefDto] })
  buscar(@Query() query: BuscarEmpleadosQuery): Promise<EmpleadoRef[]> {
    return this.empleados.buscar(query.q);
  }
}
