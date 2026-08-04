// Edge Function: gestión de usuarios (crear / borrar / cambiar contraseña).
// Usa la clave service_role (privada, solo en el servidor) y verifica que
// quien llama sea admin o super_admin antes de hacer nada.
//
// Supabase inyecta automáticamente SUPABASE_URL, SUPABASE_ANON_KEY y
// SUPABASE_SERVICE_ROLE_KEY — no hay que configurar secretos manualmente.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Cliente con el token de quien llama, para saber quién es.
    const authHeader = req.headers.get('Authorization') ?? '';
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await caller.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: 'No autenticado' }, 401);

    // Cliente admin (service_role) para operaciones privilegiadas.
    const admin = createClient(url, serviceKey);
    const { data: perfil } = await admin.from('usuarios').select('rol').eq('id', user.id).single();
    const callerRol = perfil?.rol;
    if (callerRol !== 'admin' && callerRol !== 'super_admin') {
      return json({ error: 'No autorizado' }, 403);
    }

    const body = await req.json();
    const action = body.action as string;

    if (action === 'create') {
      const { email, password, nombre, rol, modulos } = body;
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nombre },
      });
      if (error || !created.user) return json({ error: error?.message ?? 'No se pudo crear' }, 400);
      // Solo un super_admin puede crear otro super_admin.
      const rolFinal = rol === 'super_admin' && callerRol !== 'super_admin' ? 'usuario' : rol;
      await admin.from('usuarios').update({ nombre, rol: rolFinal, modulos }).eq('id', created.user.id);
      return json({ ok: true, id: created.user.id });
    }

    if (action === 'delete') {
      const { id } = body;
      if (id === user.id) return json({ error: 'No puedes eliminar tu propia cuenta' }, 400);
      const { data: target } = await admin.from('usuarios').select('rol').eq('id', id).single();
      if (target?.rol === 'super_admin' && callerRol !== 'super_admin') {
        return json({ error: 'No autorizado para eliminar un super admin' }, 403);
      }
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === 'setPassword') {
      const { id, password } = body;
      const { data: target } = await admin.from('usuarios').select('rol').eq('id', id).single();
      if (target?.rol === 'super_admin' && callerRol !== 'super_admin') {
        return json({ error: 'No autorizado' }, 403);
      }
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: 'Acción no válida' }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
