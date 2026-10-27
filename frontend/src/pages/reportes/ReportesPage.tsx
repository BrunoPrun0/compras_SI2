import { PageHeader } from '../../components/PageHeader';
import { PlaceholderSection } from '../../components/PlaceholderSection';

export function ReportesPage() {
  return (
    <div className="content-container">
      <PageHeader
        title="Reportes"
        description="Indicadores y reportes del módulo de Compras (Power BI)"
      />
      <PlaceholderSection
        title="Reportes e indicadores"
        description="Aquí se integrará el acceso a los reportes e indicadores (Power BI) del módulo cuando se implemente la funcionalidad."
      />
    </div>
  );
}
