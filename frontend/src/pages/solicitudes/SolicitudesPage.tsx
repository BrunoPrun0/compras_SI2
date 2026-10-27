import { PageHeader } from '../../components/PageHeader';
import { PlaceholderSection } from '../../components/PlaceholderSection';

export function SolicitudesPage() {
  return (
    <div className="content-container">
      <PageHeader
        title="Solicitudes de compra"
        description="Creación, edición y seguimiento de solicitudes (SC)"
      />
      <PlaceholderSection
        title="Listado de solicitudes"
        description="Aquí se mostrará el listado, la creación y el flujo de aprobación de las solicitudes de compra cuando se implemente la funcionalidad."
      />
    </div>
  );
}
