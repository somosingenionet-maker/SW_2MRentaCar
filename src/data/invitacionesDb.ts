import { supabase } from '../lib/supabase';
import { rowToObj } from '../lib/caseMap';
import { InvitacionCliente } from '../types';

// Nunca se descarga `token_hash`: el personal no lo necesita y no debe circular.
const COLUMNAS = 'id,cliente_id,estado,expira_en,datos,idioma,completada_en,creada_en';

export async function fetchInvitaciones(): Promise<InvitacionCliente[]> {
  const { data, error } = await supabase.from('invitaciones_cliente').select(COLUMNAS);
  if (error) throw error;
  return (data ?? []).map(r => rowToObj<InvitacionCliente>(r as unknown as Record<string, unknown>));
}

const DIAS_VALIDEZ = 7;

const aHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

/**
 * Crea la invitación y devuelve el token en claro. Es la única vez que existe:
 * en la base de datos solo queda su hash SHA-256, así que si se pierde el
 * enlace hay que generar otro.
 */
export async function crearInvitacion(id: string, clienteId: string | null): Promise<{ invitacion: InvitacionCliente; token: string }> {
  const token = aHex(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const tokenHash = aHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
  const ahora = new Date();
  const expiraEn = new Date(ahora.getTime() + DIAS_VALIDEZ * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from('invitaciones_cliente').insert({
    id, token_hash: tokenHash, cliente_id: clienteId, estado: 'pendiente', expira_en: expiraEn,
  });
  if (error) throw error;
  return {
    token,
    invitacion: { id, clienteId: clienteId ?? undefined, estado: 'pendiente', expiraEn, creadaEn: ahora.toISOString() },
  };
}

export async function updateEstadoInvitacion(id: string, estado: InvitacionCliente['estado']): Promise<void> {
  const { error } = await supabase.from('invitaciones_cliente').update({ estado }).eq('id', id);
  if (error) throw error;
}
