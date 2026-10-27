import { ClipboardList, FileText, Truck, Users } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';

// Indicadores ilustrativos: solo para visualizar la plantilla, no reflejan datos reales.
const DEMO_INDICATORS = [
  { icon: FileText, label: 'Solicitudes pendientes', value: '8' },
  { icon: Truck, label: 'Órdenes emitidas', value: '5' },
  { icon: ClipboardList, label: 'Órdenes con problemas', value: '1' },
  { icon: Users, label: 'Proveedores activos', value: '12' },
];

export function PanelPage() {
  return (
    <div className="content-container">
      <PageHeader title="Módulo de Compras" description="Gestión de adquisiciones y proveedores" />

      <section className="indicators-grid" aria-label="Indicadores de ejemplo">
        {DEMO_INDICATORS.map(({ icon: Icon, label, value }) => (
          <article key={label} className="indicator-card">
            <div className="indicator-icon">
              <Icon size={20} strokeWidth={2.2} />
            </div>
            <div>
              <p className="indicator-value">{value}</p>
              <p className="indicator-label">{label}</p>
            </div>
            <span className="indicator-demo-tag">Dato de demostración</span>
          </article>
        ))}
      </section>

      <section className="content-placeholder-area" aria-label="Área de contenido del módulo">
        <p>
          Este espacio alojará las pantallas reales del módulo (resumen operativo, alertas y accesos
          directos) a medida que se implementen las funcionalidades de Compras.
        </p>
      </section>
    </div>
  );
}
