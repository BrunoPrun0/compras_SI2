export type ViewId = 'panel' | 'solicitudes' | 'ordenes' | 'proveedores' | 'catalogo' | 'reportes';

export interface NavItem {
  id: ViewId;
  label: string;
}
