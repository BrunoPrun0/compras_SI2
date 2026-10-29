# Trabajo futuro y correcciones.
---

En este documento se establece trabajo futuro para corregir bugs o deuda técnica.

---

## 1. Inconsistencias entre BD, backend y especificación

### 1.1 Estados

READY -> R
TO DO -> TD
HALF DONE -> HD

| Estado | BD (CHECK final) | Backend (`ESTADOS_*`) | Máquina / servicio | `decisiones.md` | Observación |
|---|---|---|---|---|---|
| SC `BORRADOR`, `PENDIENTE`, `ANULADA` |  | R | R | R | OK |
| SC `APROBADA`, `RECHAZADA` | R | R | HD **sin endpoint ni servicio** | ✅ | Hoy solo se llega a estos estados por el seed. `backend/src/aprobaciones/` está vacío |
| OC `BORRADOR` … `CANCELADA` | R | R | TD no hay `MAQUINA_OC`, servicio ni controlador | R | `OrdenesModule` solo registra entidades ("Endpoints en Sprint 3") |

### 1.2 Reglas y datos

1. **Precio unitario: `> 0` vs `>= 0`.** V8 exige `precio > 0` (`OC_PRECIO_INVALIDO`), pero la BD tiene `CHECK (precio_unitario >= 0)`. La BD acepta OC con líneas a precio 0.
2. **ADMIN "puede todo" vs la máquina de estados.** `decisiones.md` §4 dice que ADMIN tiene "todo lo anterior", pero `MAQUINA_SC.aprobar/rechazar` solo admite `GESTOR_SC`, y el test `sc.maquina.spec.ts` ("sin GESTOR_SC no se aprueba (ni siendo COMPRADOR o ADMIN)") confirma que ADMIN **no** aprueba. Hay que decidir cuál de las dos manda y corregir la otra.
3. **Semántica de `fecha_solicitud`.** Se fija al **crear el borrador** (`DEFAULT now()`), no al enviar. La API la expone como `fechaSolicitud`, y en el listado aparece con la fecha del borrador. El KPI de tiempo de ciclo usa el historial (→ PENDIENTE), así que el cálculo es correcto, pero la columna engaña. Conviene renombrarla a `fecha_creacion` (como en la OC) o agregar `fecha_envio`.
4. **Variables de entorno sin leer.** `.env.example` define `JWT_SECRET`, `JWT_EXPIRES_IN`, `ROLES_MAP`, `RECEPCIONES_SYNC_MINUTOS`, pero `validarEntorno` (`common/config.ts`) no las lee ni las valida.
5. **Montos que excluyen `CON_PROBLEMAS`.** `montoComprado` del proveedor, `precioReferencia` y el KPI de gasto solo cuentan OC `EMITIDA` / `COMPLETADA`. Una OC con problemas sigue siendo gasto comprometido y un precio pagado, así que su monto desaparece de los indicadores mientras no se resuelva.
6. **Tránsito.** "Σ cantidades en OC EMITIDA" no descuenta recepciones parciales y no cuenta lo pendiente de las OC `CON_PROBLEMAS`. Esto sobrestima unas veces y subestima otras.

---

## 2. Pasos que faltan en el flujo

| Tema | Situación actual | Qué falta |
|---|---|---|
| **Aprobación / rechazo de SC** | Solo en la máquina de estados | Endpoint, servicio que guarde `id_gestor`, `fecha_resolucion` y `motivo_rechazo` en la misma transacción, y la validación V4 (≥ 10 caracteres) |
| **Rechazo con corrección** | `RECHAZADA` es terminal | No hay "devolver a borrador para corregir". El solicitante tiene que crear una SC nueva y se pierde la trazabilidad con la original (el seed S06 dice "reenviar en enero") |
| **Anulación de SC** | No pide motivo (`cambiarEstado` sin `comentario`) | Motivo obligatorio, sobre todo cuando ADMIN anula una SC ajena |
| **Cierre / anulación de SC APROBADA** | No hay transición de salida | Si la necesidad desaparece, las líneas quedan "disponibles" para siempre y siguen gatillando la advertencia V3 de duplicados |
| **Saldo de línea de SC** | V8 permite pedir menos de lo solicitado, pero V7 marca la línea como usada | El saldo no pedido **no se puede comprar nunca** (no se puede volver a usar la línea mientras haya una OC no cancelada). Falta permitir varias OC por línea mientras Σ cantidades ≤ solicitada, o un estado "parcial" |
| **Aprobación de OC por monto** | El COMPRADOR emite cualquier monto sin segunda firma | Umbral configurable (p. ej. total > X CLP), con aprobación de un rol superior y un estado `POR_APROBAR` o similar. La SC no tiene montos, así que el control solo es posible en la OC |
| **Segregación de funciones** | V5 impide que el gestor apruebe su propia SC | Nada impide que el solicitante de la SC sea el comprador que emite la OC de esas líneas, ni que un mismo empleado tenga GESTOR_SC y COMPRADOR y cierre todo el ciclo |
| **Cancelar una OC EMITIDA con recepciones parciales** | `decisiones.md` permite `EMITIDA → CANCELADA` sin condiciones | Bloquearlo si ya hay `log_recepcion` asociada, o exigir un flujo de devolución |
| **Devoluciones al proveedor** | No existe | Productos dañados o sobrantes: devolución, nota de crédito, reposición. `CON_PROBLEMAS` solo deja resolver como COMPLETADA o CANCELADA |
| **Ajuste de montos al resolver** | Resolver como COMPLETADA con faltantes deja el `total` original | Recalcular, o registrar el monto efectivamente recibido. Si no, el KPI de gasto y el `precioReferencia` quedan inflados |
| **`fecha_recepcion_real` en resolución manual** | La regla solo cubre la recepción conforme automática | **[Supuesto]**: no está definido qué fecha se guarda cuando el comprador resuelve a mano. Sin ella, el KPI de cumplimiento de plazos excluye esas OC |
| **Recepciones sobre OC BORRADOR o CANCELADA** | La sincronización solo mira `EMITIDA` / `CON_PROBLEMAS` | Mercadería recibida contra una OC cancelada se ignora sin alerta. Falta un aviso o estado de excepción |
| **Envío de la OC al proveedor** | Solo "documento imprimible" (HU4.2) | **[Supuesto]** del BPMN: el envío es manual y fuera del sistema. No hay acuse de recibo del proveedor ni fecha comprometida confirmada |
| **Auditoría** | Solo cambios de estado de SC/OC | No se auditan: ediciones de borradores (contenido de líneas, motivo), cambios de proveedor (RUT, razón social, activar/desactivar), ni quién forzó una sincronización. `GET /historial` (HU5.2) no existe |
| **Vencimientos** | Ninguno | SC `PENDIENTE` sin resolver ni OC `EMITIDA` vencida (`fecha_entrega_esperada` < hoy) no generan alertas ni escalamiento |

---

## 3. Estados sin salida y transiciones imposibles

1. **SC `APROBADA` es terminal y "sin salida" para el negocio.** No refleja si sus líneas ya están en una OC, si se completaron o si quedaron huérfanas. Para saberlo hay que cruzar con `compras_detalle`. Falta un estado derivado (`EN_OC`, `CERRADA`) o una vista.
2. **SC `APROBADA` / `RECHAZADA` hoy son inalcanzables desde la app.** Sin endpoint, una SC enviada queda en `PENDIENTE` para siempre (salvo que se anule).
3. **En modo dev nadie puede aprobar.** `ROLES_MODO_DEV = ['SOLICITANTE', 'COMPRADOR']`: ningún usuario tiene `GESTOR_SC` ni `ADMIN`. Aunque existiera el endpoint, el camino de aprobación no se podría probar en Sprint 2, y tampoco la anulación por ADMIN.
4. **OC: todo el ciclo es inalcanzable desde la app.** Solo existen las OC del seed.
5. **El saldo de una línea de SC parcialmente comprada no tiene ninguna transición** que lo lleve a una OC (ver §2).
6. **`CON_PROBLEMAS → COMPLETADA` automática** depende de una entrega complementaria. Si el proveedor nunca completa y nadie resuelve, la OC queda indefinidamente en `CON_PROBLEMAS`. No hay timeout.
7. **El historial puede registrar transiciones imposibles.** `compras_historial_estado` no valida que `estado_anterior → estado_nuevo` sea una transición permitida, ni que los valores pertenezcan al tipo de documento (una fila `SC` con `EMITIDA` se acepta).

---

## 4. Restricciones e índices que faltan en la BD

### 4.1 Integridad referencial

| Falta | Propuesta |
|---|---|
| FK a empleados en `compras_sc.id_empleado`, `compras_sc.id_gestor`, `compras_oc.id_empleado`, `compras_historial_estado.id_empleado` | Script de Sprint 3, cuando RRHH publique `rrhh_empleado`. Usar `NOT VALID` + `VALIDATE`, como en 03 |
| `log_recepcion.id_oc → compras_oc` | Ya está pedida a Logística. Sin ella, `log_recepcion` puede apuntar a OC inexistentes |
| Coherencia de `compras_detalle.id_producto` con su línea de SC | Hoy la línea de OC puede tener otro producto que su línea de SC. Agregar `UNIQUE (id_sc_detalle, id_producto)` en `compras_sc_detalle` y una FK compuesta `(id_sc_detalle, id_producto)` desde `compras_detalle` |
| Historial polimórfico sin FK | Opción A: columnas `id_solicitud` / `id_oc` nulas con FK y `CHECK (num_nonnulls(id_solicitud, id_oc) = 1)`. Opción B: trigger de validación |
| `ON DELETE` no declarado (todas las FK quedan en `NO ACTION`) | Declarar `ON DELETE RESTRICT` explícito, coherente con "no hay DELETE físico". El backend sí borra `compras_sc_detalle` al editar un BORRADOR, y eso sigue funcionando porque esas líneas no pueden tener OC |

### 4.2 UNIQUE

- `compras_sc_detalle (id_solicitud, id_producto)`: "una línea por producto" hoy solo la valida el backend, y dos `PATCH` concurrentes podrían duplicarla.
- **Una línea de SC en una sola OC no cancelada (V7)**: no se puede expresar con un índice parcial, porque el estado vive en `compras_oc`. Opciones: un trigger, o desnormalizar un flag `activa` en `compras_detalle` (actualizado al cancelar la OC) con `UNIQUE (id_sc_detalle) WHERE activa`.

### 4.3 CHECK

```sql
-- compras_sc
CHECK (id_gestor IS NULL OR id_gestor <> id_empleado)                        -- V5 en BD
CHECK ((estado IN ('APROBADA','RECHAZADA')) = (id_gestor IS NOT NULL AND fecha_resolucion IS NOT NULL))
CHECK (motivo_rechazo IS NULL OR char_length(btrim(motivo_rechazo)) >= 10)  -- V4

-- compras_detalle
CHECK (precio_unitario > 0)                                                  -- V8 (hoy >= 0)
-- cantidad <= cantidad de la línea de SC (V8): requiere trigger

-- compras_oc
CHECK (subtotal >= 0 AND impuesto >= 0 AND total = subtotal + impuesto)
CHECK (estado <> 'CANCELADA' OR motivo_cancelacion IS NOT NULL)
CHECK (fecha_emision IS NULL OR fecha_emision >= fecha_creacion)
CHECK (fecha_recepcion_real IS NULL OR fecha_recepcion_real >= fecha_emision::date)
CHECK (estado <> 'COMPLETADA' OR fecha_recepcion_real IS NOT NULL)          -- si se define la fecha en resolución manual

-- compras_historial_estado
CHECK ((tipo_documento = 'SC' AND estado_nuevo IN ('BORRADOR','PENDIENTE','APROBADA','RECHAZADA','ANULADA'))
    OR (tipo_documento = 'OC' AND estado_nuevo IN ('BORRADOR','EMITIDA','COMPLETADA','CON_PROBLEMAS','CANCELADA')))
CHECK (estado_nuevo NOT IN ('RECHAZADA','CANCELADA','CON_PROBLEMAS') OR comentario IS NOT NULL)
```

### 4.4 Índices

| Índice | Para qué |
|---|---|
| `compras_detalle (id_producto)` | Subconsulta de `precioReferencia`, que corre en **cada** fila del catálogo, tránsito por producto y KPIs |
| `compras_oc (id_empleado)`, `compras_sc (id_gestor)` | Filtros por comprador o gestor, y las futuras FK (Postgres no indexa FK solo) |
| `compras_oc (fecha_emision)` o `(id_proveedor, fecha_emision)` | Gasto por proveedor y mes, orden de `precioReferencia` |
| `compras_historial_estado (tipo_documento, estado_nuevo, fecha)` | KPIs de tiempo de ciclo y tasa de problemas |
| `compras_sc (fecha_solicitud)` | Listado ordenado y filtrado por `desde` / `hasta` |

### 4.5 Tipos

- **`TIMESTAMP` sin zona guardando UTC por convención.** Funciona mientras todos escriban con `now()` en una BD en GMT. Cualquier `INSERT` manual con hora local (o Power BI leyendo sin convertir) mezcla zonas. `TIMESTAMPTZ` elimina el problema.
- **`chk_oc_fecha_entrega` compara contra `fecha_emision::date` en UTC.** Una OC emitida después de las 21:00 (horario de verano, UTC−3) o de las 20:00 (invierno, UTC−4) en Chile cae en el día UTC siguiente, así que la BD rechaza una entrega "para hoy" que V9 sí permite. Se corrige con `(fecha_emision AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago')::date`, o usando `TIMESTAMPTZ`.
- **`folio` es nullable.** Se rellena con un segundo `UPDATE` en la misma transacción. Una secuencia o trigger `BEFORE INSERT` permitiría `NOT NULL`.
---

### 5.1 Validaciones

1. **V3 se valida fuera de la transacción en `crear()`.** La validación de líneas y la de duplicados ocurren antes de `ds.transaction`. Como V3 es solo advertencia, el impacto es bajo, pero el patrón no debe copiarse a V7.
2. **V2 no revalida el producto al aprobar ni al emitir.** Un producto que Inventario desactiva después del envío pasa igual. **[Supuesto]**: no está definido si emitir una OC exige productos activos.
3. **Errores de restricción genéricos.** Las violaciones de CHECK (`23514`) se devuelven como `VALIDACION` con el nombre de la restricción. Si una regla vive solo en la BD (por ejemplo, el nuevo `chk_oc_fecha_entrega`), el usuario recibe "Datos inconsistentes" en vez del código de negocio (`OC_INCOMPLETA`).

### 5.2 Concurrencia

1. **V7 sin bloqueo.** Dos compradores que crean o emiten OC con la misma línea de SC al mismo tiempo pasan ambos la validación. Hay que bloquear las filas de `compras_sc_detalle` involucradas (`SELECT … FOR UPDATE`) dentro de la transacción de emisión, además de la restricción en BD de §4.2.
2. **Sincronización vs acciones manuales.** El job periódico, `POST /integracion/recepciones/sincronizar` (ADMIN) y `cancelar` / `resolver` pueden tocar la misma OC a la vez. Cada evaluación debe tomar `FOR UPDATE` sobre la OC y releer su estado. Si hay más de una instancia del backend, el job necesita un `pg_try_advisory_lock` para no correr dos veces y duplicar historial.
3. **SC: bien resuelto.** `bloquear()` usa `pessimistic_write` sobre la cabecera, lo que serializa editar, enviar y anular. Hay que replicar el mismo patrón en aprobar, rechazar y en toda la OC.
