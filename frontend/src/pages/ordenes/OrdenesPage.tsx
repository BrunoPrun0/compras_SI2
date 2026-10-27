import { PageHeader } from '../../components/PageHeader';
import { PlaceholderSection } from '../../components/PlaceholderSection';

export function OrdenesPage() {
  return (
    <div className="content-container">
      <PageHeader title="Órdenes de compra" description="Emisión y seguimiento de órdenes (OC)" />
      <PlaceholderSection
        title="Listado de órdenes"
        description="Aquí se mostrará el listado, la emisión y el seguimiento de las órdenes de compra cuando se implemente la funcionalidad."
      />
    </div>
  );
}
