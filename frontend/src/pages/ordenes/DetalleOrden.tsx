import { CheckCircle2, Pencil, Send, XCircle } from 'lucide-react';
import { useState } from 'react';
import { aErrorApi } from '../../api/cliente';
import { cancelarOrden, emitirOrden, obtenerOrden, resolverOrden } from '../../api/ordenes';
import { Alerta, AlertaError, EstadoBadge, Modal } from '../../components/ui';
import { usePeticion } from '../../hooks/usePeticion';
import type { OrdenDetalle, ResultadoResolucion } from '../../types/api';
import { clp, fecha, fechaHora, rutConPuntos } from '../../utils/formato';

interface Props {
  idOc: number;
  onCerrar: () => void;
  onEditar: (oc: OrdenDetalle) => void;
  /** Se llama tras emitir, cancelar o resolver, para refrescar el listado. */
  onCambio: () => void;
}

// Acción que pide un texto antes de confirmarse (cancelar o resolver)
type Accion = 'cancelar' | 'resolver' | null;

export function DetalleOrden({ idOc, onCerrar, onEditar, onCambio }: Props) {
  const { datos: cargada, error: errorCarga } = usePeticion(() => obtenerOrden(idOc), [idOc]);
  // Tras una acción se muestra la OC que devuelve la API (ya actualizada)
  const [actualizada, setActualizada] = useState<OrdenDetalle | null>(null);
  const oc = actualizada ?? cargada;

  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [accion, setAccion] = useState<Accion>(null);
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState<ResultadoResolucion>('COMPLETADA');
  const [ocupado, setOcupado] = useState(false);

  const puedeEditar = oc?.estado === 'BORRADOR';
  const puedeCancelar = oc?.estado === 'BORRADOR' || oc?.estado === 'EMITIDA';
  const puedeResolver = oc?.estado === 'CON_PROBLEMAS';

  // La última diferencia registrada explica por qué la OC quedó con problemas
  const diferencias =
    oc?.estado === 'CON_PROBLEMAS'
      ? [...oc.historial].reverse().find((h) => h.estadoNuevo === 'CON_PROBLEMAS')?.comentario
      : null;

  const ejecutar = async (llamada: () => Promise<OrdenDetalle>, textoExito: string) => {
    setError(null);
    setExito(null);
    setOcupado(true);
    try {
      setActualizada(await llamada());
      setAccion(null);
      setTexto('');
      setExito(textoExito);
      onCambio();
    } catch (e) {
      setError(aErrorApi(e).message);
    } finally {
      setOcupado(false);
    }
  };

  const emitir = () =>
    oc && ejecutar(() => emitirOrden(oc.idOc), 'Orden emitida. Ya puedes enviarla al proveedor.');

  const confirmar = () => {
    if (!oc) return;
    if (!texto.trim()) {
      setError(
        accion === 'cancelar'
          ? 'Indica el motivo de la cancelación.'
          : 'Explica la solución acordada.',
      );
      return;
    }
    if (accion === 'cancelar') ejecutar(() => cancelarOrden(oc.idOc, texto), 'Orden cancelada.');
    if (accion === 'resolver')
      ejecutar(
        () => resolverOrden(oc.idOc, resultado, texto),
        resultado === 'COMPLETADA' ? 'Orden completada con lo recibido.' : 'Orden cancelada.',
      );
  };

  const pie =
    oc &&
    (accion ? (
      <>
        <button
          type="button"
          className="btn btn-secundario pie-izquierda"
          onClick={() => setAccion(null)}
        >
          Volver
        </button>
        <button
          type="button"
          className={
            accion === 'cancelar' || resultado === 'CANCELADA'
              ? 'btn btn-peligro'
              : 'btn btn-primario'
          }
          disabled={ocupado}
          onClick={confirmar}
        >
          {accion === 'cancelar' ? 'Sí, cancelar orden' : 'Confirmar resolución'}
        </button>
      </>
    ) : (
      (puedeEditar || puedeCancelar || puedeResolver) && (
        <>
          {puedeCancelar && (
            <button
              type="button"
              className="btn btn-fantasma pie-izquierda"
              onClick={() => {
                setAccion('cancelar');
                setError(null);
              }}
            >
              <XCircle size={16} /> Cancelar orden
            </button>
          )}
          {puedeEditar && (
            <>
              <button type="button" className="btn btn-secundario" onClick={() => onEditar(oc)}>
                <Pencil size={16} /> Editar
              </button>
              <button
                type="button"
                className="btn btn-primario"
                disabled={ocupado}
                onClick={emitir}
              >
                <Send size={16} /> Emitir orden
              </button>
            </>
          )}
          {puedeResolver && (
            <button
              type="button"
              className="btn btn-primario"
              onClick={() => {
                setAccion('resolver');
                setError(null);
              }}
            >
              <CheckCircle2 size={16} /> Resolver con el proveedor
            </button>
          )}
        </>
      )
    ));

  return (
    <Modal
      titulo={
        oc ? (
          <span className="titulo-con-badge">
            {oc.folio} <EstadoBadge estado={oc.estado} />
          </span>
        ) : (
          'Orden de compra'
        )
      }
      ancho="amplio"
      onCerrar={onCerrar}
      pie={pie || undefined}
    >
      <AlertaError error={errorCarga} />
      {!oc && !errorCarga && <p className="texto-secundario">Cargando…</p>}
      {oc && (
        <div className="form-columna">
          {exito && <Alerta tipo="exito">{exito}</Alerta>}
          {error && <Alerta>{error}</Alerta>}
          {diferencias && !accion && (
            <Alerta tipo="aviso">
              <strong>Diferencias en la recepción:</strong> {diferencias}
            </Alerta>
          )}

          {accion === 'cancelar' && (
            <label className="campo">
              <span className="campo-etiqueta">
                Motivo de la cancelación <span className="obligatorio">*</span>
              </span>
              <textarea
                className="input textarea"
                rows={2}
                maxLength={300}
                value={texto}
                placeholder="Ej.: El proveedor informó que no despachará"
                onChange={(e) => setTexto(e.target.value)}
                autoFocus
              />
            </label>
          )}

          {accion === 'resolver' && (
            <div className="form-columna">
              <div className="campo">
                <span className="campo-etiqueta">¿Cómo se resuelve?</span>
                <label className="check">
                  <input
                    type="radio"
                    name="resultado"
                    checked={resultado === 'COMPLETADA'}
                    onChange={() => setResultado('COMPLETADA')}
                  />
                  Aceptar lo recibido y dar la orden por completada
                </label>
                <label className="check">
                  <input
                    type="radio"
                    name="resultado"
                    checked={resultado === 'CANCELADA'}
                    onChange={() => setResultado('CANCELADA')}
                  />
                  Cancelar lo que falta (la orden queda cancelada)
                </label>
              </div>
              <label className="campo">
                <span className="campo-etiqueta">
                  Solución acordada con el proveedor <span className="obligatorio">*</span>
                </span>
                <textarea
                  className="input textarea"
                  rows={2}
                  maxLength={300}
                  value={texto}
                  placeholder="Ej.: El proveedor emitirá nota de crédito por las 2 cajas faltantes"
                  onChange={(e) => setTexto(e.target.value)}
                  autoFocus
                />
              </label>
              <p className="texto-secundario">
                Mientras no la resuelvas, la orden sigue esperando: si Logística registra la entrega
                que falta, se completa sola.
              </p>
            </div>
          )}

          <dl className="datos-grid">
            <div>
              <dt>Proveedor</dt>
              <dd>
                {oc.proveedor.razonSocial}
                <br />
                <span className="texto-secundario mono">{rutConPuntos(oc.proveedor.rutNit)}</span>
              </dd>
            </div>
            <div>
              <dt>Comprador</dt>
              <dd>{oc.comprador.nombre}</dd>
            </div>
            <div>
              <dt>Creada</dt>
              <dd>{fechaHora(oc.fechaCreacion)}</dd>
            </div>
            <div>
              <dt>Emitida</dt>
              <dd>{fechaHora(oc.fechaEmision)}</dd>
            </div>
            <div>
              <dt>Entrega comprometida</dt>
              <dd>{fecha(oc.fechaEntregaEsperada)}</dd>
            </div>
            <div>
              <dt>Recepción completa</dt>
              <dd>{fecha(oc.fechaRecepcionReal)}</dd>
            </div>
            {oc.motivoCancelacion && (
              <div className="form-ancho-completo">
                <dt>Motivo de cancelación</dt>
                <dd>{oc.motivoCancelacion}</dd>
              </div>
            )}
          </dl>

          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>SC origen</th>
                  <th>SKU</th>
                  <th>Producto</th>
                  <th className="num">Cantidad</th>
                  <th className="num">Precio unitario</th>
                  <th className="num">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {oc.lineas.map((l) => (
                  <tr key={l.idDetalle}>
                    <td className="mono">{l.folioSc}</td>
                    <td className="mono">{l.producto.sku}</td>
                    <td>{l.producto.nombre}</td>
                    <td className="num">{l.cantidad}</td>
                    <td className="num">{clp(l.precioUnitario)}</td>
                    <td className="num">{clp(l.subtotalLinea)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="totales">
            <dt>Subtotal</dt>
            <dd>{clp(oc.subtotal)}</dd>
            <dt>IVA 19 %</dt>
            <dd>{clp(oc.impuesto)}</dd>
            <dt className="totales-final">Total</dt>
            <dd className="totales-final">{clp(oc.total)}</dd>
          </dl>

          <div>
            <h3 className="subtitulo">Historial</h3>
            <ol className="historial">
              {oc.historial.map((h) => (
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
