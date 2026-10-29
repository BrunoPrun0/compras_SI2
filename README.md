# compras_SI2
Módulo de Compras del ERP LESGO: gestión de proveedores, solicitudes de compra (SC), flujo de aprobación y órdenes de compra (OC), con integración con Inventario.

Stack: React, NestJS, TypeScript y PostgreSQL. Proyecto de Sistemas de Información II, UCN.

Las decisiones de negocio están en [docs/decisiones.md](docs/decisiones.md). Léelo antes de programar.

## Stack y versiones acordadas

| Pieza | Decisión |
|---|---|
| Node | **22 LTS** (archivo `.nvmrc`). Con nvm: `nvm use` |
| Gestor de paquetes | **npm**. Se sube `package-lock.json` |
| Frontend | React + TypeScript + Vite |
| Backend | NestJS + TypeScript, prefijo `/api`, Swagger en `/api/docs` |
| Acceso a BD | **TypeORM** con `synchronize: false` |
| Base de datos | PostgreSQL compartida del profesor |

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
En docs se podran encontrar el diagrama bpmn en .png y .bpmn para editarlo en bpmn.io
Ademas se encuentran los informes del sprint n°1 y 2.

## Primeros pasos

```bash
nvm use                      # Establece la versión de Node en 22

cd backend  && cp .env.example .env # Se copian los .env
cd frontend && cp .env.example .env

# Antes de levantar nada, hay que configurar correctamente las variables de entorno
npm install && npm run start:dev
npm install && npm run dev
```

## Reglas de trabajo

### Base de datos compartida
- Todos trabajamos sobre la misma BD, junto con los otros grupos. Lo que insertas lo ven todos.
- Las consultas las hace el backend vía TypeORM: cualquiera puede correr el backend y usar la app.
- En DBeaver cualquiera puede hacer `SELECT` para revisar datos, pero **no se insertan ni modifican filas de `compras_*` a mano**: se usa la app o Swagger, para que se apliquen validaciones, folios e historial.
- Un cambio de esquema = un archivo nuevo numerado en `database/schema/`.
- Ningún script ni test hace `DELETE`, `TRUNCATE` o `DROP` sobre datos existentes.
- Solo se crean/modifican tablas del schema `compras`. Las de otros grupos (schemas `inventario`, `logistica`, RRHH) son de solo lectura.
- `synchronize` de TypeORM queda siempre en `false`.

### Git
- `main` siempre funciona. Nadie hace push directo a `main`.
- Una rama por tarea: `feat/<area>-<descripcion>`, `fix/<area>-<descripcion>` (ej. `feat/back-proveedores`, `feat/front-solicitudes`).
- Se integra por Pull Request.
- Nunca se suben `.env`, credenciales ni archivos de `node_modules/`.
