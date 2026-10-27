// Cliente HTTP del módulo. Todas las llamadas a la API pasan por aquí.
// En desarrollo, Vite redirige /api a http://localhost:3000 (vite.config.ts).

const BASE = import.meta.env.VITE_API_URL || '/api';

/** Error de la API con el formato del contrato: {statusCode, code, message, details?}. */
export class ErrorApi extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown> | undefined;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function aErrorApi(e: unknown): ErrorApi {
  if (e instanceof ErrorApi) return e;
  return new ErrorApi(0, 'ERROR_CLIENTE', e instanceof Error ? e.message : String(e));
}

// Sprint 2 (AUTH_MODE=dev): el usuario actual viaja en el header X-Empleado-Id.
// En Sprint 3 aquí se cambiará por Authorization: Bearer <jwt>.
let idEmpleadoActual: number | null = null;

export function fijarEmpleadoActual(id: number | null): void {
  idEmpleadoActual = id;
}

type ValorQuery = string | number | boolean | null | undefined;

interface Opciones {
  metodo?: 'GET' | 'POST' | 'PATCH';
  query?: Record<string, ValorQuery>;
  cuerpo?: unknown;
}

export async function pedir<T>(
  ruta: string,
  { metodo = 'GET', query, cuerpo }: Opciones = {},
): Promise<T> {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(query ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') params.set(clave, String(valor));
  }
  const url = `${BASE}${ruta}${params.size ? `?${params}` : ''}`;

  const headers: Record<string, string> = {};
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  if (idEmpleadoActual !== null) headers['X-Empleado-Id'] = String(idEmpleadoActual);

  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      method: metodo,
      headers,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorApi(
      0,
      'SIN_CONEXION',
      'No se pudo conectar con el servidor. ¿Está corriendo el backend?',
    );
  }

  const texto = await respuesta.text();
  let datos: unknown = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    // Respuesta que no es JSON (p. ej. el proxy de Vite sin backend)
  }

  if (!respuesta.ok) {
    const e = (datos ?? {}) as {
      code?: string;
      message?: string;
      details?: Record<string, unknown>;
    };
    const sinBackend = respuesta.status >= 500 && !e.code;
    throw new ErrorApi(
      respuesta.status,
      e.code ?? (sinBackend ? 'SIN_CONEXION' : 'ERROR'),
      e.message ??
        (sinBackend
          ? 'No se pudo conectar con el servidor. ¿Está corriendo el backend?'
          : `Error ${respuesta.status}`),
      e.details,
    );
  }
  return datos as T;
}
