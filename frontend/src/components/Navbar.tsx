import { Plus } from 'lucide-react';
import { SelectorEmpleado } from './SelectorEmpleado';
import type { NavItem, ViewId } from '../types/navigation';

// Estructura de navegación del módulo: fácil de ampliar cuando se definan nuevas vistas.
const NAV_ITEMS: NavItem[] = [
  { id: 'panel', label: 'Inicio' },
  { id: 'solicitudes', label: 'Solicitudes de compra' },
  { id: 'ordenes', label: 'Órdenes de compra' },
  { id: 'proveedores', label: 'Proveedores' },
  { id: 'catalogo', label: 'Catálogo' },
  { id: 'reportes', label: 'Reportes' },
];

interface NavbarProps {
  currentView: ViewId;
  onNavigate: (view: ViewId) => void;
  onNuevaSolicitud: () => void;
}

export function Navbar({ currentView, onNavigate, onNuevaSolicitud }: NavbarProps) {
  return (
    <header className="lesgo-header">
      {/* Espigas / dientes inferiores de Lego */}
      <div className="header-studs" aria-hidden="true" />

      {/* Logotipo LESGO con etiqueta del módulo */}
      <button
        type="button"
        className="lesgo-logo-btn"
        onClick={() => onNavigate('panel')}
        aria-label="Ir al inicio del módulo de Compras"
      >
        <span className="lesgo-logo-text">LESGO</span>
        <span className="lesgo-logo-badge">ERP · COMPRAS</span>
      </button>

      {/* Navegación del módulo */}
      <nav aria-label="Navegación del módulo de Compras">
        <ul className="lesgo-nav-links">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`nav-link-btn ${currentView === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Acceso rápido y usuario actual (Sprint 2: selector de empleado, sin login) */}
      <div className="lesgo-session-group">
        <button type="button" className="quick-action-btn" onClick={onNuevaSolicitud}>
          <Plus size={16} strokeWidth={2.4} />
          <span>Nueva solicitud</span>
        </button>

        <SelectorEmpleado />
      </div>
    </header>
  );
}
