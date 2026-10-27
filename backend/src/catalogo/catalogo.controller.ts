import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles';
import { Paginado } from '../common/paginacion.dto';
import { ProductosInventarioService } from '../integracion/inventario/productos-inventario.service';
import { CatalogoQuery, ProductoDto, ProductoPaginadoDto } from './producto.dto';

@ApiTags('catalogo')
@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly productos: ProductosInventarioService) {}

  @Get('productos')
  @Roles('SOLICITANTE')
  @ApiOperation({ summary: 'Catálogo de sets (lectura de inv_producto de Inventario)' })
  @ApiOkResponse({ type: ProductoPaginadoDto })
  listar(@Query() query: CatalogoQuery): Promise<Paginado<ProductoDto>> {
    return this.productos.listar(query);
  }
}
