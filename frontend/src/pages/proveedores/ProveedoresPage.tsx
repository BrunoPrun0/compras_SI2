import { PageHeader } from '../../components/PageHeader';
import { PlaceholderSection } from '../../components/PlaceholderSection';

export function ProveedoresPage() {
  return (
    <div className="content-container">
      <PageHeader title="Proveedores" description="Alta, edición y estado de proveedores" />
      <PlaceholderSection
        title="Listado de proveedores"
        description="Aquí se mostrará el listado y la administración de proveedores cuando se implemente la funcionalidad."
      />
    </div>
  );
}
