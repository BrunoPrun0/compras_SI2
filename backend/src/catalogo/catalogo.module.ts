import { Module } from '@nestjs/common';
import { IntegracionModule } from '../integracion/integracion.module';
import { CatalogoController } from './catalogo.controller';

@Module({
  imports: [IntegracionModule],
  controllers: [CatalogoController],
})
export class CatalogoModule {}
