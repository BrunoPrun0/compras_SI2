import { Pencil, Send, XCircle } from 'lucide-react';
import { useState } from 'react';
import { aErrorApi } from '../../api/cliente';
import { anularSolicitud, enviarSolicitud, obtenerSolicitud } from '../../api/compras';
import { Alerta, AlertaError, EstadoBadge, Modal } from '../../components/ui';
import { useSesion } from '../../context/SesionContext';
import { usePeticion } from '../../hooks/usePeticion';
import type { DuplicadoSc, SolicitudDetalle } from '../../types/api';
import { fechaHora } from '../../utils/formato';
import { AvisoDuplicados, esDuplicado } from './AvisoDuplicados';

interface Props {
  idSolicitud: number;
  onCerrar: () => void;
  onEditar: (sc: SolicitudDetalle) => void;
  /** Se llama tras enviar o anular, para refrescar el listado. */
  onCambio: () => void;
}

export function DetalleSolicitud({ idSolicitud, onCerrar, onEditar, onCambio }: Props) {
  const { empleado } = useSesion();
  const { datos: cargada, error: errorCarga } = usePeticion(
    () => obtenerSolicitud(idSolicitud),
    [idSolicitud],
  );
  // Tras una acción se muestra la SC que devuelve la API (ya actualizada)
  const [actualizada, setActualizada] = useState<SolicitudDetalle | null>(null);
  const sc = actualizada ?? cargada;

  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [duplicados, setDuplicados] = useState<DuplicadoSc[] | null>(null);
  const [confirmarAnular, setConfirmarAnular] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const esDueno = sc?.solicitante.idEmpleado === empleado?.idEmpleado;
  const puedeEditar = esDueno && sc?.estado === 'BORRADOR';
  const puedeAnular = esDueno && (sc?.estado === 'BORRADOR' || sc?.estado === 'PENDIENTE');

  const ejecutar = async (accion: () => Promise<SolicitudDetalle>, textoExito: string) => {
    setError(null);
    setExito(null);
    setOcupado(true);
    try {
      setActualizada(await accion());
      setDuplicados(null);
      setConfirmarAnular(false);
      setExito(textoExito);
      onCambio();
    } catch (e) {
      const err = aErrorApi(e);
      if (esDuplicado(err.code)) setDuplicados((err.details?.duplicados as DuplicadoSc[]) ?? []);
      else setError(err.message);
    } finally {
      setOcupado(false);
    }
  };

  const enviar = (confirmar = false) =>
    sc &&
    ejecutar(() => enviarSolicitud(sc.idSolicitud, confirmar), 'Solicitud enviada a aprobación.');
  const anular = () => sc && ejecutar(() => anularSolicitud(sc.idSolicitud), 'Solicitud anulada.');

  const pie = sc && (puedeEditar || puedeAnular) && (
    <>
      {puedeAnular &&
        (confirmarAnular ? (
          <>
            <span className="pie-nota">¿Anular {sc.folio}? No se puede deshacer.</span>
            <button
              type="button"
              className="btn btn-secundario"
              onClick={() => setConfirmarAnular(false)}
            >
              No
            </button>
            <button type="button" className="btn btn-peligro" disabled={ocupado} onClick={anular}>
              Sí, anular
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-fantasma pie-izquierda"
            onClick={() => setConfirmarAnular(true)}
          >
            <XCircle size={16} /> Anular
          </button>
        ))}
      {puedeEditar && !confirmarAnular && (
        <>
          <button type="button" className="btn btn-secundario" onClick={() => onEditar(sc)}>
            <Pencil size={16} /> Editar
          </button>
          {duplicados ? (
            <button
              type="button"
              className="btn btn-primario"
              disabled={ocupado}
              onClick={() => enviar(true)}
            >
              Enviar de todos modos
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primario"
              disabled={ocupado}
              onClick={() => enviar()}
            >
              <Send size={16} /> Enviar a aprobación
            </button>
          )}
        </>
      )}
    </>
  );

  return (
    <Modal
      titulo={
        sc ? (
          <span className="titulo-con-badge">
            {sc.folio} <EstadoBadge estado={sc.estado} />
          </span>
        ) : (
          'Solicitud'
        )
      }
      ancho="amplio"
      onCerrar={onCerrar}
      pie={pie || undefined}
    >
      <AlertaError error={errorCarga} />
      {!sc && !errorCarga && <p className="texto-secundario">Cargando…</p>}
      {sc && (
        <div className="form-columna">
          {exito && <Alerta tipo="exito">{exito}</Alerta>}
          {error && <Alerta>{error}</Alerta>}
          {duplicados && <AvisoDuplicados duplicados={duplicados} />}

          <dl className="datos-grid">
            <div>
              <dt>Solicitante</dt>
              <dd>{sc.solicitante.nombre}</dd>
            </div>
            <div>
              <dt>Fecha</dt>
              <dd>{fechaHora(sc.fechaSolicitud)}</dd>
            </div>
            <div>
              <dt>Gestor</dt>
              <dd>{sc.gestor ? `${sc.gestor.nombre} · ${fechaHora(sc.fechaResolucion)}` : '—'}</dd>
            </div>
            <div className="form-ancho-completo">
              <dt>Motivo</dt>
              <dd>
                {sc.motivo ?? <span className="texto-secundario">Sin motivo (borrador)</span>}
              </dd>
            </div>
            {sc.motivoRechazo && (
              <div className="form-ancho-completo">
                <dt>Motivo de rechazo</dt>
                <dd>{sc.motivoRechazo}</dd>
              </div>
            )}
          </dl>

          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Producto</th>
                  <th>Colección</th>
                  <th className="num">Cantidad</th>
                  <th>OC</th>
                </tr>
              </thead>
              <tbody>
                {sc.lineas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="tabla-mensaje">
                      Sin líneas.
                    </td>
                  </tr>
                )}
                {sc.lineas.map((l) => (
                  <tr key={l.idScDetalle}>
                    <td className="mono">{l.producto.sku}</td>
                    <td>
                      {l.producto.nombre}
                      {!l.producto.activo && (
                        <span className="badge badge-inactivo badge-inline">Inactivo</span>
                      )}
                    </td>
                    <td>{l.producto.coleccion}</td>
                    <td className="num">{l.cantidad}</td>
                    <td className="mono">{l.folioOc ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="subtitulo">Historial</h3>
            <ol className="historial">
              {sc.historial.map((h) => (
                <li key={h.idHistorial}>
                  <span className="historial-fecha">{fechaHora(h.fecha)}</span>
                  <span>
                    {h.estadoAnterior ? (
                      <>
                        <EstadoBadge estado={h.estadoAnterior} /> →{' '}
                        <EstadoBadge estado={h.estadoNuevo} />
                      </>
                    ) : (
                      <>
                        Creada en <EstadoBadge estado={h.estadoNuevo} />
                      </>
                    )}
                  </span>
                  <span className="texto-secundario">por {h.usuario.nombre}</span>
                  {h.comentario && <span className="historial-comentario">“{h.comentario}”</span>}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </Modal>
  );
}
