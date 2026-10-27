import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles, Usuario, UsuarioAutenticado } from '../auth/roles';
import { Paginado } from '../common/paginacion.dto';
import {
  ActualizarSolicitudDto,
  CrearSolicitudDto,
  DuplicadoScDto,
  DuplicadosQuery,
  EnviarSolicitudDto,
  ListarSolicitudesQuery,
  SolicitudDetalleDto,
  SolicitudPaginadoDto,
  SolicitudResumenDto,
} from './solicitud.dto';
import { SolicitudesService } from './solicitudes.service';

@ApiTags('solicitudes')
@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly service: SolicitudesService) {}

  @Get()
  @Roles('SOLICITANTE')
  @ApiOperation({ summary: 'Listado con filtros (SOLICITANTE ve solo las suyas)' })
  @ApiOkResponse({ type: SolicitudPaginadoDto })
  listar(
    @Query() query: ListarSolicitudesQuery,
    @Usuario() usuario: UsuarioAutenticado,
  ): Promise<Paginado<SolicitudResumenDto>> {
    return this.service.listar(query, usuario);
  }

  @Get('duplicados')
  @Roles('SOLICITANTE')
  @ApiOperation({ summary: 'V3: SC PENDIENTE / APROBADA sin OC que incluyen esos productos' })
  @ApiOkResponse({ type: [DuplicadoScDto] })
  duplicados(@Query() query: DuplicadosQuery): Promise<DuplicadoScDto[]> {
    return this.service.duplicados(query.productos);
  }

  @Get(':id')
  @Roles('SOLICITANTE')
  @ApiOperation({
    summary: 'Detalle: cabecera + líneas + historial (dueño, GESTOR_SC, COMPRADOR, ADMIN)',
  })
  @ApiOkResponse({ type: SolicitudDetalleDto })
  detalle(
    @Param('id', ParseIntPipe) id: number,
    @Usuario() usuario: UsuarioAutenticado,
  ): Promise<SolicitudDetalleDto> {
    return this.service.detalle(id, usuario);
  }

  @Post()
  @Roles('SOLICITANTE')
  @ApiOperation({
    summary: 'Crear SC en BORRADOR (V3: 409 SC_POSIBLE_DUPLICADO salvo confirmarDuplicado)',
  })
  @ApiCreatedResponse({ type: SolicitudDetalleDto })
  crear(
    @Body() dto: CrearSolicitudDto,
    @Usuario() usuario: UsuarioAutenticado,
  ): Promise<SolicitudDetalleDto> {
    return this.service.crear(dto, usuario);
  }

  @Patch(':id')
  @Roles('SOLICITANTE')
  @ApiOperation({ summary: 'Editar SC (solo el dueño y solo en BORRADOR)' })
  @ApiOkResponse({ type: SolicitudDetalleDto })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarSolicitudDto,
    @Usuario() usuario: UsuarioAutenticado,
  ): Promise<SolicitudDetalleDto> {
    return this.service.actualizar(id, dto, usuario);
  }

  @Post(':id/enviar')
  @HttpCode(200)
  @Roles('SOLICITANTE')
  @ApiOperation({ summary: 'BORRADOR → PENDIENTE (V2, V3)' })
  @ApiOkResponse({ type: SolicitudDetalleDto })
  enviar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EnviarSolicitudDto,
    @Usuario() usuario: UsuarioAutenticado,
  ): Promise<SolicitudDetalleDto> {
    return this.service.enviar(id, dto, usuario);
  }

  @Post(':id/anular')
  @HttpCode(200)
  @Roles('SOLICITANTE', 'ADMIN')
  @ApiOperation({ summary: 'BORRADOR | PENDIENTE → ANULADA (dueño o ADMIN)' })
  @ApiOkResponse({ type: SolicitudDetalleDto })
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Usuario() usuario: UsuarioAutenticado,
  ): Promise<SolicitudDetalleDto> {
    return this.service.anular(id, usuario);
  }
}
