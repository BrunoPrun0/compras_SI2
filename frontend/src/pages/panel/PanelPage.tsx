import { ClipboardList, FilePen, Package, Users } from 'lucide-react';
import { listarProductos, listarProveedores, listarSolicitudes } from '../../api/compras';
import { PageHeader } from '../../components/PageHeader';
import { AlertaError } from '../../components/ui';
import { usePeticion } from '../../hooks/usePeticion';

// Contadores reales a partir de los listados (solo se usa `total`). Los de órdenes de compra
// llegan en Sprint 3 con GET /panel/resumen.
async function cargarIndicadores() {
  const [pendientes, borradores, proveedores, productos] = await Promise.all([
    listarSolicitudes({ estado: 'PENDIENTE', pageSize: 1 }),
    listarSolicitudes({ estado: 'BORRADOR', pageSize: 1 }),
    listarProveedores({ estado: 'ACTIVO', pageSize: 1 }),
    listarProductos({ soloActivos: true, pageSize: 1 }),
  ]);
  return [
    { icon: ClipboardList, label: 'Solicitudes pendientes de aprobación', value: pendientes.total },
    { icon: FilePen, label: 'Solicitudes en borrador', value: borradores.total },
    { icon: Users, label: 'Proveedores activos', value: proveedores.total },
    { icon: Package, label: 'Productos activos en catálogo', value: productos.total },
  ];
}

export function PanelPage() {
  const { datos, error, cargando } = usePeticion(cargarIndicadores, []);

  return (
    <div className="content-container">
      <PageHeader title="Módulo de Compras" description="Gestión de adquisiciones y proveedores" />

      <AlertaError error={error} />

      {datos && (
        <section className="indicators-grid" aria-label="Indicadores" aria-busy={cargando}>
          {datos.map(({ icon: Icon, label, value }) => (
            <article key={label} className="indicator-card">
              <div className="indicator-icon">
                <Icon size={20} strokeWidth={2.2} />
              </div>
              <div>
                <p className="indicator-value">{value}</p>
                <p className="indicator-label">{label}</p>
              </div>
            </article>
          ))}
        </section>
      )}
      {cargando && !datos && <p className="placeholder-description">Cargando indicadores…</p>}

      <section className="content-placeholder-area" aria-label="Próximos indicadores">
        <p>
          Los indicadores de órdenes de compra (emitidas, con problemas y gasto del mes) se
          incorporan en el Sprint 3, junto con la gestión de órdenes.
        </p>
      </section>
    </div>
  );
}
