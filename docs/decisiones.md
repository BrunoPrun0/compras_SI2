# Decisiones del módulo Compras (fuente única de verdad)

Este documento resuelve las incoherencias del anteproyecto y lo alinea con el documento del curso
("Proyecto SI2"). Front y back deben respetarlo. Si algo aquí contradice el anteproyecto, manda este documento.

## 1. Alcance del módulo

Compras es dueño de: **proveedores, solicitudes de compra (SC) y órdenes de compra (OC)**.

| Maestro / tabla | Dueño | Qué hace Compras |
|---|---|---|
| `compras_proveedor` | Compras | CRUD + activar/desactivar |
| `inv_producto` (catálogo) | Inventario | **Solo lectura**. Si existe la columna `inventariable`, se usa; si no, todo es inventariable |
| `rrhh_empleado`, `rrhh_usuario`, `rrhh_rol` | RRHH | **Solo lectura** (login y roles) |
| `log_recepcion` | Logística | **Solo lectura**: de ahí sale si la recepción fue conforme |
| Stock | Inventario | Nada. Compras no toca stock; solo expone OC emitidas y unidades en tránsito |

Compras **nunca** crea ni modifica tablas de otros módulos en la BD compartida.

## 2. Estados

### Solicitud de Compra (SC)

```
BORRADOR ──enviar──▶ PENDIENTE ──aprobar──▶ APROBADA
    │                    │ └────rechazar──▶ RECHAZADA (motivo obligatorio)
    └──anular──▶ ANULADA ◀──anular──┘
```

- `BORRADOR`: editable por su creador; puede tener campos incompletos.
- `enviar`: valida campos obligatorios (motivo, ≥1 línea, cantidades > 0, productos activos).
- `anular`: solo el creador (o ADMIN), desde BORRADOR o PENDIENTE.
- `aprobar` / `rechazar`: solo GESTOR_SC, y **nunca sobre una SC propia**.
- Una SC APROBADA no cambia de estado al entrar en una OC; la trazabilidad la da `compras_detalle.id_sc_detalle`.

### Orden de Compra (OC)

```
BORRADOR ──emitir──▶ EMITIDA ──recepción conforme──▶ COMPLETADA
   │                    │ └──recepción no conforme──▶ CON_PROBLEMAS ──resolver──▶ COMPLETADA | CANCELADA
   └──cancelar──▶ CANCELADA ◀──cancelar──┘
```

- `EMITIDA` = en tránsito (cuenta para las unidades en tránsito, HU6.2).
- OC emitida es **inmutable** (no se editan líneas ni cabecera).
- `CANCELADA` reemplaza al "Rechazado" del BPMN.
- Las transiciones EMITIDA → COMPLETADA / CON_PROBLEMAS las gatilla la recepción registrada por Logística en `log_recepcion`.

Toda transición de SC u OC escribe una fila en `compras_historial_estado` **en la misma transacción**.

## 3. Reglas de negocio y validaciones

Todas se validan **en el servidor** (RT2). El front las repite solo para dar feedback rápido.

| # | Regla | Código de error |
|---|---|---|
| V1 | RUT de proveedor válido (módulo 11) y único | `PROVEEDOR_RUT_INVALIDO`, `PROVEEDOR_RUT_DUPLICADO` |
| V2 | SC no se envía con campos faltantes | `SC_INCOMPLETA` |
| V3 | Al crear/enviar una SC con un producto que ya está en otra SC PENDIENTE o APROBADA sin OC, se **advierte** y el usuario confirma (`confirmarDuplicado: true`) | `SC_POSIBLE_DUPLICADO` (409 con la lista de SC) |
| V4 | Rechazo de SC exige motivo (≥ 10 caracteres) | `SC_MOTIVO_RECHAZO_REQUERIDO` |
| V5 | Un gestor no puede aprobar/rechazar su propia SC | `SC_AUTOAPROBACION` |
| V6 | Solo transiciones válidas según el diagrama de estados | `TRANSICION_INVALIDA` |
| V7 | Cada línea de OC debe venir de una línea de SC APROBADA que no esté en otra OC no cancelada | `OC_LINEA_SIN_RESPALDO`, `OC_LINEA_YA_USADA` |
| V8 | Cantidad de línea de OC: 0 < cantidad ≤ cantidad solicitada; precio unitario > 0 | `OC_CANTIDAD_INVALIDA`, `OC_PRECIO_INVALIDO` |
| V9 | Emitir OC exige proveedor ACTIVO, ≥ 1 línea y fecha comprometida ≥ fecha de emisión | `OC_PROVEEDOR_INACTIVO`, `OC_INCOMPLETA` |
| V10 | OC emitida no se modifica | `OC_INMUTABLE` |
| V11 | Endpoint sin el rol requerido → 403 | `SIN_PERMISO` |

- IVA 19 % calculado en servidor: `subtotal = Σ líneas`, `impuesto = round(subtotal × 0,19)`, `total = subtotal + impuesto`.
- Folios: `SC-AAAA-NNNNN` y `OC-AAAA-NNNNN` (año + id con ceros a la izquierda), asignados por el backend.
- Proveedor desactivado conserva su historial (no se borra nada; no hay DELETE físico de proveedores, SC ni OC).

## 4. Roles y permisos

Los roles vienen de RRHH (`rrhh_rol`). El backend mapea los nombres de RRHH a estos roles internos por configuración.

| Rol interno | Puede |
|---|---|
| `SOLICITANTE` (todo usuario autenticado) | Crear, editar, enviar, anular y ver **sus** SC; ver catálogo |
| `GESTOR_SC` | Ver todas las SC; aprobar/rechazar (no las propias) |
| `COMPRADOR` | CRUD proveedores; ver SC; crear, emitir, cancelar y resolver OC; ver tránsito |
| `INVENTARIO` | Ver OC emitidas y unidades en tránsito |
| `ADMIN` | Todo lo anterior + historial de auditoría + simular recepción (solo si `log_recepcion` no existe) |

El analista de Power BI no usa la aplicación: se conecta a las vistas de solo lectura (RT3).

## 5. Contrato de la API REST

Base: `/api`. JSON. Autenticación con `Authorization: Bearer <jwt>`.
Errores: `{ "statusCode": 400, "code": "SC_INCOMPLETA", "message": "texto para el usuario", "details": {...} }`.
Listados paginados: `?page=1&pageSize=20` → `{ "items": [...], "total": 123, "page": 1, "pageSize": 20 }`.
Fechas en ISO 8601. Montos como número (CLP, sin decimales en pantalla).

| Método y ruta | Roles | Descripción |
|---|---|---|
| `POST /auth/login` | público | `{usuario, password}` → `{token, usuario: {idEmpleado, nombre, roles[]}}` |
| `GET /auth/me` | autenticado | Usuario actual y roles |
| `GET /catalogo/productos?q=&soloActivos=true` | autenticado | Catálogo (lectura de `inv_producto`) |
| `GET /empleados?q=` | autenticado (en Sprint 2, público) | Lectura de `rrhh_empleado` para el selector de usuario y los filtros por solicitante |
| `GET /proveedores?q=&estado=` | COMPRADOR, GESTOR_SC, ADMIN | Listado |
| `GET /proveedores/:id` | ídem | Detalle + resumen de OC |
| `POST /proveedores` | COMPRADOR, ADMIN | Crear (V1) |
| `PATCH /proveedores/:id` | COMPRADOR, ADMIN | Editar datos |
| `PATCH /proveedores/:id/estado` | COMPRADOR, ADMIN | `{estado: "ACTIVO" \| "INACTIVO"}` |
| `GET /solicitudes?estado=&idSolicitante=&idProducto=&desde=&hasta=&q=` | autenticado (SOLICITANTE ve solo las suyas) | Listado con filtros (HU2.3, HU5.1) |
| `GET /solicitudes/:id` | dueño, GESTOR_SC, COMPRADOR, ADMIN | Cabecera + líneas + historial |
| `GET /solicitudes/duplicados?productos=1,2` | autenticado | SC PENDIENTE/APROBADA-sin-OC que incluyen esos productos (V3) |
| `POST /solicitudes` | autenticado | Crea en BORRADOR: `{motivo?, lineas: [{idProducto, cantidad}]}` |
| `PATCH /solicitudes/:id` | dueño | Edita (solo BORRADOR) |
| `POST /solicitudes/:id/enviar` | dueño | BORRADOR → PENDIENTE (V2, V3; body `{confirmarDuplicado?}`) |
| `POST /solicitudes/:id/anular` | dueño, ADMIN | → ANULADA |
| `POST /solicitudes/:id/aprobar` | GESTOR_SC | → APROBADA (V5) |
| `POST /solicitudes/:id/rechazar` | GESTOR_SC | `{motivo}` → RECHAZADA (V4, V5) |
| `GET /solicitudes/lineas-disponibles?idProducto=` | COMPRADOR, ADMIN | Líneas de SC APROBADA sin OC activa (para armar OC) |
| `GET /ordenes?estado=&idProveedor=&desde=&hasta=&q=` | COMPRADOR, GESTOR_SC, INVENTARIO, ADMIN | Listado |
| `GET /ordenes/:id` | ídem | Cabecera + líneas (con folio de SC origen) + historial |
| `POST /ordenes` | COMPRADOR | Crea BORRADOR: `{idProveedor, fechaEntregaEsperada, lineas: [{idScDetalle, cantidad, precioUnitario}]}` |
| `PATCH /ordenes/:id` | COMPRADOR | Edita (solo BORRADOR) |
| `POST /ordenes/:id/emitir` | COMPRADOR | → EMITIDA (V7–V9) |
| `POST /ordenes/:id/cancelar` | COMPRADOR, ADMIN | `{motivo}` → CANCELADA |
| `POST /ordenes/:id/resolver` | COMPRADOR | `{resultado: "COMPLETADA" \| "CANCELADA", comentario}` desde CON_PROBLEMAS |
| `GET /ordenes/:id/documento` | COMPRADOR, ADMIN | Datos para el documento imprimible (HU4.2) |
| `GET /integracion/transito?idProducto=` | INVENTARIO, COMPRADOR, ADMIN | Unidades en tránsito por producto (Σ cantidades en OC EMITIDA) |
| `GET /integracion/oc-emitidas` | INVENTARIO, ADMIN | OC EMITIDA con líneas, cantidades y fecha comprometida (HU6.1) |
| `POST /integracion/recepciones/sincronizar` | ADMIN (también corre periódicamente) | Lee `log_recepcion` y actualiza OC |
| `POST /integracion/recepciones/simular/:idOc` | ADMIN | `{conforme, observacion}`; solo si no existe `log_recepcion` |
| `GET /historial/:tipo/:id` | ADMIN | `tipo` = `SC` \| `OC` (HU5.2) |
| `GET /panel/resumen` | autenticado | Contadores: SC pendientes, OC emitidas, OC con problemas, gasto del mes |

### 5.1 Formas de las respuestas

Front (tipos en `frontend/src/types/`) y back (DTOs de respuesta) usan exactamente estos nombres.
Fechas: `Fecha` = `"AAAA-MM-DD"`; `FechaHora` = ISO 8601 con zona (`"2026-10-26T14:30:00-03:00"`). Zona horaria del sistema: `America/Santiago`.

```ts
type EstadoSc = 'BORRADOR' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'ANULADA';
type EstadoOc = 'BORRADOR' | 'EMITIDA' | 'COMPLETADA' | 'CON_PROBLEMAS' | 'CANCELADA';
type Rol = 'SOLICITANTE' | 'GESTOR_SC' | 'COMPRADOR' | 'INVENTARIO' | 'ADMIN';

interface EmpleadoRef { idEmpleado: number; nombre: string }
interface UsuarioActual extends EmpleadoRef { roles: Rol[] }

interface Producto {
  idProducto: number; sku: string; nombre: string; coleccion: string | null;
  precioReferencia: number | null; inventariable: boolean; activo: boolean;
}

interface Proveedor {
  idProveedor: number; rutNit: string; razonSocial: string; email: string | null;
  telefono: string | null; direccion: string | null; estado: 'ACTIVO' | 'INACTIVO';
}

interface LineaSc { idScDetalle: number; producto: Producto; cantidad: number; folioOc: string | null }

interface SolicitudResumen {
  idSolicitud: number; folio: string; solicitante: EmpleadoRef; fechaSolicitud: FechaHora;
  motivo: string | null; estado: EstadoSc; cantidadLineas: number;
}
interface SolicitudDetalle extends SolicitudResumen {
  lineas: LineaSc[]; motivoRechazo: string | null; gestor: EmpleadoRef | null;
  fechaResolucion: FechaHora | null; historial: HistorialItem[];
}

interface LineaDisponible {            // GET /solicitudes/lineas-disponibles
  idScDetalle: number; folioSc: string; solicitante: EmpleadoRef; producto: Producto; cantidadSolicitada: number;
}

interface LineaOc {
  idDetalle: number; idScDetalle: number; folioSc: string; producto: Producto;
  cantidad: number; precioUnitario: number; subtotalLinea: number;
}

interface OrdenResumen {
  idOc: number; folio: string; proveedor: Pick<Proveedor, 'idProveedor' | 'rutNit' | 'razonSocial'>;
  comprador: EmpleadoRef; estado: EstadoOc; fechaCreacion: FechaHora; fechaEmision: FechaHora | null;
  fechaEntregaEsperada: Fecha | null; total: number;
}
interface OrdenDetalle extends OrdenResumen {
  lineas: LineaOc[]; subtotal: number; impuesto: number; fechaRecepcionReal: Fecha | null;
  motivoCancelacion: string | null; historial: HistorialItem[];
}

interface HistorialItem {
  idHistorial: number; estadoAnterior: string | null; estadoNuevo: string;
  usuario: EmpleadoRef; fecha: FechaHora; comentario: string | null;
}

interface DuplicadoSc { idSolicitud: number; folio: string; estado: EstadoSc; producto: Producto; cantidad: number }
// 409 SC_POSIBLE_DUPLICADO → details: { duplicados: DuplicadoSc[] }

interface TransitoProducto { producto: Producto; cantidadEnTransito: number; ordenes: { folio: string; cantidad: number; fechaEntregaEsperada: Fecha }[] }

interface PanelResumen { scPendientes: number; ocEmitidas: number; ocConProblemas: number; gastoMesActual: number }

interface Paginado<T> { items: T[]; total: number; page: number; pageSize: number }
```

`GET /ordenes/:id/documento` devuelve `OrdenDetalle` + `proveedor` completo (`Proveedor`). Los listados devuelven `Paginado<...Resumen>`; los detalles, el objeto `...Detalle`. Las acciones (`enviar`, `aprobar`, `emitir`, etc.) devuelven el `...Detalle` actualizado.

## 6. KPIs (Power BI, vía vistas de solo lectura)

| KPI | Cálculo | Fuente |
|---|---|---|
| Cumplimiento de plazos | % OC COMPLETADA con `fecha_recepcion_real ≤ fecha_entrega_esperada` | `compras_oc` |
| Gasto por proveedor | Σ `total` de OC EMITIDA/COMPLETADA por proveedor y mes | `compras_oc` + `compras_proveedor` |
| Tiempo de ciclo SC → OC | Días entre envío de la SC (historial → PENDIENTE) y emisión de la OC que la incluye; también tiempo de aprobación | `compras_historial_estado`, `compras_detalle` |
| Tasa de rechazo / problemas | % SC RECHAZADA sobre SC resueltas; % OC que pasaron por CON_PROBLEMAS | `compras_sc`, `compras_historial_estado` |

Vista táctica: cumplimiento y problemas por proveedor, SC pendientes por antigüedad. Vista estratégica: gasto mensual, tendencia de tiempos de ciclo.

## 7. Datos

- ≥ 10 registros por tabla (Sprint 2).
- ≥ 100 registros en tabla crítica: **`compras_oc` + `compras_detalle`** con OC históricas generadas por script (fechas en los últimos 12 meses, estados variados), lo que además alimenta los KPIs (Sprint 4).
- Scripts DDL en `database/schema/`, DML en `database/seeds/`, vistas en `database/analitica/`.
- Todo el equipo trabaja directo sobre la BD compartida del profesor: los scripts de esquema y seeds los ejecuta **una sola persona, avisando al equipo**; ningún script borra datos existentes (seeds idempotentes con `ON CONFLICT DO NOTHING`).

## 8. Plan por sprint

| Sprint | Entrega | Alcance |
|---|---|---|
| 2 | 28/10 | Proveedores (form + listado), SC (crear/editar/enviar/listar/detalle), catálogo en lectura, seeds ≥ 10, validaciones V1–V3. Usuario actual por selector de empleado (sin login) |
| 3 | 18/11 | Login con RRHH + roles (V11), aprobación/rechazo (V4–V6), OC completa (V7–V10), historial, integración con `log_recepcion`, unidades en tránsito |
| 4 | 09/12 | OC imprimible, panel, ≥ 100 OC, vistas analíticas + usuario de solo lectura, Power BI, pruebas de integración documentadas |

## 9. Cambios pendientes en el informe (anteproyecto → Sprint 2/3)

1. MER: agregar `compras_sc_detalle` y `compras_historial_estado`; mover la referencia a SC desde `compras_oc` a `compras_detalle.id_sc_detalle`; agregar `folio`, `fecha_recepcion_real`, `motivo_rechazo`, `motivo_cancelacion`; actualizar los estados.
2. BPMN: "En tránsito" va **después de emitir/enviar** la OC, no después de la recepción; "Rechazado" pasa a "Cancelada"; Logística registra la recepción y avisa a Inventario.
3. HU1.1 y HU1.2: reescribir como consulta del catálogo de Inventario (Compras no lo administra).
4. HU6.3: reasignar a Logística/Inventario; para Compras queda "la OC actualiza su estado al registrarse la recepción".
5. Corregir la nota "R02" (no existe ese ID; probablemente es RF2).
6. Agregar las secciones que exige el curso: KPIs, diagrama de arquitectura por capas (React → NestJS → PostgreSQL → Power BI), diagrama modular por perfil de usuario y capturas del tablero Notion.
