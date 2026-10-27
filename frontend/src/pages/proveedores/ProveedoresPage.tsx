import { Pencil, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { aErrorApi } from '../../api/cliente';
import { cambiarEstadoProveedor, listarProveedores } from '../../api/compras';
import { PageHeader } from '../../components/PageHeader';
import { Alerta, AlertaError, EstadoBadge, FilaMensaje, Paginacion } from '../../components/ui';
import { useDebounce, usePeticion } from '../../hooks/usePeticion';
import type { EstadoProveedor, Proveedor } from '../../types/api';
import { rutConPuntos } from '../../utils/formato';
import { FormularioProveedor } from './FormularioProveedor';

const PAGE_SIZE = 10;

export function ProveedoresPage() {
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<EstadoProveedor | ''>('');
  const [page, setPage] = useState(1);
  const q = useDebounce(busqueda);

  const { datos, error, cargando, recargar } = usePeticion(
    () => listarProveedores({ q, estado, page, pageSize: PAGE_SIZE }),
    [q, estado, page],
  );

  // undefined: cerrado · null: nuevo · Proveedor: edición
  const [formulario, setFormulario] = useState<Proveedor | null | undefined>(undefined);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  const alternarEstado = async (p: Proveedor) => {
    const nuevo: EstadoProveedor = p.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    setMensaje(null);
    try {
      await cambiarEstadoProveedor(p.idProveedor, nuevo);
      setMensaje({
        tipo: 'exito',
        texto: `${p.razonSocial} quedó ${nuevo === 'ACTIVO' ? 'activo' : 'inactivo'}. Su historial se conserva.`,
      });
      recargar();
    } catch (e) {
      setMensaje({ tipo: 'error', texto: aErrorApi(e).message });
    }
  };

  return (
    <div className="content-container">
      <PageHeader title="Proveedores" description="Alta, edición y estado de proveedores" />

      <section className="card">
        <div className="toolbar">
          <div className="input-busqueda">
            <Search size={16} />
            <input
              className="input"
              placeholder="Buscar por razón social o RUT"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="input select"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as EstadoProveedor | '');
              setPage(1);
            }}
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVO">Activos</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
          <button
            type="button"
            className="btn btn-primario toolbar-derecha"
            onClick={() => setFormulario(null)}
          >
            <Plus size={16} /> Nuevo proveedor
          </button>
        </div>

        {mensaje && <Alerta tipo={mensaje.tipo}>{mensaje.texto}</Alerta>}
        <AlertaError error={error} />

        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>RUT</th>
                <th>Razón social</th>
                <th>Correo</th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th className="col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando && !datos && <FilaMensaje columnas={6}>Cargando…</FilaMensaje>}
              {datos?.items.length === 0 && (
                <FilaMensaje columnas={6}>No hay proveedores con esos filtros.</FilaMensaje>
              )}
              {datos?.items.map((p) => (
                <tr key={p.idProveedor} className={p.estado === 'INACTIVO' ? 'fila-inactiva' : ''}>
                  <td className="mono">{rutConPuntos(p.rutNit)}</td>
                  <td>
                    <strong>{p.razonSocial}</strong>
                    {p.direccion && <div className="texto-secundario">{p.direccion}</div>}
                  </td>
                  <td>{p.email ?? '—'}</td>
                  <td>{p.telefono ?? '—'}</td>
                  <td>
                    <EstadoBadge estado={p.estado} />
                  </td>
                  <td className="col-acciones">
                    <button
                      type="button"
                      className="btn btn-fantasma btn-chico"
                      onClick={() => setFormulario(p)}
                    >
                      <Pencil size={14} /> Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-fantasma btn-chico"
                      onClick={() => alternarEstado(p)}
                    >
                      {p.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
                    </button>
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

      {formulario !== undefined && (
        <FormularioProveedor
          proveedor={formulario ?? undefined}
          onCerrar={() => setFormulario(undefined)}
          onGuardado={(p) => {
            setMensaje({
              tipo: 'exito',
              texto: formulario
                ? `Proveedor ${p.razonSocial} actualizado.`
                : `Proveedor ${p.razonSocial} creado.`,
            });
            setFormulario(undefined);
            recargar();
          }}
        />
      )}
    </div>
  );
}
