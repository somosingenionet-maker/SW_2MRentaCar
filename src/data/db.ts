import { supabase } from '../lib/supabase';
import { rowToObj, objToRow } from '../lib/caseMap';

// Acceso genérico a una tabla de Supabase con conversión snake<->camel.
// Todas las entidades de negocio comparten estas tres operaciones.

export async function fetchAll<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*');
  if (error) throw error;
  return (data ?? []).map(r => rowToObj<T>(r as Record<string, unknown>));
}

export async function upsertOne<T extends { id: string }>(table: string, item: T): Promise<void> {
  const { error } = await supabase.from(table).upsert(objToRow(item as unknown as Record<string, unknown>));
  if (error) throw error;
}

export async function deleteOne(table: string, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}
