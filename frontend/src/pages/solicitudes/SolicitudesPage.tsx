import { Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { listarSolicitudes } from '../../api/compras';
import { PageHeader } from '../../components/PageHeader';
import { Alerta, AlertaError, EstadoBadge, FilaMensaje, Paginacion } from '../../components/ui';
import { useDebounce, usePeticion } from '../../hooks/usePeticion';
import type { EstadoSc, SolicitudDetalle } from '../../types/api';
import { fechaHora } from '../../utils/formato';
import { DetalleSolicitud } from './DetalleSolicitud';
import { FormularioSolicitud } from './FormularioSolicitud';

const PAGE_SIZE = 10;
const ESTADOS: { valor: EstadoSc; etiqueta: string }[] = [
  { valor: 'BORRADOR', etiqueta: 'Borrador' },
  { valor: 'PENDIENTE', etiqueta: 'Pendiente' },
  { valor: 'APROBADA', etiqueta: 'Aprobada' },
  { valor: 'RECHAZADA', etiqueta: 'Rechazada' },
  { valor: 'ANULADA', etiqueta: 'Anulada' },
];

interface Props {
  /** true cuando se pulsó "Nueva solicitud" en la barra superior. */
  abrirNueva?: boolean;
  /** Avisa que el formulario ya se abrió (para no reabrirlo al recargar la vista). */
  onNuevaAbierta?: () => void;
}

export function SolicitudesPage({ abrirNueva = false, onNuevaAbierta }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<EstadoSc | ''>('');
  const [page, setPage] = useState(1);
  const q = useDebounce(busqueda);

  const { datos, error, cargando, recargar } = usePeticion(
    () => listarSolicitudes({ q, estado, page, pageSize: PAGE_SIZE }),
    [q, estado, page],
  );

  // undefined: cerrado · null: nueva · SolicitudDetalle: edición
  const [formulario, setFormulario] = useState<SolicitudDetalle | null | undefined>(undefined);
  const [detalle, setDetalle] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    if (abrirNueva) {
      setDetalle(null);
      setFormulario(null);
      onNuevaAbierta?.();
    }
  }, [abrirNueva, onNuevaAbierta]);

  return (
    <div className="content-container">
      <PageHeader
        title="Solicitudes de compra"
        description="Creación, edición y seguimiento de solicitudes (SC)"
      />

      <section className="card">
        <div className="toolbar">
          <div className="input-busqueda">
            <Search size={16} />
            <input
              className="input"
              placeholder="Buscar por folio o motivo"
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
              setEstado(e.target.value as EstadoSc | '');
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
            <Plus size={16} /> Nueva solicitud
          </button>
        </div>

        {mensaje && <Alerta tipo="exito">{mensaje}</Alerta>}
        <AlertaError error={error} />

        <div className="tabla-contenedor">
          <table className="tabla tabla-clickeable">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Fecha</th>
                <th>Solicitante</th>
                <th>Motivo</th>
                <th className="num">Líneas</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {cargando && !datos && <FilaMensaje columnas={6}>Cargando…</FilaMensaje>}
              {datos?.items.length === 0 && (
                <FilaMensaje columnas={6}>No hay solicitudes con esos filtros.</FilaMensaje>
              )}
              {datos?.items.map((sc) => (
                <tr
                  key={sc.idSolicitud}
                  onClick={() => setDetalle(sc.idSolicitud)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setDetalle(sc.idSolicitud)}
                >
                  <td className="mono">
                    <strong>{sc.folio}</strong>
                  </td>
                  <td className="nowrap">{fechaHora(sc.fechaSolicitud)}</td>
                  <td>{sc.solicitante.nombre}</td>
                  <td className="celda-motivo">
                    {sc.motivo ?? <span className="texto-secundario">—</span>}
                  </td>
                  <td className="num">{sc.cantidadLineas}</td>
                  <td>
                    <EstadoBadge estado={sc.estado} />
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
        <FormularioSolicitud
          solicitud={formulario ?? undefined}
          onCerrar={() => setFormulario(undefined)}
          onGuardada={(sc) => {
            setMensaje(
              formulario
                ? `${sc.folio} actualizada.`
                : `${sc.folio} creada como borrador. Ábrela para enviarla a aprobación.`,
            );
            setFormulario(undefined);
            setDetalle(sc.idSolicitud);
            recargar();
          }}
        />
      )}

      {detalle !== null && formulario === undefined && (
        <DetalleSolicitud
          key={detalle}
          idSolicitud={detalle}
          onCerrar={() => setDetalle(null)}
          onEditar={(sc) => setFormulario(sc)}
          onCambio={recargar}
        />
      )}
    </div>
  );
}
