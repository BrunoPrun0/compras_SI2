import { Alerta } from '../../components/ui';
import type { DuplicadoSc } from '../../types/api';

/** V3: otras SC PENDIENTE o APROBADA sin OC que ya piden alguno de estos productos. */
export function AvisoDuplicados({ duplicados }: { duplicados: DuplicadoSc[] }) {
  return (
    <Alerta tipo="aviso">
      <strong>Posible duplicado.</strong> Estos productos ya están en otras solicitudes en curso:
      <ul className="lista-duplicados">
        {duplicados.map((d) => (
          <li key={`${d.idSolicitud}-${d.producto.idProducto}`}>
            <span className="mono">{d.folio}</span> ({d.estado.toLowerCase()}): {d.producto.nombre}{' '}
            × {d.cantidad}
          </li>
        ))}
      </ul>
      Revisa si de verdad necesitas pedirlos de nuevo. Si es así, confirma para continuar.
    </Alerta>
  );
}

export const esDuplicado = (code: string) => code === 'SC_POSIBLE_DUPLICADO';
