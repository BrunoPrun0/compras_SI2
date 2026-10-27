-- Ajustes según docs/decisiones.md: estados nuevos de SC y OC, folios,
-- datos para KPIs y validaciones a nivel de BD.
-- Ejecutar una sola vez sobre la BD donde ya corrió 01_compras.sql.
-- Asume que no hay filas con estados que dejan de existir (EN_RECEPCION).

BEGIN;

-- SC: estado BORRADOR, folio, quién y cuándo la resolvió
ALTER TABLE compras_sc DROP CONSTRAINT IF EXISTS compras_sc_estado_check;
ALTER TABLE compras_sc
  ADD CONSTRAINT compras_sc_estado_check
  CHECK (estado IN ('BORRADOR','PENDIENTE','APROBADA','RECHAZADA','ANULADA'));
ALTER TABLE compras_sc ALTER COLUMN estado SET DEFAULT 'BORRADOR';
ALTER TABLE compras_sc ALTER COLUMN motivo DROP NOT NULL;  -- un borrador puede estar incompleto
ALTER TABLE compras_sc
  ADD COLUMN folio            VARCHAR(20) UNIQUE,
  ADD COLUMN id_gestor        INT,                         -- FK a rrhh_empleado: pendiente
  ADD COLUMN fecha_resolucion TIMESTAMP,
  ADD CONSTRAINT chk_sc_motivo_rechazo
    CHECK (estado <> 'RECHAZADA' OR motivo_rechazo IS NOT NULL),
  ADD CONSTRAINT chk_sc_motivo_enviada
    CHECK (estado IN ('BORRADOR','ANULADA') OR motivo IS NOT NULL);

-- OC: estados nuevos, folio, fecha real de recepción (KPI de plazos)
ALTER TABLE compras_oc DROP CONSTRAINT IF EXISTS compras_oc_estado_check;
ALTER TABLE compras_oc
  ADD CONSTRAINT compras_oc_estado_check
  CHECK (estado IN ('BORRADOR','EMITIDA','COMPLETADA','CON_PROBLEMAS','CANCELADA'));
ALTER TABLE compras_oc
  ADD COLUMN folio                VARCHAR(20) UNIQUE,
  ADD COLUMN fecha_creacion       TIMESTAMP NOT NULL DEFAULT now(),
  ADD COLUMN fecha_recepcion_real DATE,
  ADD COLUMN motivo_cancelacion   VARCHAR(300),
  ADD CONSTRAINT chk_oc_emitida_completa
    CHECK (estado IN ('BORRADOR','CANCELADA')
           OR (fecha_emision IS NOT NULL AND fecha_entrega_esperada IS NOT NULL)),
  ADD CONSTRAINT chk_oc_fecha_entrega
    CHECK (fecha_entrega_esperada IS NULL OR fecha_emision IS NULL
           OR fecha_entrega_esperada >= fecha_emision::date);

-- Historial: comentario libre (motivo de rechazo, cancelación, resolución)
ALTER TABLE compras_historial_estado ADD COLUMN comentario VARCHAR(300);

-- Índices para filtros y KPIs (los nombres de índice son únicos por schema,
-- por eso llevan prefijo compras_ para no chocar con otros grupos)
CREATE INDEX idx_compras_sc_estado        ON compras_sc (estado);
CREATE INDEX idx_compras_sc_empleado      ON compras_sc (id_empleado);
CREATE INDEX idx_compras_sc_det_solicitud ON compras_sc_detalle (id_solicitud);
CREATE INDEX idx_compras_sc_det_producto  ON compras_sc_detalle (id_producto);
CREATE INDEX idx_compras_oc_estado        ON compras_oc (estado);
CREATE INDEX idx_compras_oc_proveedor     ON compras_oc (id_proveedor);
CREATE INDEX idx_compras_det_oc           ON compras_detalle (id_oc);
CREATE INDEX idx_compras_det_sc_detalle   ON compras_detalle (id_sc_detalle);
CREATE INDEX idx_compras_hist_documento   ON compras_historial_estado (tipo_documento, id_documento);

COMMIT;
