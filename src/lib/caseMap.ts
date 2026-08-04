// Conversión SUPERFICIAL entre snake_case (columnas de Postgres) y camelCase
// (campos de la app). Solo se convierten las claves de nivel superior: el
// contenido de las columnas JSONB (líneas, historial, tarifas, etc.) se deja
// intacto, conservando sus claves camelCase tal cual las usa la app.

const toSnake = (s: string) => s.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
const toCamel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/** Fila de Supabase (snake_case) → objeto de la app (camelCase). */
export function rowToObj<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(row)) out[toCamel(k)] = row[k];
  return out as T;
}

/** Objeto de la app (camelCase) → fila de Supabase (snake_case). Omite undefined. */
export function objToRow(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[toSnake(k)] = obj[k];
  }
  return out;
}
