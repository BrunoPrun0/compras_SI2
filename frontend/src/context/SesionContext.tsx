import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { fijarEmpleadoActual } from '../api/cliente';
import type { EmpleadoRef } from '../types/api';

// Sprint 2: no hay login. El usuario actual se elige en un selector de empleados (RRHH)
// y se recuerda en el navegador. Sprint 3 reemplaza esto por el login con JWT.

const CLAVE = 'compras.empleadoActual';

interface Sesion {
  empleado: EmpleadoRef | null;
  seleccionar: (empleado: EmpleadoRef | null) => void;
}

const SesionContext = createContext<Sesion | null>(null);

function leerGuardado(): EmpleadoRef | null {
  try {
    const valor = localStorage.getItem(CLAVE);
    const e = valor ? (JSON.parse(valor) as EmpleadoRef) : null;
    return e && Number.isInteger(e.idEmpleado) ? e : null;
  } catch {
    return null;
  }
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [empleado, setEmpleado] = useState<EmpleadoRef | null>(() => {
    const guardado = leerGuardado();
    fijarEmpleadoActual(guardado?.idEmpleado ?? null);
    return guardado;
  });

  const seleccionar = useCallback((nuevo: EmpleadoRef | null) => {
    fijarEmpleadoActual(nuevo?.idEmpleado ?? null);
    try {
      if (nuevo) localStorage.setItem(CLAVE, JSON.stringify(nuevo));
      else localStorage.removeItem(CLAVE);
    } catch {
      // Sin almacenamiento disponible: la selección dura hasta recargar la página
    }
    setEmpleado(nuevo);
  }, []);

  return (
    <SesionContext.Provider value={{ empleado, seleccionar }}>{children}</SesionContext.Provider>
  );
}

export function useSesion(): Sesion {
  const sesion = useContext(SesionContext);
  if (!sesion) throw new Error('useSesion debe usarse dentro de <SesionProvider>');
  return sesion;
}
