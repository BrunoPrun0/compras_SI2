import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductoInv, TemaInv } from './inventario/inventario.entities';
import { ProductosInventarioService } from './inventario/productos-inventario.service';

/** Acceso aislado a tablas de otros módulos (Inventario; Logística en Sprint 3). */
@Module({
  imports: [TypeOrmModule.forFeature([ProductoInv, TemaInv])],
  providers: [ProductosInventarioService],
  exports: [ProductosInventarioService],
})
export class IntegracionModule {}
