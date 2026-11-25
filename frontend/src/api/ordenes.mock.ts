// Datos de ejemplo para la pantalla de órdenes de compra mientras el backend no tenga /ordenes.
// Las filas copian el seed de la BD compartida (database/seeds/01_seed_compras.sql) y se arman
// con la misma forma que la API (types/api.ts). Las reglas imitan V7–V10 para que los errores
// se vean igual que con el backend. Los cambios viven en memoria: se pierden al recargar.
import type {
  EmpleadoRef,
  EstadoOc,
  HistorialItem,
  LineaDisponible,
  OrdenDetalle,
  OrdenEntrada,
  OrdenResumen,
  Paginado,
  Producto,
  Proveedor,
  ResultadoResolucion,
} from '../types/api';
import { ErrorApi } from './cliente';
import type { FiltrosOrdenes } from './ordenes';

// ---------- Maestros (seed) ----------

const EMPLEADOS: Record<number, string> = {
  301: 'Carlos Gómez',
  302: 'Juan Tapia',
  303: 'Loreto Silva',
  304: 'Esteban Paredes',
  305: 'Maximiliano Pizarro',
  306: 'Máximo Sazo',
  307: 'Nicolás Rojas',
  308: 'Daniela Infante',
  309: 'Javier Catalán',
  310: 'Bastián Salinas',
};

// [id, rut, razón social, activo]
const FILAS_PROVEEDOR: [number, string, string, boolean][] = [
  [1, '76111222-8', 'Distribuidora Bloques del Pacífico SpA', true],
  [2, '77845310-K', 'Importadora Brick Andes Ltda.', true],
  [3, '96512730-5', 'Juguetes Mayoristas del Norte S.A.', true],
  [4, '76398451-6', 'Comercial Ladrillos de Colores SpA', true],
  [5, '77203964-6', 'Toy Logistics Chile SpA', true],
  [6, '76654128-3', 'Importaciones Galaxia Ltda.', true],
  [7, '96871240-3', 'Distribuidora Santiago Kids S.A.', true],
  [8, '77519306-9', 'Bloques y Sets Antofagasta SpA', false],
  [9, '76045873-2', 'Comercializadora Austral Toys Ltda.', true],
  [10, '77962415-3', 'Importadora Valparaíso Hobby SpA', true],
  [11, '76287549-7', 'Juguetería Mayorista Los Andes Ltda.', false],
  [12, '96730582-0', 'Distribuidora Atacama Juegos SpA', true],
];

// [id, sku, nombre, colección, piezas]
const FILAS_PRODUCTO: [number, string, string, string, number][] = [
  [1, '60380-1', 'Downtown', 'City', 2010],
  [2, '60473-1', 'The City Tower', 'City', 1943],
  [3, '60470-1', 'Explorer Train', 'City', 1525],
  [4, '60271-1', 'Main Square', 'City', 1517],
  [5, '60434-1', 'Space Base and Rocket Launchpad', 'City', 1424],
  [9, '60336-1', 'Freight Train', 'City', 1153],
  [17, '75309-1', 'Republic Gunship', 'Star Wars', 3292],
  [18, '75290-1', 'Mos Eisley Cantina', 'Star Wars', 3187],
  [19, '75409-1', "Jango Fett's Firespray-Class Starship", 'Star Wars', 2970],
  [20, '75371-1', 'Chewbacca', 'Star Wars', 2319],
  [21, '42639-1', "Andrea's Modern Mansion", 'Friends', 2275],
  [23, '41732-1', 'Downtown Flower and Design Stores', 'Friends', 2010],
  [24, '41704-1', 'Main Street Building', 'Friends', 1682],
  [25, '41748-1', 'Heartlake City Community Center', 'Friends', 1513],
  [26, '42691-1', 'Garden Restaurant', 'Friends', 1465],
  [28, '41737-1', 'Beach Amusement Park', 'Friends', 1348],
  [31, '76269-1', 'Avengers Tower', 'Super Heroes Marvel', 5202],
  [32, '76210-1', 'Hulkbuster', 'Super Heroes Marvel', 4049],
  [33, '76178-1', 'Daily Bugle', 'Super Heroes Marvel', 3803],
  [34, '76262-1', "Captain America's Shield", 'Super Heroes Marvel', 3128],
  [35, '76294-1', 'The X-Mansion', 'Super Heroes Marvel', 3093],
  [36, '76354-1', 'S.H.I.E.L.D. Helicarrier', 'Super Heroes Marvel', 3057],
  [37, '76215-1', 'Black Panther', 'Super Heroes Marvel', 2961],
];

// ---------- Órdenes (seed) ----------

// [id, proveedor, comprador, estado, creación, emisión, entrega esperada, recepción real, motivo cancelación]
type FilaOc = [
  number,
  number,
  number,
  EstadoOc,
  string,
  string | null,
  string | null,
  string | null,
  string | null,
];
const FILAS_OC: FilaOc[] = [
  [
    1,
    1,
    305,
    'COMPLETADA',
    '2026-09-02T18:00:00Z',
    '2026-09-02T20:00:00Z',
    '2026-09-12',
    '2026-09-11',
    null,
  ],
  [
    2,
    2,
    305,
    'COMPLETADA',
    '2026-09-05T17:00:00Z',
    '2026-09-05T19:00:00Z',
    '2026-09-15',
    '2026-09-19',
    null,
  ],
  [
    3,
    3,
    307,
    'CON_PROBLEMAS',
    '2026-09-10T16:00:00Z',
    '2026-09-10T21:00:00Z',
    '2026-09-22',
    null,
    null,
  ],
  [4, 4, 307, 'EMITIDA', '2026-09-17T15:30:00Z', '2026-09-17T18:00:00Z', '2026-10-10', null, null],
  [
    5,
    1,
    305,
    'CANCELADA',
    '2026-09-23T16:00:00Z',
    '2026-09-23T18:00:00Z',
    '2026-10-05',
    null,
    'Proveedor informó quiebre de stock de trenes',
  ],
  [6, 5, 305, 'EMITIDA', '2026-09-28T17:00:00Z', '2026-09-28T21:00:00Z', '2026-11-05', null, null],
  [
    7,
    3,
    307,
    'COMPLETADA',
    '2026-10-04T15:00:00Z',
    '2026-10-04T16:30:00Z',
    '2026-10-14',
    '2026-10-14',
    null,
  ],
  [8, 6, 307, 'EMITIDA', '2026-10-08T16:00:00Z', '2026-10-08T22:00:00Z', '2026-11-10', null, null],
  [9, 2, 305, 'BORRADOR', '2026-10-12T15:00:00Z', null, null, null, null],
  [
    10,
    7,
    307,
    'CANCELADA',
    '2026-10-16T16:00:00Z',
    null,
    null,
    null,
    'Se consolidará con otra orden del mismo proveedor',
  ],
  [11, 4, 305, 'EMITIDA', '2026-10-20T16:00:00Z', '2026-10-20T18:00:00Z', '2026-10-30', null, null],
  [12, 8, 307, 'BORRADOR', '2026-10-22T17:00:00Z', null, null, null, null],
];

// [id detalle, id OC, id línea SC, folio SC, producto, cantidad, precio unitario]
const FILAS_DETALLE: [number, number, number, string, number, number, number][] = [
  [1, 1, 1, 'SC-2026-00001', 1, 10, 58000],
  [2, 1, 2, 'SC-2026-00001', 2, 6, 62000],
  [3, 2, 4, 'SC-2026-00002', 18, 4, 210000],
  [4, 2, 5, 'SC-2026-00002', 20, 5, 140000],
  [5, 3, 7, 'SC-2026-00003', 21, 5, 130000],
  [6, 3, 8, 'SC-2026-00003', 23, 6, 115000],
  [7, 4, 10, 'SC-2026-00004', 31, 3, 280000],
  [8, 4, 11, 'SC-2026-00004', 33, 4, 220000],
  [9, 5, 13, 'SC-2026-00005', 3, 6, 90000],
  [10, 5, 14, 'SC-2026-00005', 9, 6, 85000],
  [11, 6, 13, 'SC-2026-00005', 3, 6, 92000],
  [12, 6, 14, 'SC-2026-00005', 9, 6, 86000],
  [13, 7, 17, 'SC-2026-00007', 24, 10, 95000],
  [14, 7, 18, 'SC-2026-00007', 26, 8, 82000],
  [15, 8, 20, 'SC-2026-00008', 32, 4, 240000],
  [16, 8, 21, 'SC-2026-00008', 34, 5, 190000],
  [17, 9, 3, 'SC-2026-00001', 4, 8, 88000],
  [18, 10, 19, 'SC-2026-00007', 28, 6, 78000],
  [19, 11, 6, 'SC-2026-00002', 17, 3, 200000],
  [20, 11, 12, 'SC-2026-00004', 37, 6, 150000],
  [21, 12, 9, 'SC-2026-00003', 25, 8, 90000],
  [22, 12, 22, 'SC-2026-00008', 36, 3, 180000],
];

// [id OC, anterior, nuevo, empleado, fecha, comentario]
const FILAS_HISTORIAL: [number, EstadoOc | null, EstadoOc, number, string, string | null][] = [
  [1, null, 'BORRADOR', 305, '2026-09-02T18:00:00Z', null],
  [1, 'BORRADOR', 'EMITIDA', 305, '2026-09-02T20:00:00Z', null],
  [
    1,
    'EMITIDA',
    'COMPLETADA',
    304,
    '2026-09-11T23:00:00Z',
    'Recepción conforme registrada por Logística',
  ],
  [2, null, 'BORRADOR', 305, '2026-09-05T17:00:00Z', null],
  [2, 'BORRADOR', 'EMITIDA', 305, '2026-09-05T19:00:00Z', null],
  [
    2,
    'EMITIDA',
    'COMPLETADA',
    304,
    '2026-09-19T22:30:00Z',
    'Recepción conforme registrada por Logística (con atraso)',
  ],
  [3, null, 'BORRADOR', 307, '2026-09-10T16:00:00Z', null],
  [3, 'BORRADOR', 'EMITIDA', 307, '2026-09-10T21:00:00Z', null],
  [
    3,
    'EMITIDA',
    'CON_PROBLEMAS',
    304,
    '2026-09-24T00:00:00Z',
    "Recepción no conforme: Downtown Flower and Design Stores recibido 4 de 6; 1 unidad de Andrea's Modern Mansion dañada (caja aplastada)",
  ],
  [4, null, 'BORRADOR', 307, '2026-09-17T15:30:00Z', null],
  [4, 'BORRADOR', 'EMITIDA', 307, '2026-09-17T18:00:00Z', null],
  [5, null, 'BORRADOR', 305, '2026-09-23T16:00:00Z', null],
  [5, 'BORRADOR', 'EMITIDA', 305, '2026-09-23T18:00:00Z', null],
  [
    5,
    'EMITIDA',
    'CANCELADA',
    305,
    '2026-09-25T16:00:00Z',
    'Proveedor informó quiebre de stock de trenes',
  ],
  [6, null, 'BORRADOR', 305, '2026-09-28T17:00:00Z', null],
  [6, 'BORRADOR', 'EMITIDA', 305, '2026-09-28T21:00:00Z', null],
  [7, null, 'BORRADOR', 307, '2026-10-04T15:00:00Z', null],
  [7, 'BORRADOR', 'EMITIDA', 307, '2026-10-04T16:30:00Z', null],
  [
    7,
    'EMITIDA',
    'COMPLETADA',
    304,
    '2026-10-14T18:00:00Z',
    'Recepción conforme registrada por Logística',
  ],
  [8, null, 'BORRADOR', 307, '2026-10-08T16:00:00Z', null],
  [8, 'BORRADOR', 'EMITIDA', 307, '2026-10-08T22:00:00Z', null],
  [9, null, 'BORRADOR', 305, '2026-10-12T15:00:00Z', null],
  [10, null, 'BORRADOR', 307, '2026-10-16T16:00:00Z', null],
  [
    10,
    'BORRADOR',
    'CANCELADA',
    307,
    '2026-10-17T15:00:00Z',
    'Se consolidará con otra orden del mismo proveedor',
  ],
  [11, null, 'BORRADOR', 305, '2026-10-20T16:00:00Z', null],
  [11, 'BORRADOR', 'EMITIDA', 305, '2026-10-20T18:00:00Z', null],
  [12, null, 'BORRADOR', 307, '2026-10-22T17:00:00Z', null],
];

// Líneas de SC aprobadas sin OC activa. La primera es real (su OC se canceló);
// las demás son de ejemplo para poder probar el formulario.
// [id línea SC, folio SC, solicitante, producto, cantidad]
const FILAS_DISPONIBLES: [number, string, number, number, number][] = [
  [19, 'SC-2026-00007', 310, 28, 6],
  [901, 'SC-2026-00011', 302, 5, 4],
  [902, 'SC-2026-00011', 302, 19, 2],
  [903, 'SC-2026-00012', 308, 35, 3],
  [904, 'SC-2026-00012', 308, 1, 8],
];

// ---------- Armado con la forma de la API ----------

const IVA = 0.19;
const ref = (id: number): EmpleadoRef => ({
  idEmpleado: id,
  nombre: EMPLEADOS[id] ?? `Empleado ${id}`,
});

const proveedores = new Map<number, Proveedor>(
  FILAS_PROVEEDOR.map(([id, rut, razon, activo]) => [
    id,
    {
      idProveedor: id,
      rutNit: rut,
      razonSocial: razon,
      email: null,
      telefono: null,
      direccion: null,
      estado: activo ? 'ACTIVO' : 'INACTIVO',
    },
  ]),
);

const productos = new Map<number, Producto>(
  FILAS_PRODUCTO.map(([id, sku, nombre, coleccion, piezas]) => [
    id,
    {
      idProducto: id,
      sku,
      nombre,
      coleccion,
      cantPiezas: piezas,
      activo: true,
      precioReferencia: null,
    },
  ]),
);

let siguienteHistorial = 1;
const itemHistorial = (
  anterior: EstadoOc | null,
  nuevo: EstadoOc,
  idEmpleado: number,
  fecha: string,
  comentario: string | null,
): HistorialItem => ({
  idHistorial: siguienteHistorial++,
  estadoAnterior: anterior,
  estadoNuevo: nuevo,
  usuario: ref(idEmpleado),
  fecha,
  comentario,
});

function recalcular(oc: OrdenDetalle) {
  oc.lineas.forEach((l) => (l.subtotalLinea = l.cantidad * l.precioUnitario));
  oc.subtotal = oc.lineas.reduce((s, l) => s + l.subtotalLinea, 0);
  oc.impuesto = Math.round(oc.subtotal * IVA);
  oc.total = oc.subtotal + oc.impuesto;
}

const folio = (id: number) => `OC-2026-${String(id).padStart(5, '0')}`;

const ordenes: OrdenDetalle[] = FILAS_OC.map(
  ([id, idProv, idComp, estado, creacion, emision, entrega, recepcion, motivo]) => {
    const p = proveedores.get(idProv)!;
    const oc: OrdenDetalle = {
      idOc: id,
      folio: folio(id),
      proveedor: { idProveedor: p.idProveedor, rutNit: p.rutNit, razonSocial: p.razonSocial },
      comprador: ref(idComp),
      estado,
      fechaCreacion: creacion,
      fechaEmision: emision,
      fechaEntregaEsperada: entrega,
      fechaRecepcionReal: recepcion,
      motivoCancelacion: motivo,
      lineas: FILAS_DETALLE.filter((d) => d[1] === id).map(
        ([idDet, , idSc, folioSc, idProd, cant, precio]) => ({
          idDetalle: idDet,
          idScDetalle: idSc,
          folioSc,
          producto: productos.get(idProd)!,
          cantidad: cant,
          precioUnitario: precio,
          subtotalLinea: 0,
        }),
      ),
      subtotal: 0,
      impuesto: 0,
      total: 0,
      historial: FILAS_HISTORIAL.filter((h) => h[0] === id).map(([, a, n, e, f, c]) =>
        itemHistorial(a, n, e, f, c),
      ),
    };
    recalcular(oc);
    return oc;
  },
);

// Precio de referencia = último precio pagado en una OC EMITIDA/COMPLETADA (como el backend)
for (const oc of [...ordenes].sort((a, b) =>
  (a.fechaEmision ?? '').localeCompare(b.fechaEmision ?? ''),
)) {
  if (oc.estado !== 'EMITIDA' && oc.estado !== 'COMPLETADA') continue;
  for (const l of oc.lineas) l.producto.precioReferencia = l.precioUnitario;
}

let disponibles: LineaDisponible[] = FILAS_DISPONIBLES.map(
  ([idSc, folioSc, idSol, idProd, cant]) => ({
    idScDetalle: idSc,
    folioSc,
    solicitante: ref(idSol),
    producto: productos.get(idProd)!,
    cantidadSolicitada: cant,
  }),
);

let siguienteOc = Math.max(...ordenes.map((o) => o.idOc)) + 1;
let siguienteDetalle = Math.max(...FILAS_DETALLE.map((d) => d[0])) + 1;

// ---------- Utilidades ----------

const esperar = <T>(valor: T, ms = 250) =>
  new Promise<T>((r) => setTimeout(() => r(structuredClone(valor)), ms));

const fallar = (status: number, code: string, message: string, details?: Record<string, unknown>) =>
  Promise.reject(new ErrorApi(status, code, message, details));

const ahora = () => new Date().toISOString();
const hoyChile = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());

// El comprador de una OC nueva es el empleado elegido en la barra superior
function compradorActual(): EmpleadoRef {
  try {
    const guardado = JSON.parse(
      localStorage.getItem('compras.empleadoActual') ?? 'null',
    ) as EmpleadoRef | null;
    if (guardado) return guardado;
  } catch {
    // sin almacenamiento: se usa un comprador del seed
  }
  return ref(305);
}

function buscar(id: number): OrdenDetalle | undefined {
  return ordenes.find((o) => o.idOc === id);
}

function cambiarEstado(
  oc: OrdenDetalle,
  nuevo: EstadoOc,
  comentario: string | null,
  idEmpleado = compradorActual().idEmpleado,
) {
  oc.historial.push(itemHistorial(oc.estado, nuevo, idEmpleado, ahora(), comentario));
  oc.estado = nuevo;
}

/** Devuelve las líneas de la OC a la lista de disponibles (al cancelar o al editar un borrador). */
function liberarLineas(oc: OrdenDetalle) {
  for (const l of oc.lineas) {
    if (disponibles.some((d) => d.idScDetalle === l.idScDetalle)) continue;
    const original = FILAS_DISPONIBLES.find((d) => d[0] === l.idScDetalle);
    disponibles.push({
      idScDetalle: l.idScDetalle,
      folioSc: l.folioSc,
      solicitante: ref(original?.[2] ?? 301),
      producto: l.producto,
      cantidadSolicitada: original?.[4] ?? l.cantidad,
    });
  }
}

/** V7 y V8 sobre las líneas de entrada. Devuelve las líneas armadas o un error. */
function validarLineas(datos: OrdenEntrada, propias: number[] = []) {
  if (datos.lineas.length === 0)
    return { error: fallar(400, 'OC_INCOMPLETA', 'La orden debe tener al menos una línea.') };
  const armadas = [];
  for (const entrada of datos.lineas) {
    const disp = disponibles.find((d) => d.idScDetalle === entrada.idScDetalle);
    if (!disp && !propias.includes(entrada.idScDetalle)) {
      return {
        error: fallar(
          409,
          'OC_LINEA_YA_USADA',
          'Una de las líneas ya está en otra orden de compra activa.',
        ),
      };
    }
    const max =
      disp?.cantidadSolicitada ??
      FILAS_DISPONIBLES.find((d) => d[0] === entrada.idScDetalle)?.[4] ??
      entrada.cantidad;
    if (!Number.isInteger(entrada.cantidad) || entrada.cantidad < 1 || entrada.cantidad > max) {
      return {
        error: fallar(400, 'OC_CANTIDAD_INVALIDA', `La cantidad debe estar entre 1 y ${max}.`),
      };
    }
    if (!(entrada.precioUnitario > 0)) {
      return { error: fallar(400, 'OC_PRECIO_INVALIDO', 'El precio unitario debe ser mayor a 0.') };
    }
    armadas.push({ entrada, disp });
  }
  return { armadas };
}

// ---------- Funciones con la misma firma que la API ----------

export function listarOrdenes(f: FiltrosOrdenes = {}): Promise<Paginado<OrdenResumen>> {
  const page = f.page ?? 1;
  const pageSize = f.pageSize ?? 20;
  const q = f.q?.trim().toLowerCase();
  const filtradas = ordenes
    .filter((o) => !f.estado || o.estado === f.estado)
    .filter((o) => !f.idProveedor || o.proveedor.idProveedor === f.idProveedor)
    .filter(
      (o) =>
        !q ||
        o.folio.toLowerCase().includes(q) ||
        o.proveedor.razonSocial.toLowerCase().includes(q),
    )
    .sort((a, b) => b.idOc - a.idOc);
  const items: OrdenResumen[] = filtradas
    .slice((page - 1) * pageSize, page * pageSize)
    .map((o) => ({
      idOc: o.idOc,
      folio: o.folio,
      proveedor: o.proveedor,
      comprador: o.comprador,
      estado: o.estado,
      fechaCreacion: o.fechaCreacion,
      fechaEmision: o.fechaEmision,
      fechaEntregaEsperada: o.fechaEntregaEsperada,
      total: o.total,
    }));
  return esperar({ items, total: filtradas.length, page, pageSize });
}

export function obtenerOrden(id: number): Promise<OrdenDetalle> {
  const oc = buscar(id);
  return oc ? esperar(oc) : fallar(404, 'NO_ENCONTRADO', 'La orden de compra no existe.');
}

export function listarLineasDisponibles(): Promise<LineaDisponible[]> {
  return esperar(disponibles);
}

export function crearOrden(datos: OrdenEntrada): Promise<OrdenDetalle> {
  const p = proveedores.get(datos.idProveedor);
  if (!p) return fallar(400, 'VALIDACION', 'El proveedor no existe.');
  const { armadas, error } = validarLineas(datos);
  if (error) return error;

  const id = siguienteOc++;
  const yo = compradorActual();
  const oc: OrdenDetalle = {
    idOc: id,
    folio: folio(id),
    proveedor: { idProveedor: p.idProveedor, rutNit: p.rutNit, razonSocial: p.razonSocial },
    comprador: yo,
    estado: 'BORRADOR',
    fechaCreacion: ahora(),
    fechaEmision: null,
    fechaEntregaEsperada: datos.fechaEntregaEsperada || null,
    fechaRecepcionReal: null,
    motivoCancelacion: null,
    lineas: armadas!.map(({ entrada, disp }) => ({
      idDetalle: siguienteDetalle++,
      idScDetalle: entrada.idScDetalle,
      folioSc: disp!.folioSc,
      producto: disp!.producto,
      cantidad: entrada.cantidad,
      precioUnitario: entrada.precioUnitario,
      subtotalLinea: 0,
    })),
    subtotal: 0,
    impuesto: 0,
    total: 0,
    historial: [itemHistorial(null, 'BORRADOR', yo.idEmpleado, ahora(), null)],
  };
  recalcular(oc);
  ordenes.push(oc);
  disponibles = disponibles.filter(
    (d) => !datos.lineas.some((l) => l.idScDetalle === d.idScDetalle),
  );
  return esperar(oc);
}

export function actualizarOrden(id: number, datos: OrdenEntrada): Promise<OrdenDetalle> {
  const oc = buscar(id);
  if (!oc) return fallar(404, 'NO_ENCONTRADO', 'La orden de compra no existe.');
  if (oc.estado !== 'BORRADOR')
    return fallar(409, 'OC_INMUTABLE', 'Solo se puede editar una orden en borrador.');
  const p = proveedores.get(datos.idProveedor);
  if (!p) return fallar(400, 'VALIDACION', 'El proveedor no existe.');
  const propias = oc.lineas.map((l) => l.idScDetalle);
  const { armadas, error } = validarLineas(datos, propias);
  if (error) return error;

  liberarLineas(oc);
  oc.proveedor = { idProveedor: p.idProveedor, rutNit: p.rutNit, razonSocial: p.razonSocial };
  oc.fechaEntregaEsperada = datos.fechaEntregaEsperada || null;
  oc.lineas = armadas!.map(({ entrada }) => {
    const disp = disponibles.find((d) => d.idScDetalle === entrada.idScDetalle)!;
    return {
      idDetalle: siguienteDetalle++,
      idScDetalle: entrada.idScDetalle,
      folioSc: disp.folioSc,
      producto: disp.producto,
      cantidad: entrada.cantidad,
      precioUnitario: entrada.precioUnitario,
      subtotalLinea: 0,
    };
  });
  recalcular(oc);
  disponibles = disponibles.filter(
    (d) => !datos.lineas.some((l) => l.idScDetalle === d.idScDetalle),
  );
  return esperar(oc);
}

export function emitirOrden(id: number): Promise<OrdenDetalle> {
  const oc = buscar(id);
  if (!oc) return fallar(404, 'NO_ENCONTRADO', 'La orden de compra no existe.');
  if (oc.estado !== 'BORRADOR')
    return fallar(409, 'TRANSICION_INVALIDA', 'Solo se puede emitir una orden en borrador.');
  if (proveedores.get(oc.proveedor.idProveedor)?.estado !== 'ACTIVO') {
    return fallar(
      409,
      'OC_PROVEEDOR_INACTIVO',
      `${oc.proveedor.razonSocial} está inactivo. Cambia el proveedor o reactívalo antes de emitir.`,
    );
  }
  if (!oc.fechaEntregaEsperada || oc.fechaEntregaEsperada < hoyChile()) {
    return fallar(
      400,
      'OC_INCOMPLETA',
      'La fecha de entrega comprometida debe ser hoy o posterior.',
    );
  }
  oc.fechaEmision = ahora();
  cambiarEstado(oc, 'EMITIDA', null);
  return esperar(oc);
}

export function cancelarOrden(id: number, motivo: string): Promise<OrdenDetalle> {
  const oc = buscar(id);
  if (!oc) return fallar(404, 'NO_ENCONTRADO', 'La orden de compra no existe.');
  if (oc.estado !== 'BORRADOR' && oc.estado !== 'EMITIDA') {
    return fallar(
      409,
      'TRANSICION_INVALIDA',
      'Solo se puede cancelar una orden en borrador o emitida.',
    );
  }
  if (!motivo.trim()) return fallar(400, 'VALIDACION', 'Indica el motivo de la cancelación.');
  oc.motivoCancelacion = motivo.trim();
  cambiarEstado(oc, 'CANCELADA', motivo.trim());
  liberarLineas(oc);
  return esperar(oc);
}

export function resolverOrden(
  id: number,
  resultado: ResultadoResolucion,
  comentario: string,
): Promise<OrdenDetalle> {
  const oc = buscar(id);
  if (!oc) return fallar(404, 'NO_ENCONTRADO', 'La orden de compra no existe.');
  if (oc.estado !== 'CON_PROBLEMAS')
    return fallar(409, 'TRANSICION_INVALIDA', 'Solo se resuelve una orden con problemas.');
  if (!comentario.trim())
    return fallar(400, 'VALIDACION', 'Explica cómo se resolvió con el proveedor.');
  if (resultado === 'COMPLETADA') oc.fechaRecepcionReal = hoyChile();
  else oc.motivoCancelacion = comentario.trim();
  cambiarEstado(oc, resultado, comentario.trim());
  return esperar(oc);
}
