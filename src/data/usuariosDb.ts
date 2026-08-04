import { supabase } from '../lib/supabase';
import { Usuario, ModuloId } from '../types';

function mapUsuario(row: Record<string, unknown>): Usuario {
  return {
    id: String(row.id),
    nombre: (row.nombre as string) ?? '',
    email: (row.email as string) ?? '',
    rol: (row.rol as Usuario['rol']) ?? 'usuario',
    modulos: (row.modulos as ModuloId[]) ?? [],
    activo: Boolean(row.activo),
    fechaCreacion: (row.fecha_creacion as string) ?? '',
  };
}

/** Lista los usuarios (perfiles) desde la tabla `usuarios`. */
export async function fetchUsuarios(): Promise<Usuario[]> {
  const { data, error } = await supabase.from('usuarios').select('*').order('fecha_creacion', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(r => mapUsuario(r as Record<string, unknown>));
}

/** Actualiza campos del perfil (rol, módulos, activo, nombre) — vía RLS. */
export async function updateUsuarioProfile(
  id: string,
  patch: { nombre?: string; rol?: string; modulos?: ModuloId[]; activo?: boolean }
): Promise<void> {
  const { error } = await supabase.from('usuarios').update(patch).eq('id', id);
  if (error) throw error;
}

// Operaciones privilegiadas (crear/borrar/contraseña) vía Edge Function.
async function invokeAdmin(body: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = await (error as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json?.();
      if (ctx?.error) msg = ctx.error;
    } catch { /* sin cuerpo legible */ }
    throw new Error(msg);
  }
  if (data && (data as { error?: string }).error) throw new Error((data as { error: string }).error);
}

export async function createUsuario(p: {
  email: string; password: string; nombre: string; rol: string; modulos: ModuloId[];
}): Promise<void> {
  await invokeAdmin({ action: 'create', ...p });
}

export async function deleteUsuario(id: string): Promise<void> {
  await invokeAdmin({ action: 'delete', id });
}

export async function setUsuarioPassword(id: string, password: string): Promise<void> {
  await invokeAdmin({ action: 'setPassword', id, password });
}
