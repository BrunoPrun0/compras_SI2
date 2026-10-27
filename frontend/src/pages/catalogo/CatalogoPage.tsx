import { Search } from 'lucide-react';
import { useState } from 'react';
import { listarProductos } from '../../api/compras';
import { PageHeader } from '../../components/PageHeader';
import { AlertaError, EstadoBadge, FilaMensaje, Paginacion } from '../../components/ui';
import { useDebounce, usePeticion } from '../../hooks/usePeticion';
import { clp } from '../../utils/formato';

const PAGE_SIZE = 15;

export function CatalogoPage() {
  const [busqueda, setBusqueda] = useState('');
  const [soloActivos, setSoloActivos] = useState(true);
  const [page, setPage] = useState(1);
  const q = useDebounce(busqueda);

  const { datos, error, cargando } = usePeticion(
    () => listarProductos({ q, soloActivos, page, pageSize: PAGE_SIZE }),
    [q, soloActivos, page],
  );

  return (
    <div className="content-container">
      <PageHeader
        title="Catálogo"
        description="Consulta de productos del catálogo (solo lectura, administrado por Inventario)"
      />

      <section className="card">
        <div className="toolbar">
          <div className="input-busqueda">
            <Search size={16} />
            <input
              className="input"
              placeholder="Buscar por nombre, SKU o colección"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={soloActivos}
              onChange={(e) => {
                setSoloActivos(e.target.checked);
                setPage(1);
              }}
            />
            Solo activos
          </label>
        </div>

        <AlertaError error={error} />

        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Set</th>
                <th>Colección</th>
                <th className="num">Piezas</th>
                <th className="num" title="Último precio pagado en una OC emitida o completada">
                  Último precio
                </th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {cargando && !datos && <FilaMensaje columnas={6}>Cargando…</FilaMensaje>}
              {datos?.items.length === 0 && (
                <FilaMensaje columnas={6}>No hay productos con esos filtros.</FilaMensaje>
              )}
              {datos?.items.map((p) => (
                <tr key={p.idProducto} className={p.activo ? '' : 'fila-inactiva'}>
                  <td className="mono">{p.sku}</td>
                  <td>
                    <strong>{p.nombre}</strong>
                  </td>
                  <td>{p.coleccion}</td>
                  <td className="num">{p.cantPiezas.toLocaleString('es-CL')}</td>
                  <td className="num">{clp(p.precioReferencia)}</td>
                  <td>
                    <EstadoBadge estado={p.activo ? 'ACTIVO' : 'INACTIVO'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {datos && (
          <Paginacion
            page={datos.page}
            pageSize={datos.pageSize}
            total={datos.total}
            onCambiar={setPage}
          />
        )}
      </section>
    </div>
  );
}
