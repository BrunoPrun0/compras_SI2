import { PageHeader } from '../../components/PageHeader';
import { PlaceholderSection } from '../../components/PlaceholderSection';

export function CatalogoPage() {
  return (
    <div className="content-container">
      <PageHeader
        title="Catálogo"
        description="Consulta de productos del catálogo (solo lectura, administrado por Inventario)"
      />
      <PlaceholderSection
        title="Consulta de catálogo"
        description="Aquí se mostrará la consulta del catálogo de productos cuando se implemente la funcionalidad."
      />
    </div>
  );
}
