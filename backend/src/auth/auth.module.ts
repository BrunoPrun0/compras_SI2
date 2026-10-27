import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { EmpleadosController } from './empleados.controller';
import { EmpleadosRepository } from './empleados.repository';

@Global()
@Module({
  controllers: [EmpleadosController],
  providers: [EmpleadosRepository, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [EmpleadosRepository],
})
export class AuthModule {}
