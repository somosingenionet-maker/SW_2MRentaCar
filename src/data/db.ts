import { supabase } from '../lib/supabase';
import { rowToObj, objToRow } from '../lib/caseMap';

// Acceso genérico a una tabla de Supabase con conversión snake<->camel.
// Todas las entidades de negocio comparten estas tres operaciones.

// Supabase corta cada petición en 1.000 filas SIN avisar, así que una tabla se
// descarga siempre en bloques. Se ordena por id para que las páginas no se
// solapen ni se salten filas si algo cambia entre una petición y la siguiente.
const TAMANO_PAGINA = 1000;

/** Descarga una tabla completa (todas las filas, en bloques). */
export async function fetchPaginado(tabla: string, columnas = '*'): Promise<Record<string, unknown>[]> {
  const filas: Record<string, unknown>[] = [];
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await supabase.from(tabla).select(columnas).order('id').range(desde, desde + TAMANO_PAGINA - 1);
    if (error) throw error;
    const bloque = (data ?? []) as unknown as Record<string, unknown>[];
    filas.push(...bloque);
    if (bloque.length < TAMANO_PAGINA) return filas;
  }
}

export async function fetchAll<T>(table: string): Promise<T[]> {
  return (await fetchPaginado(table)).map(r => rowToObj<T>(r));
}

export async function upsertOne<T extends { id: string }>(table: string, item: T): Promise<void> {
  const { error } = await supabase.from(table).upsert(objToRow(item as unknown as Record<string, unknown>));
  if (error) throw error;
}

export async function deleteOne(table: string, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}
