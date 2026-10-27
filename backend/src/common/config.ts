/** Validación del entorno al arrancar: si falta algo, el backend no levanta. */
export interface Entorno {
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_SCHEMA: string;
  DB_SSL: boolean;
  DB_POOL_MAX: number;
  CORS_ORIGIN: string;
  AUTH_MODE: 'dev' | 'jwt';
  RRHH_EMPLEADO_TABLE: string;
}

const REQUERIDAS = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const;
const TABLA_CALIFICADA = /^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/;

export function validarEntorno(env: Record<string, unknown>): Entorno {
  const faltan = REQUERIDAS.filter((k) => !env[k]);
  if (faltan.length) throw new Error(`Faltan variables en backend/.env: ${faltan.join(', ')}`);

  const authMode = String(env.AUTH_MODE ?? 'dev');
  if (authMode !== 'dev' && authMode !== 'jwt') throw new Error('AUTH_MODE debe ser "dev" o "jwt"');

  const tablaEmpleado = String(env.RRHH_EMPLEADO_TABLE || 'rrhh.rrhh_empleado');
  if (!TABLA_CALIFICADA.test(tablaEmpleado)) {
    throw new Error('RRHH_EMPLEADO_TABLE debe ser "schema.tabla" en minúsculas');
  }

  return {
    PORT: Number(env.PORT ?? 3000),
    DB_HOST: String(env.DB_HOST),
    DB_PORT: Number(env.DB_PORT ?? 5432),
    DB_NAME: String(env.DB_NAME),
    DB_USER: String(env.DB_USER),
    DB_PASSWORD: String(env.DB_PASSWORD),
    DB_SCHEMA: String(env.DB_SCHEMA || 'compras'),
    DB_SSL: String(env.DB_SSL) === 'true',
    DB_POOL_MAX: Number(env.DB_POOL_MAX || 5),
    CORS_ORIGIN: String(env.CORS_ORIGIN || 'http://localhost:5173'),
    AUTH_MODE: authMode,
    RRHH_EMPLEADO_TABLE: tablaEmpleado,
  };
}
