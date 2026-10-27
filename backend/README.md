# Backend · Módulo Compras (NestJS)

API REST del módulo Compras del ERP LESGO. El contrato (rutas, formas de respuesta, códigos de error) está en [docs/decisiones.md](../docs/decisiones.md) §5 y en Swagger: **http://localhost:3000/api/docs**.

## Requisitos

- Node 22 (`nvm use` lee `.nvmrc`) y npm.
- Credenciales de la BD compartida del profesor (canal privado del equipo). No hay BD local.

## Configurar

```bash
cd backend
cp .env.example .env     # completar DB_HOST, DB_NAME, DB_USER, DB_PASSWORD y DB_SSL=true
npm install
```

| Variable | Para qué |
|---|---|
| `PORT` | Puerto de la API (3000) |
| `DB_*` | Conexión a la BD compartida. `DB_POOL_MAX` limita las conexiones (por defecto 5) |
| `CORS_ORIGIN` | Origen(es) del front, separados por coma |
| `AUTH_MODE` | `dev` (Sprint 2): el usuario va en el header `X-Empleado-Id`, con roles SOLICITANTE + COMPRADOR |
| `RRHH_EMPLEADO_TABLE` | Tabla de empleados (`schema.tabla`). Hoy `logistica.test_log_rrhh_empleado` porque RRHH aún no publica la suya |

Si falta una variable obligatoria, el backend no arranca y dice cuál es.

## Levantar

```bash
npm run start:dev      # recarga en caliente
npm run build && npm run start:prod
```

## Probar

- **Swagger** (`/api/docs`): botón *Authorize* → `X-Empleado-Id` = un id de empleado (301–310) y luego *Try it out*.
- **curl**:
  ```bash
  curl http://localhost:3000/api/empleados
  curl -H "X-Empleado-Id: 301" "http://localhost:3000/api/catalogo/productos?q=city"
  curl -H "X-Empleado-Id: 301" -H "Content-Type: application/json" \
       -d '{"motivo":"Reposición","lineas":[{"idProducto":40,"cantidad":2}]}' \
       http://localhost:3000/api/solicitudes
  ```
- **Tests** (no tocan la BD): `npm test`. Cubren V1 (RUT), V2, la máquina de estados de SC (V5, V6, V11), fechas y folios.

Lo que hagas en la app queda en la BD compartida y lo ven todos. Usa la app o Swagger, no inserts a mano.

## Estructura

```
src/
  main.ts            prefijo /api, CORS, ValidationPipe, Swagger
  app.module.ts      config + TypeORM (synchronize: false, fijo)
  common/            errores de dominio + filtro, máquina de estados, RUT, fechas, folios, paginación
  auth/              guard global (modo dev) + @Roles/@Publico + acceso a empleados de RRHH (solo lectura)
  integracion/       acceso aislado a tablas de otros módulos (inventario.inv_producto / inv_temas)
  catalogo/          GET /catalogo/productos
  proveedores/       CRUD + activar/desactivar (V1)
  solicitudes/       SC: crear, editar, enviar, anular, listar, detalle, duplicados (V2, V3, V6)
  historial/         compras_historial_estado (se escribe en la misma transacción de cada transición)
  ordenes/           entidades de OC (endpoints en Sprint 3)
  aprobaciones/      Sprint 3
```

Reglas del código:

- El esquema se maneja **solo** con los scripts de `database/`; TypeORM nunca sincroniza ni migra.
- Toda entidad declara su `schema`. Tablas de otros módulos: solo lectura, en `integracion/` o `auth/`.
- Cada transición de estado pasa por la máquina (`solicitudes/sc.maquina.ts`) dentro de una transacción con `SELECT ... FOR UPDATE` y escribe el historial.
- Cada endpoint lleva `@Roles(...)` o `@Publico()`; si falta, el guard lo niega.
- Los errores salen siempre como `{statusCode, code, message, details?}`.
- Fechas: los `timestamp` se guardan en UTC y salen en hora de Chile (`common/fechas.ts`).
