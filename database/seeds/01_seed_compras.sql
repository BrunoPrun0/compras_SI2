-- =============================================================================
-- Seed Sprint 2 del módulo Compras: >= 10 registros por cada tabla compras_*.
--
-- LO EJECUTA UNA SOLA PERSONA DEL EQUIPO (responsable del backend), avisando
-- antes por el canal del equipo. Corre sobre la BD COMPARTIDA del profesor.
-- En DBeaver: ejecutar el archivo completo con Alt+X (Execute script).
--
-- - NUNCA borra ni modifica datos existentes: solo inserta lo que falta.
-- - Idempotente: se puede volver a ejecutar sin duplicar nada.
--     proveedores  -> ON CONFLICT (rut_nit) DO NOTHING
--     SC           -> clave natural (id_empleado, fecha_solicitud)
--     OC           -> clave natural (id_proveedor, fecha_creacion)
--   Las líneas y el historial de una SC/OC solo se insertan en la misma
--   ejecución en que se crea su cabecera.
-- - Todo en una transacción: si algo falla, no queda nada a medias.
-- - Sin tablas temporales: cada sentencia es independiente, así funciona igual
--   aunque el cliente (DBeaver) divida el script o use el pooler de Neon.
--
-- Requisitos:
--   * database/schema/01, 02 y 03 ya ejecutados.
--   * Productos 1..37 en inventario.inv_producto (catálogo real de Inventario).
--   * Empleados 301..310. RRHH aún no publica rrhh_empleado (27/10/2026); se usan
--     los ids de logistica.test_log_rrhh_empleado, la misma tabla que lee el
--     backend (RRHH_EMPLEADO_TABLE). Revisar cuando RRHH publique su tabla.
--
-- Fechas: se escriben en hora de Chile y se guardan en UTC (convención del
-- backend, ver backend/src/common/fechas.ts). Folios: SC-AAAA-NNNNN / OC-AAAA-NNNNN.
-- Roles en los datos: gestores 306 y 308; compradores 305 y 307.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Proveedores (RUT normalizado y con dígito verificador válido, V1)
-- -----------------------------------------------------------------------------
INSERT INTO compras.compras_proveedor (rut_nit, razon_social, email, telefono, direccion, estado) VALUES
  ('76111222-8', 'Distribuidora Bloques del Pacífico SpA', 'ventas@bloquespacifico.cl',  '+56 2 2345 6701', 'Av. Libertador Bernardo O''Higgins 1234, Santiago', 'ACTIVO'),
  ('77845310-K', 'Importadora Brick Andes Ltda.',          'contacto@brickandes.cl',     '+56 2 2456 7802', 'Av. Vicuña Mackenna 4560, Macul',                   'ACTIVO'),
  ('96512730-5', 'Juguetes Mayoristas del Norte S.A.',     'pedidos@jmnorte.cl',         '+56 55 245 6703', 'Av. Grecia 1890, Antofagasta',                      'ACTIVO'),
  ('76398451-6', 'Comercial Ladrillos de Colores SpA',     'ventas@ladrilloscolores.cl', '+56 2 2567 8904', 'Av. Américo Vespucio 1501, Cerrillos',              'ACTIVO'),
  ('77203964-6', 'Toy Logistics Chile SpA',                'comercial@toylogistics.cl',  '+56 2 2678 9005', 'Camino a Melipilla 9870, Maipú',                    'ACTIVO'),
  ('76654128-3', 'Importaciones Galaxia Ltda.',            'ventas@galaxiaimport.cl',    '+56 32 268 9106', 'Av. Brasil 2150, Valparaíso',                       'ACTIVO'),
  ('96871240-3', 'Distribuidora Santiago Kids S.A.',       'compras@santiagokids.cl',    '+56 2 2789 0107', 'Av. Providencia 2330, Providencia',                 'ACTIVO'),
  ('77519306-9', 'Bloques y Sets Antofagasta SpA',         'ventas@bysantofagasta.cl',   '+56 55 289 0208', 'Av. Argentina 1745, Antofagasta',                   'ACTIVO'),
  ('76045873-2', 'Comercializadora Austral Toys Ltda.',    NULL,                         '+56 61 290 1309', 'Av. Bulnes 0450, Punta Arenas',                     'ACTIVO'),
  ('77962415-3', 'Importadora Valparaíso Hobby SpA',       'hola@valpohobby.cl',         NULL,              NULL,                                                'ACTIVO'),
  ('76287549-7', 'Juguetería Mayorista Los Andes Ltda.',   'ventas@losandesjuguetes.cl', '+56 34 242 3410', 'Calle Esmeralda 345, Los Andes',                    'INACTIVO'),
  ('96730582-0', 'Distribuidora Atacama Juegos SpA',       NULL,                         '+56 52 252 4511', 'Av. Copayapu 980, Copiapó',                         'INACTIVO')
ON CONFLICT (rut_nit) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Solicitudes y órdenes de compra, con sus líneas e historial (un solo bloque)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r        RECORD;
  v_faltan INT;
  v_sc     JSONB := '{}';  -- clave de SC del seed -> id_solicitud (existente o recién creada)
  v_id     INT;
  v_prov   INT;
  v_ts     TIMESTAMP;
  v_envio  TIMESTAMP;
  v_res    TIMESTAMP;
  v_emi    TIMESTAMP;
  v_fin    TIMESTAMP;
  v_sub    NUMERIC;
BEGIN
  -- Verificaciones previas: si falla, no se inserta nada
  SELECT count(*) INTO v_faltan
  FROM generate_series(1, 37) g(id)
  WHERE NOT EXISTS (SELECT 1 FROM inventario.inv_producto p WHERE p.id_producto = g.id);
  IF v_faltan > 0 THEN
    RAISE EXCEPTION 'Faltan % productos (ids 1..37) en inventario.inv_producto', v_faltan;
  END IF;

  SELECT count(*) INTO v_faltan
  FROM generate_series(301, 310) g(id)
  WHERE NOT EXISTS (SELECT 1 FROM logistica.test_log_rrhh_empleado e WHERE e.id_empleado = g.id);
  IF v_faltan > 0 THEN
    RAISE EXCEPTION 'Faltan % empleados (ids 301..310) en la tabla de empleados', v_faltan;
  END IF;

  ---------------------------------------------------------------- SC
  FOR r IN
    SELECT * FROM (VALUES
      ('S01', 301, TIMESTAMP '2026-09-01 09:15', 'Reposición temporada escolar: sets City más vendidos', 'APROBADA',  306, TIMESTAMP '2026-09-01 16:00', NULL),
      ('S02', 302, TIMESTAMP '2026-09-03 10:30', 'Quiebre de stock en sets Star Wars de alto valor',     'APROBADA',  306, TIMESTAMP '2026-09-04 11:00', NULL),
      ('S03', 303, TIMESTAMP '2026-09-08 12:00', 'Vitrina Friends para tienda Antofagasta',              'APROBADA',  308, TIMESTAMP '2026-09-09 09:30', NULL),
      ('S04', 304, TIMESTAMP '2026-09-15 15:45', 'Sets Marvel para campaña Día del Niño',                'APROBADA',  308, TIMESTAMP '2026-09-16 10:00', NULL),
      ('S05', 301, TIMESTAMP '2026-09-22 08:50', 'Stock de seguridad de trenes City',                    'APROBADA',  306, TIMESTAMP '2026-09-22 17:20', NULL),
      ('S06', 309, TIMESTAMP '2026-09-29 11:10', 'Compra especial para coleccionistas Star Wars UCS',    'RECHAZADA', 306, TIMESTAMP '2026-09-30 12:00',
        'Presupuesto del trimestre agotado para sets sobre 6.000 piezas; reenviar en enero.'),
      ('S07', 310, TIMESTAMP '2026-10-02 14:00', 'Reposición Friends para Navidad',                      'APROBADA',  308, TIMESTAMP '2026-10-03 09:00', NULL),
      ('S08', 302, TIMESTAMP '2026-10-06 09:40', 'Sets Marvel para la vitrina principal',                'APROBADA',  306, TIMESTAMP '2026-10-07 10:15', NULL),
      ('S09', 303, TIMESTAMP '2026-10-13 16:20', 'Reposición City por alta rotación',                    'PENDIENTE', NULL, NULL, NULL),
      ('S10', 304, TIMESTAMP '2026-10-15 10:05', 'Sets Star Wars para preventa de noviembre',            'PENDIENTE', NULL, NULL, NULL),
      ('S11', 305, TIMESTAMP '2026-10-19 11:30', 'Sets Friends (ingresada dos veces por error)',         'ANULADA',   NULL, TIMESTAMP '2026-10-20 09:00', NULL),
      ('S12', 309, TIMESTAMP '2026-10-21 13:00', 'Ampliar surtido Marvel',                               'RECHAZADA', 308, TIMESTAMP '2026-10-22 09:00',
        'Ya hay una SC aprobada de Marvel con estos productos; esperar su recepción.'),
      ('S13', 310, TIMESTAMP '2026-10-23 17:45', NULL,                                                   'BORRADOR',  NULL, NULL, NULL),
      ('S14', 301, TIMESTAMP '2026-10-24 10:00', 'Reposición navideña City',                             'BORRADOR',  NULL, NULL, NULL)
    ) AS t(clave, id_empleado, fecha_local, motivo, estado, id_gestor, resol_local, motivo_rechazo)
  LOOP
    v_ts    := (r.fecha_local AT TIME ZONE 'America/Santiago') AT TIME ZONE 'UTC';
    v_envio := v_ts + INTERVAL '20 minutes';
    v_res   := (r.resol_local AT TIME ZONE 'America/Santiago') AT TIME ZONE 'UTC';

    v_id := NULL;
    SELECT id_solicitud INTO v_id FROM compras.compras_sc
    WHERE id_empleado = r.id_empleado AND fecha_solicitud = v_ts;

    IF v_id IS NULL THEN
      INSERT INTO compras.compras_sc (id_empleado, fecha_solicitud, motivo, estado, motivo_rechazo,
                                      id_gestor, fecha_resolucion)
      VALUES (r.id_empleado, v_ts, r.motivo, r.estado, r.motivo_rechazo, r.id_gestor,
              CASE WHEN r.estado IN ('APROBADA', 'RECHAZADA') THEN v_res END)
      RETURNING id_solicitud INTO v_id;

      UPDATE compras.compras_sc
      SET folio = 'SC-' || to_char(r.fecha_local, 'YYYY') || '-' || lpad(v_id::text, 5, '0')
      WHERE id_solicitud = v_id;

      -- Líneas: (clave SC, producto, cantidad)
      INSERT INTO compras.compras_sc_detalle (id_solicitud, id_producto, cantidad)
      SELECT v_id, l.id_producto, l.cantidad
      FROM (VALUES
        ('S01', 1, 10), ('S01', 2, 6),  ('S01', 4, 8),
        ('S02', 18, 4), ('S02', 20, 5), ('S02', 17, 3),
        ('S03', 21, 5), ('S03', 23, 6), ('S03', 25, 8),
        ('S04', 31, 3), ('S04', 33, 4), ('S04', 37, 6),
        ('S05', 3, 6),  ('S05', 9, 6),
        ('S06', 11, 2), ('S06', 12, 2),
        ('S07', 24, 10),('S07', 26, 8), ('S07', 28, 6),
        ('S08', 32, 4), ('S08', 34, 5), ('S08', 36, 3),
        ('S09', 1, 8),  ('S09', 5, 5),
        ('S10', 19, 6), ('S10', 20, 4),
        ('S11', 21, 3),
        ('S12', 31, 2), ('S12', 35, 3),
        ('S13', 7, 4),
        ('S14', 1, 12), ('S14', 6, 5),  ('S14', 10, 4)
      ) AS l(clave, id_producto, cantidad)
      WHERE l.clave = r.clave;

      -- Historial: creación, envío y resolución/anulación
      INSERT INTO compras.compras_historial_estado
        (tipo_documento, id_documento, estado_anterior, estado_nuevo, id_empleado, fecha, comentario)
      VALUES ('SC', v_id, NULL, 'BORRADOR', r.id_empleado, v_ts, NULL);

      IF r.estado <> 'BORRADOR' THEN
        INSERT INTO compras.compras_historial_estado
          (tipo_documento, id_documento, estado_anterior, estado_nuevo, id_empleado, fecha, comentario)
        VALUES ('SC', v_id, 'BORRADOR', 'PENDIENTE', r.id_empleado, v_envio, NULL);
      END IF;

      IF r.estado IN ('APROBADA', 'RECHAZADA') THEN
        INSERT INTO compras.compras_historial_estado
          (tipo_documento, id_documento, estado_anterior, estado_nuevo, id_empleado, fecha, comentario)
        VALUES ('SC', v_id, 'PENDIENTE', r.estado, r.id_gestor, v_res, r.motivo_rechazo);
      ELSIF r.estado = 'ANULADA' THEN
        INSERT INTO compras.compras_historial_estado
          (tipo_documento, id_documento, estado_anterior, estado_nuevo, id_empleado, fecha, comentario)
        VALUES ('SC', v_id, 'PENDIENTE', 'ANULADA', r.id_empleado, v_res, NULL);
      END IF;
    END IF;

    v_sc := v_sc || jsonb_build_object(r.clave, v_id);
  END LOOP;

  ---------------------------------------------------------------- OC
  FOR r IN
    SELECT * FROM (VALUES
      -- clave, RUT proveedor, comprador, creación, estado, emisión, entrega esperada, recepción real, cierre (recepción/cancelación), comentario de cierre
      ('O01', '76111222-8', 305, TIMESTAMP '2026-09-02 10:00', 'COMPLETADA',    TIMESTAMP '2026-09-02 12:00', DATE '2026-09-12', DATE '2026-09-11', TIMESTAMP '2026-09-11 17:00',
        'Recepción conforme registrada por Logística'),
      ('O02', '77845310-K', 305, TIMESTAMP '2026-09-05 09:00', 'COMPLETADA',    TIMESTAMP '2026-09-05 11:00', DATE '2026-09-15', DATE '2026-09-19', TIMESTAMP '2026-09-19 16:30',
        'Recepción conforme registrada por Logística (con atraso)'),
      ('O03', '96512730-5', 307, TIMESTAMP '2026-09-10 10:00', 'CON_PROBLEMAS', TIMESTAMP '2026-09-10 15:00', DATE '2026-09-22', NULL,              TIMESTAMP '2026-09-23 18:00',
        'Recepción no conforme: producto 23 recibido 4 de 6; 1 unidad del producto 21 dañada (caja aplastada)'),
      ('O04', '76398451-6', 307, TIMESTAMP '2026-09-17 09:30', 'EMITIDA',       TIMESTAMP '2026-09-17 12:00', DATE '2026-10-10', NULL,              NULL, NULL),
      ('O05', '76111222-8', 305, TIMESTAMP '2026-09-23 10:00', 'CANCELADA',     TIMESTAMP '2026-09-23 12:00', DATE '2026-10-05', NULL,              TIMESTAMP '2026-09-25 10:00',
        'Proveedor informó quiebre de stock de trenes'),
      ('O06', '77203964-6', 305, TIMESTAMP '2026-09-28 11:00', 'EMITIDA',       TIMESTAMP '2026-09-28 15:00', DATE '2026-11-05', NULL,              NULL, NULL),
      ('O07', '96512730-5', 307, TIMESTAMP '2026-10-04 09:00', 'COMPLETADA',    TIMESTAMP '2026-10-04 10:30', DATE '2026-10-14', DATE '2026-10-14', TIMESTAMP '2026-10-14 12:00',
        'Recepción conforme registrada por Logística'),
      ('O08', '76654128-3', 307, TIMESTAMP '2026-10-08 10:00', 'EMITIDA',       TIMESTAMP '2026-10-08 16:00', DATE '2026-11-10', NULL,              NULL, NULL),
      ('O09', '77845310-K', 305, TIMESTAMP '2026-10-12 09:00', 'BORRADOR',      NULL,                         NULL,              NULL,              NULL, NULL),
      ('O10', '96871240-3', 307, TIMESTAMP '2026-10-16 10:00', 'CANCELADA',     NULL,                         NULL,              NULL,              TIMESTAMP '2026-10-17 09:00',
        'Se consolidará con otra orden del mismo proveedor'),
      ('O11', '76398451-6', 305, TIMESTAMP '2026-10-20 10:00', 'EMITIDA',       TIMESTAMP '2026-10-20 12:00', DATE '2026-10-30', NULL,              NULL, NULL),
      ('O12', '77519306-9', 307, TIMESTAMP '2026-10-22 11:00', 'BORRADOR',      NULL,                         NULL,              NULL,              NULL, NULL)
    ) AS t(clave, rut, id_empleado, crea_local, estado, emi_local, entrega, recepcion, fin_local, comentario)
  LOOP
    SELECT id_proveedor INTO STRICT v_prov FROM compras.compras_proveedor WHERE rut_nit = r.rut;
    v_ts  := (r.crea_local AT TIME ZONE 'America/Santiago') AT TIME ZONE 'UTC';
    v_emi := (r.emi_local  AT TIME ZONE 'America/Santiago') AT TIME ZONE 'UTC';
    v_fin := (r.fin_local  AT TIME ZONE 'America/Santiago') AT TIME ZONE 'UTC';

    v_id := NULL;
    SELECT id_oc INTO v_id FROM compras.compras_oc WHERE id_proveedor = v_prov AND fecha_creacion = v_ts;
    CONTINUE WHEN v_id IS NOT NULL;   -- ya cargada en una ejecución anterior

    INSERT INTO compras.compras_oc (id_proveedor, id_empleado, fecha_creacion, fecha_emision,
                                    fecha_entrega_esperada, fecha_recepcion_real, estado, motivo_cancelacion)
    VALUES (v_prov, r.id_empleado, v_ts, v_emi, r.entrega, r.recepcion, r.estado,
            CASE WHEN r.estado = 'CANCELADA' THEN r.comentario END)
    RETURNING id_oc INTO v_id;

    UPDATE compras.compras_oc
    SET folio = 'OC-' || to_char(r.crea_local, 'YYYY') || '-' || lpad(v_id::text, 5, '0')
    WHERE id_oc = v_id;

    -- Líneas respaldadas por líneas de SC APROBADA (V7) con cantidad <= solicitada (V8):
    -- (clave OC, clave SC, producto, cantidad, precio unitario CLP)
    INSERT INTO compras.compras_detalle (id_oc, id_sc_detalle, id_producto, cantidad, precio_unitario)
    SELECT v_id, d.id_sc_detalle, l.id_producto, l.cantidad, l.precio
    FROM (VALUES
      ('O01', 'S01', 1, 10, 58000),  ('O01', 'S01', 2, 6, 62000),
      ('O02', 'S02', 18, 4, 210000), ('O02', 'S02', 20, 5, 140000),
      ('O03', 'S03', 21, 5, 130000), ('O03', 'S03', 23, 6, 115000),
      ('O04', 'S04', 31, 3, 280000), ('O04', 'S04', 33, 4, 220000),
      ('O05', 'S05', 3, 6, 90000),   ('O05', 'S05', 9, 6, 85000),
      ('O06', 'S05', 3, 6, 92000),   ('O06', 'S05', 9, 6, 86000),   -- reusa las líneas de O05 (cancelada)
      ('O07', 'S07', 24, 10, 95000), ('O07', 'S07', 26, 8, 82000),
      ('O08', 'S08', 32, 4, 240000), ('O08', 'S08', 34, 5, 190000),
      ('O09', 'S01', 4, 8, 88000),
      ('O10', 'S07', 28, 6, 78000),  -- cancelada: la línea queda disponible para otra OC
      ('O11', 'S02', 17, 3, 200000), ('O11', 'S04', 37, 6, 150000),
      ('O12', 'S03', 25, 8, 90000),  ('O12', 'S08', 36, 3, 180000)
    ) AS l(clave, clave_sc, id_producto, cantidad, precio)
    JOIN compras.compras_sc_detalle d
      ON d.id_solicitud = (v_sc ->> l.clave_sc)::int AND d.id_producto = l.id_producto
    WHERE l.clave = r.clave;

    -- Totales: subtotal = Σ líneas, IVA 19 % redondeado, total
    SELECT COALESCE(SUM(subtotal_linea), 0) INTO v_sub FROM compras.compras_detalle WHERE id_oc = v_id;
    UPDATE compras.compras_oc
    SET subtotal = v_sub, impuesto = round(v_sub * 0.19), total = v_sub + round(v_sub * 0.19)
    WHERE id_oc = v_id;

    -- Historial
    INSERT INTO compras.compras_historial_estado
      (tipo_documento, id_documento, estado_anterior, estado_nuevo, id_empleado, fecha, comentario)
    VALUES ('OC', v_id, NULL, 'BORRADOR', r.id_empleado, v_ts, NULL);

    IF v_emi IS NOT NULL THEN
      INSERT INTO compras.compras_historial_estado
        (tipo_documento, id_documento, estado_anterior, estado_nuevo, id_empleado, fecha, comentario)
      VALUES ('OC', v_id, 'BORRADOR', 'EMITIDA', r.id_empleado, v_emi, NULL);
    END IF;

    IF r.estado IN ('COMPLETADA', 'CON_PROBLEMAS') THEN
      -- La recepción la registra Logística (304 = Operador de Recepción y Despacho)
      INSERT INTO compras.compras_historial_estado
        (tipo_documento, id_documento, estado_anterior, estado_nuevo, id_empleado, fecha, comentario)
      VALUES ('OC', v_id, 'EMITIDA', r.estado, 304, v_fin, r.comentario);
    ELSIF r.estado = 'CANCELADA' THEN
      INSERT INTO compras.compras_historial_estado
        (tipo_documento, id_documento, estado_anterior, estado_nuevo, id_empleado, fecha, comentario)
      VALUES ('OC', v_id, CASE WHEN v_emi IS NULL THEN 'BORRADOR' ELSE 'EMITIDA' END, 'CANCELADA',
              r.id_empleado, v_fin, r.comentario);
    END IF;
  END LOOP;
END $$;

-- Resumen de lo que hay después de la carga
SELECT 'compras_proveedor' AS tabla, count(*) AS filas FROM compras.compras_proveedor
UNION ALL SELECT 'compras_sc', count(*) FROM compras.compras_sc
UNION ALL SELECT 'compras_sc_detalle', count(*) FROM compras.compras_sc_detalle
UNION ALL SELECT 'compras_oc', count(*) FROM compras.compras_oc
UNION ALL SELECT 'compras_detalle', count(*) FROM compras.compras_detalle
UNION ALL SELECT 'compras_historial_estado', count(*) FROM compras.compras_historial_estado;

COMMIT;
