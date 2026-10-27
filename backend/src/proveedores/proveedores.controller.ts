import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles';
import { Paginado } from '../common/paginacion.dto';
import {
  ActualizarProveedorDto,
  CambiarEstadoProveedorDto,
  CrearProveedorDto,
  ListarProveedoresQuery,
  ProveedorDetalleDto,
  ProveedorDto,
  ProveedorPaginadoDto,
} from './proveedor.dto';
import { ProveedoresService } from './proveedores.service';

@ApiTags('proveedores')
@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly service: ProveedoresService) {}

  @Get()
  @Roles('COMPRADOR', 'GESTOR_SC', 'ADMIN')
  @ApiOperation({ summary: 'Listado de proveedores con filtros' })
  @ApiOkResponse({ type: ProveedorPaginadoDto })
  listar(@Query() query: ListarProveedoresQuery): Promise<Paginado<ProveedorDto>> {
    return this.service.listar(query);
  }

  @Get(':id')
  @Roles('COMPRADOR', 'GESTOR_SC', 'ADMIN')
  @ApiOperation({ summary: 'Detalle del proveedor + resumen de sus OC' })
  @ApiOkResponse({ type: ProveedorDetalleDto })
  detalle(@Param('id', ParseIntPipe) id: number): Promise<ProveedorDetalleDto> {
    return this.service.detalle(id);
  }

  @Post()
  @Roles('COMPRADOR', 'ADMIN')
  @ApiOperation({ summary: 'Crear proveedor (V1: RUT válido y único)' })
  @ApiCreatedResponse({ type: ProveedorDto })
  crear(@Body() dto: CrearProveedorDto): Promise<ProveedorDto> {
    return this.service.crear(dto);
  }

  @Patch(':id')
  @Roles('COMPRADOR', 'ADMIN')
  @ApiOperation({ summary: 'Editar datos del proveedor (V1 si cambia el RUT)' })
  @ApiOkResponse({ type: ProveedorDto })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarProveedorDto,
  ): Promise<ProveedorDto> {
    return this.service.actualizar(id, dto);
  }

  @Patch(':id/estado')
  @Roles('COMPRADOR', 'ADMIN')
  @ApiOperation({ summary: 'Activar / desactivar proveedor' })
  @ApiOkResponse({ type: ProveedorDto })
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoProveedorDto,
  ): Promise<ProveedorDto> {
    return this.service.cambiarEstado(id, dto.estado);
  }
}
