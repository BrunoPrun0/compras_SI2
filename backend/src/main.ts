import { ValidationError, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { Entorno } from './common/config';
import { ErrorDominio } from './common/errores';
import { configurarTiposPg } from './common/pg-tipos';

/** Aplana los errores de class-validator: [{campo: 'lineas.0.cantidad', errores: [...]}] */
function aplanar(errores: ValidationError[], prefijo = ''): { campo: string; errores: string[] }[] {
  return errores.flatMap((e) => {
    const campo = prefijo ? `${prefijo}.${e.property}` : e.property;
    const propios = e.constraints ? [{ campo, errores: Object.values(e.constraints) }] : [];
    return [...propios, ...aplanar(e.children ?? [], campo)];
  });
}

async function bootstrap() {
  configurarTiposPg();
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Entorno, true>>(ConfigService);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config
      .get('CORS_ORIGIN', { infer: true })
      .split(',')
      .map((o) => o.trim()),
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errores) =>
        new ErrorDominio('VALIDACION', 'Datos inválidos', { errores: aplanar(errores) }),
    }),
  );

  const doc = new DocumentBuilder()
    .setTitle('LESGO · Módulo Compras')
    .setDescription(
      'Contrato vivo de la API (docs/decisiones.md §5). Errores: `{statusCode, code, message, details?}`. ' +
        'En AUTH_MODE=dev el usuario va en el header X-Empleado-Id (roles SOLICITANTE + COMPRADOR).',
    )
    .setVersion('sprint-2')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'X-Empleado-Id' }, 'empleado')
    .addSecurityRequirements('empleado')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc), {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
