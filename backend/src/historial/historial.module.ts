import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistorialEstado } from './historial.entity';
import { HistorialService } from './historial.service';

@Module({
  imports: [TypeOrmModule.forFeature([HistorialEstado])],
  providers: [HistorialService],
  exports: [HistorialService],
})
export class HistorialModule {}
