import { supabase } from '../lib/supabase';
import { agruparFiltros, type EstadoFiltros, type FiltroId } from '../utils/filtrosAceite';

/** Check list del cambio de aceite de todas las órdenes: { otId: { aire: true, diesel: false } }. */
export async function fetchFiltros(): Promise<Record<string, EstadoFiltros>> {
  // La tabla no tiene columna `id` (su clave es orden + filtro), así que se pagina con ese orden.
  const filas: { otId: string; filtro: string; cambiado: boolean }[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase.from('ot_filtros').select('ot_id,filtro,cambiado').order('ot_id').order('filtro').range(desde, desde + 999);
    if (error) throw error;
    const bloque = data ?? [];
    filas.push(...bloque.map(f => ({ otId: String(f.ot_id), filtro: String(f.filtro), cambiado: f.cambiado === true })));
    if (bloque.length < 1000) return agruparFiltros(filas);
  }
}

/** Marca un filtro como cambiado (true) o no cambiado (false), o quita la marca (null). */
export async function guardarFiltro(otId: string, filtro: FiltroId, cambiado: boolean | null, por: string): Promise<void> {
  if (cambiado === null) {
    const { error } = await supabase.from('ot_filtros').delete().eq('ot_id', otId).eq('filtro', filtro);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('ot_filtros').upsert(
    { ot_id: otId, filtro, cambiado, marcado_por: por, marcado_en: new Date().toISOString() },
    { onConflict: 'ot_id,filtro' },
  );
  if (error) throw error;
}
