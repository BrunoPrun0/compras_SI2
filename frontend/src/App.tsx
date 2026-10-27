import { useState } from 'react';
import { MainLayout } from './components/MainLayout';
import { SesionProvider, useSesion } from './context/SesionContext';
import { PanelPage } from './pages/panel/PanelPage';
import { SolicitudesPage } from './pages/solicitudes/SolicitudesPage';
import { OrdenesPage } from './pages/ordenes/OrdenesPage';
import { ProveedoresPage } from './pages/proveedores/ProveedoresPage';
import { CatalogoPage } from './pages/catalogo/CatalogoPage';
import { ReportesPage } from './pages/reportes/ReportesPage';
import type { ViewId } from './types/navigation';
import './App.css';

// Vistas que llaman a la API y por lo tanto necesitan un usuario seleccionado.
const VISTAS_CON_USUARIO: ViewId[] = ['solicitudes', 'proveedores', 'catalogo'];

function Contenido() {
  const { empleado } = useSesion();
  const [currentView, setCurrentView] = useState<ViewId>('panel');
  // "Nueva solicitud" de la barra superior: la página abre el formulario y apaga la señal.
  const [abrirNuevaSc, setAbrirNuevaSc] = useState(false);

  const necesitaUsuario = VISTAS_CON_USUARIO.includes(currentView) && !empleado;

  return (
    <MainLayout
      currentView={currentView}
      onNavigate={setCurrentView}
      onNuevaSolicitud={() => {
        setCurrentView('solicitudes');
        setAbrirNuevaSc(true);
      }}
    >
      {necesitaUsuario ? (
        <div className="content-container">
          <div className="placeholder-card">
            <span className="placeholder-tag">Sin usuario</span>
            <h2 className="placeholder-title">Elige un usuario para continuar</h2>
            <p className="placeholder-description">
              Usa el selector de la barra superior para elegir con qué empleado operar. En el Sprint
              2 no hay login: la API identifica al usuario por el empleado seleccionado.
            </p>
          </div>
        </div>
      ) : (
        // La key recarga las vistas al cambiar de usuario
        <div key={empleado?.idEmpleado ?? 0}>
          {currentView === 'panel' && <PanelPage />}
          {currentView === 'solicitudes' && (
            <SolicitudesPage
              abrirNueva={abrirNuevaSc}
              onNuevaAbierta={() => setAbrirNuevaSc(false)}
            />
          )}
          {currentView === 'ordenes' && <OrdenesPage />}
          {currentView === 'proveedores' && <ProveedoresPage />}
          {currentView === 'catalogo' && <CatalogoPage />}
          {currentView === 'reportes' && <ReportesPage />}
        </div>
      )}
    </MainLayout>
  );
}

export function App() {
  return (
    <SesionProvider>
      <Contenido />
    </SesionProvider>
  );
}

export default App;
