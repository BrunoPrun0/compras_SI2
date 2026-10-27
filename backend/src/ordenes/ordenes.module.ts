import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdenCompra, OrdenDetalle } from './orden.entity';

/** Sprint 2: solo las entidades (las SC las leen para folioOc y V3). Endpoints en Sprint 3. */
@Module({
  imports: [TypeOrmModule.forFeature([OrdenCompra, OrdenDetalle])],
  exports: [TypeOrmModule],
})
export class OrdenesModule {}
