-- Módulo Compras: tablas propias (versión ya ejecutada en la BD compartida).
-- Las FK hacia rrhh_empleado e inv_producto se agregan en 03_fk_externas.sql
-- cuando esas tablas existan.

BEGIN;

CREATE TABLE compras_proveedor (
  id_proveedor  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rut_nit       VARCHAR(20)  NOT NULL UNIQUE,
  razon_social  VARCHAR(150) NOT NULL,
  email         VARCHAR(120),
  telefono      VARCHAR(30),
  direccion     VARCHAR(200),
  estado        VARCHAR(10)  NOT NULL DEFAULT 'ACTIVO'
                CHECK (estado IN ('ACTIVO','INACTIVO'))
);

CREATE TABLE compras_sc (
  id_solicitud    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_empleado     INT NOT NULL,              -- FK a rrhh_empleado: pendiente
  fecha_solicitud TIMESTAMP NOT NULL DEFAULT now(),
  motivo          VARCHAR(300) NOT NULL,
  estado          VARCHAR(12) NOT NULL DEFAULT 'PENDIENTE'
                  CHECK (estado IN ('PENDIENTE','APROBADA','RECHAZADA','ANULADA')),
  motivo_rechazo  VARCHAR(300)
);

CREATE TABLE compras_sc_detalle (
  id_sc_detalle INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_solicitud  INT NOT NULL REFERENCES compras_sc(id_solicitud),
  id_producto   INT NOT NULL,                -- FK a inv_producto: pendiente
  cantidad      NUMERIC(12,2) NOT NULL CHECK (cantidad > 0)
);

CREATE TABLE compras_oc (
  id_oc                  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_proveedor           INT NOT NULL REFERENCES compras_proveedor(id_proveedor),
  id_empleado            INT NOT NULL,       -- comprador, FK pendiente
  fecha_emision          TIMESTAMP,
  fecha_entrega_esperada DATE,
  subtotal               NUMERIC(14,2) NOT NULL DEFAULT 0,
  impuesto               NUMERIC(14,2) NOT NULL DEFAULT 0,
  total                  NUMERIC(14,2) NOT NULL DEFAULT 0,
  estado                 VARCHAR(15) NOT NULL DEFAULT 'BORRADOR'
                         CHECK (estado IN ('BORRADOR','EMITIDA','EN_RECEPCION',
                                           'COMPLETADA','CANCELADA'))
);

CREATE TABLE compras_detalle (
  id_detalle      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_oc           INT NOT NULL REFERENCES compras_oc(id_oc),
  id_sc_detalle   INT NOT NULL REFERENCES compras_sc_detalle(id_sc_detalle), -- respaldo SC (HU4.1)
  id_producto     INT NOT NULL,              -- FK a inv_producto: pendiente
  cantidad        NUMERIC(12,2) NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(14,2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal_linea  NUMERIC(14,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);

CREATE TABLE compras_historial_estado (
  id_historial   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tipo_documento VARCHAR(2) NOT NULL CHECK (tipo_documento IN ('SC','OC')),
  id_documento   INT NOT NULL,
  estado_anterior VARCHAR(15),
  estado_nuevo   VARCHAR(15) NOT NULL,
  id_empleado    INT NOT NULL,
  fecha          TIMESTAMP NOT NULL DEFAULT now()
);

COMMIT;
