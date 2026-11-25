import { Search } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { aErrorApi } from '../../api/cliente';
import { listarProveedores } from '../../api/compras';
import { actualizarOrden, crearOrden, listarLineasDisponibles } from '../../api/ordenes';
import { Alerta, FilaMensaje, Modal } from '../../components/ui';
import { usePeticion } from '../../hooks/usePeticion';
import type { EmpleadoRef, OrdenDetalle, Producto } from '../../types/api';
import { clp, hoy } from '../../utils/formato';

const IVA = 0.19;

/** Línea de SC que se puede incluir en la OC. */
interface Fila {
  idScDetalle: number;
  folioSc: string;
  solicitante: EmpleadoRef | null;
  producto: Producto;
  /** Cantidad solicitada en la SC (tope de la línea de OC). null si no se conoce. */
  maximo: number | null;
}

/** Lo que el comprador eligió para una fila. */
interface Eleccion {
  cantidad: number;
  precio: number;
}

interface Props {
  /** Si viene, se edita esa OC (solo BORRADOR); si no, se crea una nueva. */
  orden?: OrdenDetalle;
  onCerrar: () => void;
  onGuardada: (oc: OrdenDetalle) => void;
}

export function FormularioOrden({ orden, onCerrar, onGuardada }: Props) {
  const [idProveedor, setIdProveedor] = useState(orden?.proveedor.idProveedor ?? 0);
  const [fechaEntrega, setFechaEntrega] = useState(orden?.fechaEntregaEsperada ?? '');
  const [filtro, setFiltro] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // idScDetalle → cantidad y precio elegidos (las líneas de la OC en edición ya vienen marcadas)
  const [elegidas, setElegidas] = useState<Map<number, Eleccion>>(
    () =>
      new Map(
        orden?.lineas.map((l) => [
          l.idScDetalle,
          { cantidad: l.cantidad, precio: l.precioUnitario },
        ]),
      ),
  );

  const { datos: proveedores } = usePeticion(
    () => listarProveedores({ estado: 'ACTIVO', pageSize: 100 }),
    [],
  );
  const { datos: disponibles, cargando } = usePeticion(() => listarLineasDisponibles(), []);

  // Líneas disponibles + las que ya tiene la OC en edición (esas no salen como disponibles)
  const filas = useMemo<Fila[]>(() => {
    const propias: Fila[] =
      orden?.lineas.map((l) => ({
        idScDetalle: l.idScDetalle,
        folioSc: l.folioSc,
        solicitante: null,
        producto: l.producto,
        maximo: null,
      })) ?? [];
    const libres: Fila[] =
      disponibles?.map((d) => ({
        idScDetalle: d.idScDetalle,
        folioSc: d.folioSc,
        solicitante: d.solicitante,
        producto: d.producto,
        maximo: d.cantidadSolicitada,
      })) ?? [];
    return [
      ...propias,
      ...libres.filter((l) => !propias.some((p) => p.idScDetalle === l.idScDetalle)),
    ];
  }, [disponibles, orden]);

  const texto = filtro.trim().toLowerCase();
  const visibles = filas.filter(
    (f) =>
      !texto ||
      elegidas.has(f.idScDetalle) ||
      [f.folioSc, f.producto.sku, f.producto.nombre, f.producto.coleccion].some((v) =>
        v.toLowerCase().includes(texto),
      ),
  );

  const subtotal = [...elegidas.values()].reduce((s, e) => s + e.cantidad * e.precio, 0);
  const impuesto = Math.round(subtotal * IVA);

  const alternar = (f: Fila) => {
    setElegidas((actual) => {
      const nuevo = new Map(actual);
      if (nuevo.has(f.idScDetalle)) nuevo.delete(f.idScDetalle);
      else
        nuevo.set(f.idScDetalle, {
          cantidad: f.maximo ?? 1,
          precio: f.producto.precioReferencia ?? 0,
        });
      return nuevo;
    });
  };

  const cambiar = (id: number, campo: keyof Eleccion, valor: string) => {
    const n = Math.max(0, Math.floor(Number(valor) || 0));
    setElegidas((actual) => {
      const nuevo = new Map(actual);
      const e = nuevo.get(id);
      if (e) nuevo.set(id, { ...e, [campo]: n });
      return nuevo;
    });
  };

  const guardar = async (ev: FormEvent) => {
    ev.preventDefault();
    setError(null);
    // Mismas reglas que el servidor (V8, V9), para avisar antes de enviar
    if (!idProveedor) return setError('Elige el proveedor.');
    if (!fechaEntrega) return setError('Indica la fecha de entrega comprometida.');
    if (fechaEntrega < hoy()) return setError('La fecha comprometida no puede ser anterior a hoy.');
    if (elegidas.size === 0) return setError('Elige al menos una línea de solicitud.');
    for (const f of filas.filter((f) => elegidas.has(f.idScDetalle))) {
      const e = elegidas.get(f.idScDetalle)!;
      if (e.cantidad < 1 || (f.maximo !== null && e.cantidad > f.maximo)) {
        return setError(
          `${f.producto.nombre}: la cantidad debe estar entre 1 y ${f.maximo ?? 'lo solicitado'}.`,
        );
      }
      if (e.precio <= 0)
        return setError(`${f.producto.nombre}: indica un precio unitario mayor a 0.`);
    }

    const datos = {
      idProveedor,
      fechaEntregaEsperada: fechaEntrega,
      lineas: [...elegidas].map(([idScDetalle, e]) => ({
        idScDetalle,
        cantidad: e.cantidad,
        precioUnitario: e.precio,
      })),
    };
    setGuardando(true);
    try {
      onGuardada(orden ? await actualizarOrden(orden.idOc, datos) : await crearOrden(datos));
    } catch (e) {
      setError(aErrorApi(e).message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      titulo={orden ? `Editar ${orden.folio}` : 'Nueva orden de compra'}
      ancho="amplio"
      onCerrar={onCerrar}
      pie={
        <>
          <span className="pie-nota">Se guarda como borrador. Después la emites.</span>
          <button type="button" className="btn btn-secundario" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" form="form-orden" className="btn btn-primario" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar borrador'}
          </button>
        </>
      }
    >
      <form id="form-orden" className="form-columna" onSubmit={guardar} noValidate>
        {error && <Alerta>{error}</Alerta>}

        <div className="form-grid">
          <label className="campo">
            <span className="campo-etiqueta">
              Proveedor <span className="obligatorio">*</span>
            </span>
            <select
              className="input select"
              value={idProveedor || ''}
              onChange={(e) => setIdProveedor(Number(e.target.value))}
            >
              <option value="">Elige un proveedor activo</option>
              {/* En edición, el proveedor actual aparece aunque esté inactivo */}
              {orden &&
                !proveedores?.items.some((p) => p.idProveedor === orden.proveedor.idProveedor) && (
                  <option value={orden.proveedor.idProveedor}>
                    {orden.proveedor.razonSocial} (inactivo)
                  </option>
                )}
              {proveedores?.items.map((p) => (
                <option key={p.idProveedor} value={p.idProveedor}>
                  {p.razonSocial}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span className="campo-etiqueta">
              Entrega comprometida <span className="obligatorio">*</span>
            </span>
            <input
              className="input"
              type="date"
              min={hoy()}
              value={fechaEntrega}
              onChange={(e) => setFechaEntrega(e.target.value)}
            />
          </label>
        </div>

        <div className="campo">
          <span className="campo-etiqueta">Líneas de solicitudes aprobadas</span>
          <div className="input-busqueda">
            <Search size={16} />
            <input
              className="input"
              placeholder="Filtrar por folio de SC, SKU, producto o colección"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>
        </div>

        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th />
                <th>SC</th>
                <th>Producto</th>
                <th className="num">Solicitado</th>
                <th className="num">Cantidad</th>
                <th className="num">Precio unitario</th>
                <th className="num">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {cargando && !disponibles && <FilaMensaje columnas={7}>Cargando…</FilaMensaje>}
              {disponibles && visibles.length === 0 && (
                <FilaMensaje columnas={7}>
                  {filas.length === 0
                    ? 'No hay líneas de solicitudes aprobadas pendientes de compra.'
                    : 'Ninguna línea coincide con el filtro.'}
                </FilaMensaje>
              )}
              {visibles.map((f) => {
                const e = elegidas.get(f.idScDetalle);
                return (
                  <tr key={f.idScDetalle} className={e ? undefined : 'fila-inactiva'}>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!e}
                        onChange={() => alternar(f)}
                        aria-label={`Incluir ${f.producto.nombre} de ${f.folioSc}`}
                      />
                    </td>
                    <td className="nowrap">
                      <span className="mono">{f.folioSc}</span>
                      {f.solicitante && (
                        <>
                          <br />
                          <span className="texto-secundario">{f.solicitante.nombre}</span>
                        </>
                      )}
                    </td>
                    <td>
                      {f.producto.nombre}
                      <br />
                      <span className="texto-secundario mono">{f.producto.sku}</span>
                    </td>
                    <td className="num">{f.maximo ?? '—'}</td>
                    <td className="num">
                      <input
                        className="input input-cantidad"
                        type="number"
                        min={1}
                        max={f.maximo ?? undefined}
                        disabled={!e}
                        value={e?.cantidad || ''}
                        onChange={(ev) => cambiar(f.idScDetalle, 'cantidad', ev.target.value)}
                        aria-label={`Cantidad de ${f.producto.nombre}`}
                      />
                    </td>
                    <td className="num">
                      <input
                        className="input input-precio"
                        type="number"
                        min={1}
                        disabled={!e}
                        value={e?.precio || ''}
                        placeholder={
                          f.producto.precioReferencia ? String(f.producto.precioReferencia) : 'CLP'
                        }
                        onChange={(ev) => cambiar(f.idScDetalle, 'precio', ev.target.value)}
                        aria-label={`Precio unitario de ${f.producto.nombre}`}
                      />
                    </td>
                    <td className="num">{e ? clp(e.cantidad * e.precio) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="texto-secundario">
          El precio se propone con el último pagado por ese producto. Una orden puede reunir líneas
          de varias solicitudes.
        </p>

        <dl className="totales">
          <dt>Subtotal</dt>
          <dd>{clp(subtotal)}</dd>
          <dt>IVA 19 %</dt>
          <dd>{clp(impuesto)}</dd>
          <dt className="totales-final">Total</dt>
          <dd className="totales-final">{clp(subtotal + impuesto)}</dd>
        </dl>
      </form>
    </Modal>
  );
}
