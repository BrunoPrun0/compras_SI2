import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { listarOrdenes, ordenesSimuladas } from '../../api/ordenes';
import { PageHeader } from '../../components/PageHeader';
import { Alerta, AlertaError, EstadoBadge, FilaMensaje, Paginacion } from '../../components/ui';
import { useDebounce, usePeticion } from '../../hooks/usePeticion';
import type { EstadoOc, OrdenDetalle, OrdenResumen } from '../../types/api';
import { clp, fecha, hoy } from '../../utils/formato';
import { DetalleOrden } from './DetalleOrden';
import { FormularioOrden } from './FormularioOrden';

const PAGE_SIZE = 10;
const ESTADOS: { valor: EstadoOc; etiqueta: string }[] = [
  { valor: 'BORRADOR', etiqueta: 'Borrador' },
  { valor: 'EMITIDA', etiqueta: 'Emitida' },
  { valor: 'CON_PROBLEMAS', etiqueta: 'Con problemas' },
  { valor: 'COMPLETADA', etiqueta: 'Completada' },
  { valor: 'CANCELADA', etiqueta: 'Cancelada' },
];

/** Emitida y con la fecha comprometida ya pasada. */
const atrasada = (oc: OrdenResumen) =>
  oc.estado === 'EMITIDA' && !!oc.fechaEntregaEsperada && oc.fechaEntregaEsperada < hoy();

export function OrdenesPage() {
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<EstadoOc | ''>('');
  const [page, setPage] = useState(1);
  const q = useDebounce(busqueda);

  const { datos, error, cargando, recargar } = usePeticion(
    () => listarOrdenes({ q, estado, page, pageSize: PAGE_SIZE }),
    [q, estado, page],
  );

  // undefined: cerrado · null: nueva · OrdenDetalle: edición
  const [formulario, setFormulario] = useState<OrdenDetalle | null | undefined>(undefined);
  const [detalle, setDetalle] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  return (
    <div className="content-container">
      <PageHeader
        title="Órdenes de compra"
        description="Emisión y seguimiento de órdenes (OC) a proveedores"
      />

      <section className="card">
        {ordenesSimuladas && (
          <Alerta tipo="aviso">
            Datos de ejemplo: el backend aún no tiene las órdenes de compra. Los cambios se pierden
            al recargar la página.
          </Alerta>
        )}

        <div className="toolbar">
          <div className="input-busqueda">
            <Search size={16} />
            <input
              className="input"
              placeholder="Buscar por folio o proveedor"
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
              setEstado(e.target.value as EstadoOc | '');
              setPage(1);
            }}
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.etiqueta}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-primario toolbar-derecha"
            onClick={() => setFormulario(null)}
          >
            <Plus size={16} /> Nueva orden
          </button>
        </div>

        {mensaje && <Alerta tipo="exito">{mensaje}</Alerta>}
        <AlertaError error={error} />

        <div className="tabla-contenedor">
          <table className="tabla tabla-clickeable">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Proveedor</th>
                <th>Comprador</th>
                <th>Emisión</th>
                <th>Entrega comprometida</th>
                <th className="num">Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {cargando && !datos && <FilaMensaje columnas={7}>Cargando…</FilaMensaje>}
              {datos?.items.length === 0 && (
                <FilaMensaje columnas={7}>No hay órdenes con esos filtros.</FilaMensaje>
              )}
              {datos?.items.map((oc) => (
                <tr
                  key={oc.idOc}
                  onClick={() => setDetalle(oc.idOc)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setDetalle(oc.idOc)}
                >
                  <td className="mono">
                    <strong>{oc.folio}</strong>
                  </td>
                  <td>{oc.proveedor.razonSocial}</td>
                  <td>{oc.comprador.nombre}</td>
                  <td className="nowrap">{fecha(oc.fechaEmision)}</td>
                  <td className="nowrap">
                    {fecha(oc.fechaEntregaEsperada)}
                    {atrasada(oc) && <span className="texto-alerta"> · atrasada</span>}
                  </td>
                  <td className="num">{clp(oc.total)}</td>
                  <td>
                    <EstadoBadge estado={oc.estado} />
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
        <FormularioOrden
          orden={formulario ?? undefined}
          onCerrar={() => setFormulario(undefined)}
          onGuardada={(oc) => {
            setMensaje(
              formulario
                ? `${oc.folio} actualizada.`
                : `${oc.folio} creada como borrador. Ábrela para emitirla.`,
            );
            setFormulario(undefined);
            setDetalle(oc.idOc);
            recargar();
          }}
        />
      )}

      {detalle !== null && formulario === undefined && (
        <DetalleOrden
          key={detalle}
          idOc={detalle}
          onCerrar={() => setDetalle(null)}
          onEditar={(oc) => setFormulario(oc)}
          onCambio={recargar}
        />
      )}
    </div>
  );
}
