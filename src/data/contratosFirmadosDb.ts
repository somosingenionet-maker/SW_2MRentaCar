import { supabase } from '../lib/supabase';
import { rowToObj, objToRow } from '../lib/caseMap';
import { fetchPaginado } from './db';
import type { ContratoFirmado } from '../types';

/** Reservas con firma vigente → fecha de la firma. Sin la imagen ni la copia, que pesan. */
export async function fetchFirmasVigentes(): Promise<Record<string, string>> {
  const filas = await fetchPaginado('contratos_firmados', 'id,reserva_id,firmado_en,anulado_en');
  const vigentes: Record<string, string> = {};
  for (const f of filas) if (!f.anulado_en) vigentes[String(f.reserva_id)] = String(f.firmado_en);
  return vigentes;
}

/** Contrato firmado y vigente de una reserva, o null si no está firmado. */
export async function fetchContratoFirmado(reservaId: string): Promise<ContratoFirmado | null> {
  const { data, error } = await supabase
    .from('contratos_firmados').select('*').eq('reserva_id', reservaId).is('anulado_en', null).maybeSingle();
  if (error) throw error;
  return data ? rowToObj<ContratoFirmado>(data as Record<string, unknown>) : null;
}

/** Guarda una firma nueva. Quién la registró lo pone la base de datos. Falla si la reserva ya tiene una firma vigente. */
export async function guardarContratoFirmado(c: ContratoFirmado): Promise<void> {
  const { error } = await supabase.from('contratos_firmados').insert(objToRow({
    id: c.id, reservaId: c.reservaId, idioma: c.idioma, contrato: c.contrato, firmaPng: c.firmaPng,
    huella: c.huella, firmadoEn: c.firmadoEn, dispositivo: c.dispositivo,
  }));
  if (error) throw error;
}

/** Anula la firma vigente (solo administradores). La anulada se conserva. */
export async function anularContratoFirmado(id: string, motivo: string): Promise<void> {
  const { data, error } = await supabase
    .from('contratos_firmados').update({ anulado_en: new Date().toISOString(), anulado_motivo: motivo }).eq('id', id).select('id');
  if (error) throw error;
  // Sin permiso, la base de datos no da error: simplemente no toca ninguna fila.
  if (!data || data.length === 0) throw new Error('Solo un administrador puede anular una firma.');
}
