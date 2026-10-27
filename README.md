# compras_SI2
Módulo de Compras del ERP LESGO: gestión de proveedores, solicitudes de compra (SC), flujo de aprobación y órdenes de compra (OC), con trazabilidad completa e integración con Inventario. Stack: React, NestJS, TypeScript y PostgreSQL. Proyecto de Sistemas de Información II, UCN.

Las decisiones de negocio (estados, validaciones, roles, contrato de la API, KPIs y plan por sprint) están en [docs/decisiones.md](docs/decisiones.md). Léelo antes de programar.

## Stack y versiones acordadas

| Pieza | Decisión |
|---|---|
| Node | **22 LTS** (archivo `.nvmrc`). Con nvm: `nvm use` |
| Gestor de paquetes | **npm** (no yarn ni pnpm). Se sube `package-lock.json` |
| Frontend | React + TypeScript + Vite, puerto **5173** |
| Backend | NestJS + TypeScript, puerto **3000**, prefijo `/api`, Swagger en `/api/docs` |
| Acceso a BD | **TypeORM** con `synchronize: false` (el esquema se maneja solo con los scripts de `database/`) |
| Base de datos | PostgreSQL compartida del profesor (no hay BD local) |
| Formato de código | Prettier con el `.prettierrc` de la raíz; saltos de línea LF (`.gitattributes`, `.editorconfig`) |

No se usa Docker: la BD la hostea el profesor y front/back se levantan con npm.

## Estructura

```
backend/    API NestJS (un módulo por carpeta en src/)
frontend/   App React (páginas en src/pages, cliente API en src/api)
database/
  schema/     DDL numerado (01_, 02_, ...) — se ejecutan en orden, una sola vez
  seeds/      DML de datos de prueba (idempotente, nunca borra)
  analitica/  vistas de solo lectura para Power BI
docs/       decisiones, diagramas, mockups, informe, Power BI
```

## Primeros pasos

```bash
nvm use                      # Node 22
cd backend  && cp .env.example .env && npm install && npm run start:dev
cd frontend && cp .env.example .env && npm install && npm run dev
```

- Las credenciales de la BD se comparten por el canal privado del equipo, nunca en el repo.
- El frontend funciona sin backend con `VITE_USE_MOCKS=true`. Para usar la API real: `VITE_USE_MOCKS=false` y el backend corriendo (Vite redirige `/api` a `localhost:3000`, sin problemas de CORS).

## Reglas de trabajo

### Base de datos compartida
- Todos trabajamos sobre la misma BD, junto con los otros grupos. Lo que insertas lo ven todos.
- **Solo Diego Parga (responsable del backend) ejecuta scripts de `database/`** (esquema, seeds, vistas), avisando antes al equipo.
- Las consultas del día a día (crear SC, aprobar, emitir OC, etc.) las hace el backend vía TypeORM: cualquiera puede correr el backend y usar la app.
- En DBeaver cualquiera puede hacer `SELECT` para revisar datos, pero **no se insertan ni modifican filas de `compras_*` a mano**: se usa la app o Swagger, para que apliquen validaciones, folios e historial.
- Un cambio de esquema = un archivo nuevo numerado en `database/schema/` (nunca se edita uno ya ejecutado).
- Ningún script ni test hace `DELETE`, `TRUNCATE` o `DROP` sobre datos existentes.
- Solo se crean/modifican tablas del schema `compras`. Las de otros grupos (schemas `inventario`, `logistica`, RRHH) son de solo lectura y siempre se escriben con su schema (`inventario.inv_producto`).
- `synchronize` de TypeORM queda siempre en `false`: en `true` podría alterar tablas de la BD compartida.

### Contrato front ↔ back
- El contrato de la API vive en [docs/decisiones.md](docs/decisiones.md) §5.
- Quien necesite cambiarlo actualiza ese archivo **en el mismo PR** que el cambio de código y avisa a la otra parte.

### Git
- **Arranque:** el proyecto NestJS lo inicializa solo el responsable del backend y el proyecto Vite solo el responsable del frontend; cada uno lo sube a `main` y recién entonces el resto crea sus ramas. Así no hay dos `package.json` distintos peleando.
- Una persona por carpeta de módulo a la vez (`backend/src/<modulo>`, `frontend/src/pages/<seccion>`); la asignación se lleva en el tablero de Notion.
- `main` siempre funciona. Nadie hace push directo a `main`.
- Una rama por tarea: `feat/<area>-<descripcion>`, `fix/<area>-<descripcion>` (ej. `feat/back-proveedores`, `feat/front-solicitudes`).
- Se integra por Pull Request con al menos 1 revisión de otro integrante.
- Nunca se suben `.env`, credenciales ni archivos de `node_modules/`.
