import { useCallback, useEffect, useRef, useState } from 'react';
import { aErrorApi, type ErrorApi } from '../api/cliente';

/**
 * Ejecuta una consulta a la API cuando cambian `deps` y expone datos, error y estado de carga.
 * Ignora respuestas que llegan tarde (si los filtros cambiaron mientras tanto).
 */
export function usePeticion<T>(consulta: () => Promise<T>, deps: unknown[]) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0);
  const consultaRef = useRef(consulta);
  consultaRef.current = consulta;

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    consultaRef
      .current()
      .then((d) => vigente && setDatos(d))
      .catch((e: unknown) => vigente && setError(aErrorApi(e)))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [...deps, version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  return { datos, error, cargando, recargar };
}

/** Devuelve `valor` después de `ms` sin cambios (para búsquedas mientras se escribe). */
export function useDebounce<T>(valor: T, ms = 300): T {
  const [diferido, setDiferido] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setDiferido(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return diferido;
}
