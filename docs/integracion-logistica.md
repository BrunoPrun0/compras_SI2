# Integración con Logística: OC para la recepción en muelle

## Qué ofrece Compras

Dos vistas de solo lectura en el schema `compras`, creadas por `database/schema/04_vistas_logistica.sql`. Tienen las mismas columnas que las tablas de prueba de Logística, así que reemplazan a `logistica.test_log_compras_oc` y `logistica.test_log_compras_oc_detalle` sin cambiar su código de lectura.

| Vista | Reemplaza a | Columnas |
|---|---|---|
| `compras.v_oc_recepcion` | `test_log_compras_oc` | `id_oc`, `id_proveedor`, `proveedor`, `fecha`, `estado` |
| `compras.v_oc_recepcion_detalle` | `test_log_compras_oc_detalle` | `id`, `id_oc`, `id_producto`, `cantidad_esperada` |

- Solo aparecen las OC en estado `EMITIDA` o `CON_PROBLEMAS` (las que pueden recibir mercadería).
- `fecha` es la fecha de emisión de la OC.
- `id_producto` es el de `inventario.inv_producto`.
- `id_proveedor` es el de `compras.compras_proveedor`, el mismo que Inventario valida en `POST /movimientos/recepcion`.
- Si una OC trae el mismo producto en varias líneas, la vista las suma en una sola fila.

## Qué cambia Logística

En `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["logistica", "compras"]
}

model ComprasOc {
  // mismos campos
  @@map("v_oc_recepcion")
  @@schema("compras")
}

model ComprasOcDetalle {
  // mismos campos
  @@map("v_oc_recepcion_detalle")
  @@schema("compras")
}
```

Además:

1. **Quitar el `tx.comprasOc.update(...)`** de `registrarRecepcionTransaccional` (`logistica.repository.ts`). Las vistas no se pueden modificar: ese `UPDATE` haría fallar toda la recepción. El estado de la OC lo cambia Compras (ver "Pendiente").
2. **No ejecutar `prisma db push`, `migrate` ni el seed contra estas vistas**: el seed borra e inserta en `comprasOc`, y eso falla sobre una vista. Las tablas `test_log_compras_oc*` pueden quedar para pruebas locales.

## Pendiente (acordar antes de programar)

- Endpoint de Compras para que Logística informe la recepción y la OC pase a `COMPLETADA` o `CON_PROBLEMAS`, con API key por módulo, igual que Inventario.
- Equivalencia de estados propuesta: `CONFORME` → `COMPLETADA`; `PARCIAL` o `CON_OBSERVACIONES` → `CON_PROBLEMAS`.
