import { supabase } from '../lib/supabase';
import { rowToObj, objToRow } from '../lib/caseMap';
import { Vehiculo } from '../types';

/** Carga todos los vehículos desde Supabase. */
export async function fetchVehiculos(): Promise<Vehiculo[]> {
  const { data, error } = await supabase.from('vehiculos').select('*');
  if (error) throw error;
  return (data ?? []).map(r => rowToObj<Vehiculo>(r as Record<string, unknown>));
}

/** Crea o actualiza un vehículo (upsert por id). */
export async function upsertVehiculo(v: Vehiculo): Promise<void> {
  const { error } = await supabase.from('vehiculos').upsert(objToRow(v as unknown as Record<string, unknown>));
  if (error) throw error;
}

/** Elimina un vehículo por id. */
export async function deleteVehiculoDb(id: string): Promise<void> {
  const { error } = await supabase.from('vehiculos').delete().eq('id', id);
  if (error) throw error;
}
