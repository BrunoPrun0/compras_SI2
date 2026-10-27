import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { CatalogoModule } from './catalogo/catalogo.module';
import { Entorno, validarEntorno } from './common/config';
import { FiltroErrores } from './common/filtro-errores.filter';
import { HistorialModule } from './historial/historial.module';
import { IntegracionModule } from './integracion/integracion.module';
import { OrdenesModule } from './ordenes/ordenes.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validarEntorno }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Entorno, true>) => ({
        type: 'postgres',
        host: config.get('DB_HOST', { infer: true }),
        port: config.get('DB_PORT', { infer: true }),
        database: config.get('DB_NAME', { infer: true }),
        username: config.get('DB_USER', { infer: true }),
        password: config.get('DB_PASSWORD', { infer: true }),
        schema: config.get('DB_SCHEMA', { infer: true }),
        ssl: config.get('DB_SSL', { infer: true }) ? { rejectUnauthorized: false } : false,
        applicationName: 'compras-backend',
        autoLoadEntities: true,
        // BD compartida: el esquema se maneja SOLO con los scripts de database/. Fijo en código.
        synchronize: false,
        migrationsRun: false,
        dropSchema: false,
        extra: { max: config.get('DB_POOL_MAX', { infer: true }) },
      }),
    }),
    AuthModule,
    HistorialModule,
    IntegracionModule,
    CatalogoModule,
    ProveedoresModule,
    OrdenesModule,
    SolicitudesModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: FiltroErrores }],
})
export class AppModule {}
