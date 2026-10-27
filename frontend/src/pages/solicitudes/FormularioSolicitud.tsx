import { Plus, Search, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { aErrorApi } from '../../api/cliente';
import { actualizarSolicitud, crearSolicitud, listarProductos } from '../../api/compras';
import { Alerta, Modal } from '../../components/ui';
import { useDebounce, usePeticion } from '../../hooks/usePeticion';
import type { DuplicadoSc, Producto, SolicitudDetalle } from '../../types/api';
import { AvisoDuplicados, esDuplicado } from './AvisoDuplicados';

interface Linea {
  producto: Producto;
  cantidad: number;
}

interface Props {
  /** Si viene, se edita esa SC (solo BORRADOR); si no, se crea una nueva. */
  solicitud?: SolicitudDetalle;
  onCerrar: () => void;
  onGuardada: (sc: SolicitudDetalle) => void;
}

export function FormularioSolicitud({ solicitud, onCerrar, onGuardada }: Props) {
  const [motivo, setMotivo] = useState(solicitud?.motivo ?? '');
  const [lineas, setLineas] = useState<Linea[]>(
    solicitud?.lineas.map((l) => ({ producto: l.producto, cantidad: l.cantidad })) ?? [],
  );
  const [busqueda, setBusqueda] = useState('');
  const q = useDebounce(busqueda);
  const [error, setError] = useState<string | null>(null);
  const [duplicados, setDuplicados] = useState<DuplicadoSc[] | null>(null);
  const [guardando, setGuardando] = useState(false);

  const { datos: resultados, cargando: buscando } = usePeticion(
    () =>
      q.trim() ? listarProductos({ q, soloActivos: true, pageSize: 8 }) : Promise.resolve(null),
    [q],
  );

  const agregar = (p: Producto) => {
    setLineas((ls) =>
      ls.some((l) => l.producto.idProducto === p.idProducto)
        ? ls.map((l) =>
            l.producto.idProducto === p.idProducto ? { ...l, cantidad: l.cantidad + 1 } : l,
          )
        : [...ls, { producto: p, cantidad: 1 }],
    );
    setBusqueda('');
    setDuplicados(null);
  };

  const cambiarCantidad = (idProducto: number, valor: string) => {
    const cantidad = Math.max(0, Math.floor(Number(valor) || 0));
    setLineas((ls) =>
      ls.map((l) => (l.producto.idProducto === idProducto ? { ...l, cantidad } : l)),
    );
  };

  const quitar = (idProducto: number) => {
    setLineas((ls) => ls.filter((l) => l.producto.idProducto !== idProducto));
    setDuplicados(null);
  };

  const guardar = async (ev: FormEvent, confirmarDuplicado = false) => {
    ev.preventDefault();
    setError(null);
    if (lineas.some((l) => l.cantidad < 1)) {
      setError('Todas las cantidades deben ser mayores a 0.');
      return;
    }
    const datos = {
      motivo: motivo.trim() || null,
      lineas: lineas.map((l) => ({ idProducto: l.producto.idProducto, cantidad: l.cantidad })),
    };
    setGuardando(true);
    try {
      const sc = solicitud
        ? await actualizarSolicitud(solicitud.idSolicitud, datos)
        : await crearSolicitud(datos, confirmarDuplicado);
      onGuardada(sc);
    } catch (e) {
      const err = aErrorApi(e);
      if (esDuplicado(err.code)) setDuplicados((err.details?.duplicados as DuplicadoSc[]) ?? []);
      else setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      titulo={solicitud ? `Editar ${solicitud.folio}` : 'Nueva solicitud de compra'}
      ancho="amplio"
      onCerrar={onCerrar}
      pie={
        <>
          <span className="pie-nota">Se guarda como borrador. Después la envías a aprobación.</span>
          <button type="button" className="btn btn-secundario" onClick={onCerrar}>
            Cancelar
          </button>
          {duplicados ? (
            <button
              type="button"
              className="btn btn-primario"
              disabled={guardando}
              onClick={(e) => guardar(e, true)}
            >
              Guardar de todos modos
            </button>
          ) : (
            <button
              type="submit"
              form="form-solicitud"
              className="btn btn-primario"
              disabled={guardando}
            >
              {guardando ? 'Guardando…' : 'Guardar borrador'}
            </button>
          )}
        </>
      }
    >
      <form id="form-solicitud" className="form-columna" onSubmit={guardar} noValidate>
        {error && <Alerta>{error}</Alerta>}
        {duplicados && <AvisoDuplicados duplicados={duplicados} />}

        <label className="campo">
          <span className="campo-etiqueta">
            Motivo <span className="texto-secundario">(obligatorio para enviar)</span>
          </span>
          <textarea
            className="input textarea"
            maxLength={300}
            rows={2}
            value={motivo}
            placeholder="Ej.: Reposición de sets City por alta rotación"
            onChange={(e) => setMotivo(e.target.value)}
          />
        </label>

        <div className="campo">
          <span className="campo-etiqueta">Agregar productos del catálogo</span>
          <div className="buscador-productos">
            <div className="input-busqueda">
              <Search size={16} />
              <input
                className="input"
                placeholder="Buscar set por nombre, SKU o colección"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            {busqueda.trim() && (
              <ul className="resultados-productos">
                {buscando && <li className="texto-secundario">Buscando…</li>}
                {!buscando && resultados?.items.length === 0 && (
                  <li className="texto-secundario">Sin resultados</li>
                )}
                {resultados?.items.map((p) => (
                  <li key={p.idProducto}>
                    <button type="button" onClick={() => agregar(p)}>
                      <Plus size={14} />
                      <span className="mono">{p.sku}</span>
                      <span>{p.nombre}</span>
                      <span className="texto-secundario">{p.coleccion}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Colección</th>
                <th className="num">Cantidad</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lineas.length === 0 && (
                <tr>
                  <td colSpan={5} className="tabla-mensaje">
                    Aún no hay productos. Búscalos arriba para agregarlos.
                  </td>
                </tr>
              )}
              {lineas.map((l) => (
                <tr key={l.producto.idProducto}>
                  <td className="mono">{l.producto.sku}</td>
                  <td>{l.producto.nombre}</td>
                  <td>{l.producto.coleccion}</td>
                  <td className="num">
                    <input
                      className="input input-cantidad"
                      type="number"
                      min={1}
                      value={l.cantidad || ''}
                      onChange={(e) => cambiarCantidad(l.producto.idProducto, e.target.value)}
                      aria-label={`Cantidad de ${l.producto.nombre}`}
                    />
                  </td>
                  <td className="col-acciones">
                    <button
                      type="button"
                      className="btn-icono"
                      onClick={() => quitar(l.producto.idProducto)}
                      aria-label={`Quitar ${l.producto.nombre}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>
    </Modal>
  );
}
