import { useState } from 'react';
import { MainLayout } from './components/MainLayout';
import { PanelPage } from './pages/panel/PanelPage';
import { SolicitudesPage } from './pages/solicitudes/SolicitudesPage';
import { OrdenesPage } from './pages/ordenes/OrdenesPage';
import { ProveedoresPage } from './pages/proveedores/ProveedoresPage';
import { CatalogoPage } from './pages/catalogo/CatalogoPage';
import { ReportesPage } from './pages/reportes/ReportesPage';
import type { ViewId } from './types/navigation';
import './App.css';

export function App() {
  const [currentView, setCurrentView] = useState<ViewId>('panel');

  return (
    <MainLayout currentView={currentView} onNavigate={setCurrentView}>
      {currentView === 'panel' && <PanelPage />}
      {currentView === 'solicitudes' && <SolicitudesPage />}
      {currentView === 'ordenes' && <OrdenesPage />}
      {currentView === 'proveedores' && <ProveedoresPage />}
      {currentView === 'catalogo' && <CatalogoPage />}
      {currentView === 'reportes' && <ReportesPage />}
    </MainLayout>
  );
}

export default App;
