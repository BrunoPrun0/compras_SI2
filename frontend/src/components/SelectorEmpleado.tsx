import { User } from 'lucide-react';
import { listarEmpleados } from '../api/compras';
import { useSesion } from '../context/SesionContext';
import { usePeticion } from '../hooks/usePeticion';

/**
 * Sprint 2 (sin login): elige con qué empleado de RRHH se opera.
 * El backend recibe su id en el header X-Empleado-Id y le asigna los roles SOLICITANTE + COMPRADOR.
 */
export function SelectorEmpleado() {
  const { empleado, seleccionar } = useSesion();
  const { datos: empleados, error } = usePeticion(() => listarEmpleados(), []);

  return (
    <label
      className="user-session-badge"
      title="Usuario con el que se opera (modo desarrollo, sin login)"
    >
      <User size={15} />
      <select
        className="selector-empleado"
        value={empleado?.idEmpleado ?? ''}
        onChange={(e) => {
          const id = Number(e.target.value);
          seleccionar(empleados?.find((x) => x.idEmpleado === id) ?? null);
        }}
        aria-label="Usuario actual"
      >
        <option value="">{error ? 'Sin conexión' : 'Elegir usuario…'}</option>
        {/* Si el guardado ya no viene en la lista, se mantiene visible */}
        {empleado && !empleados?.some((x) => x.idEmpleado === empleado.idEmpleado) && (
          <option value={empleado.idEmpleado}>{empleado.nombre}</option>
        )}
        {empleados?.map((e) => (
          <option key={e.idEmpleado} value={e.idEmpleado}>
            {e.nombre}
          </option>
        ))}
      </select>
      <span className="user-role-tag">SOLICITANTE · COMPRADOR</span>
    </label>
  );
}
