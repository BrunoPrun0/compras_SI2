-- Integración con Inventario (ver docs/decisiones.md §1):
--  1. Cantidades enteras, igual que Inventario (los sets no se fraccionan).
--  2. FK de las líneas de SC y OC hacia inventario.inv_producto (otro schema).
-- Si VALIDATE falla, hay líneas con id_producto inexistente: corregirlas y reejecutar.

BEGIN;
SET LOCAL search_path TO compras;

-- subtotal_linea depende de cantidad: se elimina y se recrea para poder cambiar el tipo
ALTER TABLE compras_detalle DROP COLUMN subtotal_linea;
ALTER TABLE compras_sc_detalle ALTER COLUMN cantidad TYPE INTEGER USING round(cantidad)::integer;
ALTER TABLE compras_detalle    ALTER COLUMN cantidad TYPE INTEGER USING round(cantidad)::integer;
ALTER TABLE compras_detalle
  ADD COLUMN subtotal_linea NUMERIC(14,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED;

ALTER TABLE compras_sc_detalle
  ADD CONSTRAINT fk_compras_sc_det_producto
  FOREIGN KEY (id_producto) REFERENCES inventario.inv_producto(id_producto) NOT VALID;
ALTER TABLE compras_detalle
  ADD CONSTRAINT fk_compras_det_producto
  FOREIGN KEY (id_producto) REFERENCES inventario.inv_producto(id_producto) NOT VALID;

ALTER TABLE compras_sc_detalle VALIDATE CONSTRAINT fk_compras_sc_det_producto;
ALTER TABLE compras_detalle    VALIDATE CONSTRAINT fk_compras_det_producto;

COMMIT;
