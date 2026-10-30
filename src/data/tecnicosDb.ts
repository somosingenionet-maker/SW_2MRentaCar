import { supabase } from '../lib/supabase';
import { rowToObj, objToRow } from '../lib/caseMap';
import { fetchPaginado } from './db';
import { agruparTareasHechas } from '../utils/tallerMecanico';
import type { Tecnico } from '../types';

// Nunca se descarga `enlace_hash`: el personal no lo necesita y no debe circular.
const COLUMNAS = 'id,nombre,especialidad,telefono,activo,enlace_creado_en';

export async function fetchTecnicos(): Promise<Tecnico[]> {
  return (await fetchPaginado('tecnicos', COLUMNAS)).map(r => rowToObj<Tecnico>(r));
}

/** Guarda los datos del técnico. No toca el enlace: se gestiona solo con crearEnlaceTecnico / revocarEnlaceTecnico. */
export async function guardarTecnico(t: Tecnico): Promise<void> {
  const { error } = await supabase.from('tecnicos').upsert(objToRow({
    id: t.id, nombre: t.nombre, especialidad: t.especialidad ?? null, telefono: t.telefono ?? null, activo: t.activo,
  }));
  if (error) throw error;
}

const aHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

/**
 * Crea (o sustituye) el enlace personal del mecánico y devuelve el token en claro. Es la única vez que
 * existe: en la base solo queda su hash SHA-256, así que si se pierde hay que crear otro, y el anterior
 * deja de funcionar.
 */
export async function crearEnlaceTecnico(id: string): Promise<{ token: string; creadoEn: string }> {
  const token = aHex(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const hash = aHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
  const creadoEn = new Date().toISOString();
  const { data, error } = await supabase.from('tecnicos').update({ enlace_hash: hash, enlace_creado_en: creadoEn }).eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('No se encontró el técnico.');
  return { token, creadoEn };
}

/** Desactiva el enlace del mecánico: la página deja de funcionar en su siguiente actualización. */
export async function revocarEnlaceTecnico(id: string): Promise<void> {
  const { error } = await supabase.from('tecnicos').update({ enlace_hash: null, enlace_creado_en: null }).eq('id', id);
  if (error) throw error;
}

/** Tareas que los mecánicos han marcado como hechas: { otId: [lineaId, ...] }. */
export async function fetchTareasHechas(): Promise<Record<string, string[]>> {
  // La tabla no tiene columna `id` (su clave es orden + línea), así que se pagina con ese orden.
  const filas: { otId: string; lineaId: string }[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase.from('ot_tareas').select('ot_id,linea_id').order('ot_id').order('linea_id').range(desde, desde + 999);
    if (error) throw error;
    const bloque = data ?? [];
    filas.push(...bloque.map(f => ({ otId: String(f.ot_id), lineaId: String(f.linea_id) })));
    if (bloque.length < 1000) return agruparTareasHechas(filas);
  }
}

/** Cambia el nombre en las órdenes del técnico: se enlazan por nombre, y sin esto perdería sus coches al renombrarlo. */
export async function renombrarTecnicoEnOrdenes(anterior: string, nuevo: string): Promise<void> {
  const { error } = await supabase.from('ordenes_trabajo').update({ tecnico_asignado: nuevo }).eq('tecnico_asignado', anterior);
  if (error) throw error;
}
