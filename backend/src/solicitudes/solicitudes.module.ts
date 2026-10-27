import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistorialModule } from '../historial/historial.module';
import { IntegracionModule } from '../integracion/integracion.module';
import { OrdenesModule } from '../ordenes/ordenes.module';
import { Solicitud, SolicitudDetalle } from './solicitud.entity';
import { SolicitudesController } from './solicitudes.controller';
import { SolicitudesService } from './solicitudes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Solicitud, SolicitudDetalle]),
    OrdenesModule,
    HistorialModule,
    IntegracionModule,
  ],
  controllers: [SolicitudesController],
  providers: [SolicitudesService],
})
export class SolicitudesModule {}
