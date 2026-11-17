-- Integración con Logística: órdenes de compra para la recepción en muelle.
--
-- Logística lee hoy las OC desde sus tablas de prueba
-- logistica.test_log_compras_oc y logistica.test_log_compras_oc_detalle.
-- Estas vistas exponen nuestras OC reales con las MISMAS columnas, así que en
-- su Prisma solo cambian el @@map y el @@schema:
--   ComprasOc        -> @@map("v_oc_recepcion")          @@schema("compras")
--   ComprasOcDetalle -> @@map("v_oc_recepcion_detalle")  @@schema("compras")
--
-- Son de solo lectura: Logística no escribe en compras. Para cerrar la OC
-- después de recibir, se usará un endpoint de Compras (pendiente).
--
-- Se pueden volver a ejecutar sin problema (CREATE OR REPLACE).

BEGIN;
SET LOCAL search_path TO compras;

-- Cabecera: OC emitidas que esperan recepción.
-- CON_PROBLEMAS también se incluye, porque puede llegar el resto en otra guía.
CREATE OR REPLACE VIEW v_oc_recepcion AS
SELECT
  oc.id_oc,
  oc.id_proveedor,
  p.razon_social::text                         AS proveedor,
  COALESCE(oc.fecha_emision, oc.fecha_creacion) AS fecha,
  oc.estado::text                               AS estado
FROM compras_oc oc
JOIN compras_proveedor p ON p.id_proveedor = oc.id_proveedor
WHERE oc.estado IN ('EMITIDA', 'CON_PROBLEMAS');

COMMENT ON VIEW v_oc_recepcion IS
  'Solo lectura para Logística: OC emitidas por recibir. Mismas columnas que logistica.test_log_compras_oc.';

-- Detalle: una fila por producto de la OC.
-- Si una OC trae el mismo producto en varias líneas (vienen de distintas SC),
-- se suman, porque Logística recibe por producto.
CREATE OR REPLACE VIEW v_oc_recepcion_detalle AS
SELECT
  MIN(d.id_detalle)        AS id,
  d.id_oc,
  d.id_producto,
  SUM(d.cantidad)::integer AS cantidad_esperada
FROM compras_detalle d
JOIN v_oc_recepcion oc ON oc.id_oc = d.id_oc
GROUP BY d.id_oc, d.id_producto;

COMMENT ON VIEW v_oc_recepcion_detalle IS
  'Solo lectura para Logística: líneas por producto de v_oc_recepcion. Mismas columnas que logistica.test_log_compras_oc_detalle.';

COMMIT;
