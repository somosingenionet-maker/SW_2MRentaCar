import { supabase } from './supabase';
import { Usuario, ModuloId } from '../types';

/** Convierte una fila de la tabla `usuarios` (snake_case) al tipo Usuario. */
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

/** Devuelve el perfil `usuarios` del usuario con esa id de Auth. */
async function fetchPerfil(userId: string): Promise<Usuario | null> {
  const { data, error } = await supabase.from('usuarios').select('*').eq('id', userId).single();
  if (error || !data) return null;
  return mapUsuario(data as Record<string, unknown>);
}

/** Inicia sesión con email + contraseña. Lanza Error con mensaje legible si falla. */
export async function signIn(email: string, password: string): Promise<Usuario> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) {
    const msg = error?.message ?? '';
    if (msg) console.error('Error de inicio de sesión:', msg);
    if (/invalid login credentials/i.test(msg)) {
      throw new Error('Credenciales incorrectas. Verifica tu email y contraseña.');
    }
    if (/email not confirmed/i.test(msg)) {
      throw new Error('Tu email aún no está confirmado. Contacta con el administrador.');
    }
    if (/failed to fetch|networkerror|load failed|fetch/i.test(msg)) {
      throw new Error('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo en unos minutos.');
    }
    throw new Error('No se pudo iniciar sesión. Inténtalo de nuevo.');
  }
  const perfil = await fetchPerfil(data.user.id);
  if (!perfil) {
    await supabase.auth.signOut();
    throw new Error('Tu cuenta no tiene un perfil configurado. Contacta con el administrador.');
  }
  if (!perfil.activo) {
    await supabase.auth.signOut();
    throw new Error('Tu cuenta está desactivada. Contacta con el administrador.');
  }
  return perfil;
}

/** Cierra la sesión actual. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** Devuelve el usuario de la sesión activa (o null si no hay sesión válida). */
export async function getSessionUsuario(): Promise<Usuario | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  const perfil = await fetchPerfil(data.session.user.id);
  return perfil && perfil.activo ? perfil : null;
}

/** Envía un email de restablecimiento de contraseña. */
export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}
