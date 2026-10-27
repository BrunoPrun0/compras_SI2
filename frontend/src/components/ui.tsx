// Componentes de interfaz reutilizables del módulo (insignias, alertas, modal, paginación).
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import type { ErrorApi } from '../api/cliente';

// ---------- Insignia de estado ----------

const ETIQUETAS: Record<string, string> = {
  BORRADOR: 'Borrador',
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  ANULADA: 'Anulada',
  EMITIDA: 'Emitida',
  COMPLETADA: 'Completada',
  CON_PROBLEMAS: 'Con problemas',
  CANCELADA: 'Cancelada',
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
};

export function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span className={`badge badge-${estado.toLowerCase().replace('_', '-')}`}>
      {ETIQUETAS[estado] ?? estado}
    </span>
  );
}

// ---------- Alertas ----------

export function Alerta({
  tipo = 'error',
  children,
}: {
  tipo?: 'error' | 'aviso' | 'exito';
  children: ReactNode;
}) {
  return (
    <div className={`alerta alerta-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export function AlertaError({ error }: { error: ErrorApi | null }) {
  if (!error) return null;
  return <Alerta>{error.message}</Alerta>;
}

// ---------- Modal ----------

export function Modal({
  titulo,
  onCerrar,
  ancho = 'normal',
  children,
  pie,
}: {
  titulo: ReactNode;
  onCerrar: () => void;
  ancho?: 'normal' | 'amplio';
  children: ReactNode;
  pie?: ReactNode;
}) {
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [onCerrar]);

  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <section className={`modal modal-${ancho}`} role="dialog" aria-modal="true">
        <header className="modal-cabecera">
          <h2 className="modal-titulo">{titulo}</h2>
          <button type="button" className="btn-icono" onClick={onCerrar} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>
        <div className="modal-cuerpo">{children}</div>
        {pie && <footer className="modal-pie">{pie}</footer>}
      </section>
    </div>
  );
}

// ---------- Paginación ----------

export function Paginacion({
  page,
  pageSize,
  total,
  onCambiar,
}: {
  page: number;
  pageSize: number;
  total: number;
  onCambiar: (page: number) => void;
}) {
  const paginas = Math.max(1, Math.ceil(total / pageSize));
  const desde = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const hasta = Math.min(total, page * pageSize);
  return (
    <div className="paginacion">
      <span>
        {desde}–{hasta} de {total}
      </span>
      <div className="paginacion-botones">
        <button
          type="button"
          className="btn btn-secundario btn-chico"
          disabled={page <= 1}
          onClick={() => onCambiar(page - 1)}
        >
          Anterior
        </button>
        <span>
          Página {page} de {paginas}
        </span>
        <button
          type="button"
          className="btn btn-secundario btn-chico"
          disabled={page >= paginas}
          onClick={() => onCambiar(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

// ---------- Estados de tabla ----------

export function FilaMensaje({ columnas, children }: { columnas: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={columnas} className="tabla-mensaje">
        {children}
      </td>
    </tr>
  );
}
