// Edge Function: página del mecánico (/?taller=<token>).
//
//   GET  ?t=<token>  → órdenes del mecánico (recibido / en reparación / listo) y datos mínimos
//                      de la empresa para pintar la página.
//   POST {token, accion, otId, ...} → acciones del mecánico sobre SUS órdenes:
//        tarea (lineaId, hecha) · empezar · listo · reabrir · nota (texto).
//
// Pública a propósito (verify_jwt=false): el mecánico entra desde el móvil sin cuenta. La
// seguridad está en el token (256 bits aleatorios; en la BD solo está su hash SHA-256, el enlace
// es revocable y deja de valer si el técnico se desactiva) y en que el mecánico nunca toca las
// tablas: todo pasa por las funciones taller_* de la base de datos, que comprueban que la orden
// es suya y que el cambio de estado es válido, y que solo devuelven datos sin precios ni
// datos personales del cliente.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function sha256Hex(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const limpia = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim().slice(0, max) : '';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  async function tecnicoDe(token: string): Promise<{ id: string; nombre: string } | null> {
    if (!/^[a-f0-9]{64}$/.test(token)) return null;
    const { data } = await admin
      .from('tecnicos').select('id, nombre, activo').eq('enlace_hash', await sha256Hex(token)).maybeSingle();
    return data && data.activo ? { id: data.id, nombre: data.nombre } : null;
  }

  async function pagina(nombre: string) {
    const [{ data: emp }, { data: ordenes, error }] = await Promise.all([
      admin.from('empresa_config').select('nombre, brand_color, telefono').eq('id', 1).maybeSingle(),
      admin.rpc('taller_ordenes', { p_tecnico: nombre }),
    ]);
    if (error) throw error;
    return {
      estado: 'ok',
      tecnico: { nombre },
      empresa: { nombre: emp?.nombre ?? '', color: emp?.brand_color ?? '#C38DD6', telefono: emp?.telefono ?? '' },
      ordenes: ordenes ?? [],
      servidorAhora: new Date().toISOString(),
    };
  }

  try {
    if (req.method === 'GET') {
      const tec = await tecnicoDe(new URL(req.url).searchParams.get('t') ?? '');
      if (!tec) return json({ estado: 'invalido' });
      return json(await pagina(tec.nombre));
    }

    if (req.method === 'POST') {
      const texto = await req.text();
      if (texto.length > 4000) return json({ error: 'demasiado_grande' }, 413);
      let b: { token?: string; accion?: string; otId?: string; lineaId?: string; hecha?: boolean; texto?: string };
      try { b = JSON.parse(texto); } catch { return json({ error: 'cuerpo_invalido' }, 400); }

      const tec = await tecnicoDe(String(b.token ?? ''));
      if (!tec) return json({ error: 'invalido' }, 403);
      const otId = limpia(b.otId, 80);
      if (!otId) return json({ error: 'cuerpo_invalido' }, 400);

      let hecho = false;
      switch (b.accion) {
        case 'tarea': {
          const lineaId = limpia(b.lineaId, 80);
          if (!lineaId || typeof b.hecha !== 'boolean') return json({ error: 'cuerpo_invalido' }, 400);
          const { data, error } = await admin.rpc('taller_ot_tarea', { p_ot: otId, p_tecnico: tec.nombre, p_linea: lineaId, p_hecha: b.hecha });
          if (error) throw error;
          hecho = data === true;
          break;
        }
        case 'empezar':
        case 'listo':
        case 'reabrir':
        case 'nota': {
          const nota = limpia(b.texto, 500);
          if (b.accion === 'nota' && nota.length < 2) return json({ error: 'cuerpo_invalido' }, 400);
          const reglas = {
            empezar: { desc: `Reparación iniciada por ${tec.nombre}`, nuevo: 'en_reparacion', desde: ['recibido'] },
            listo: { desc: `Trabajo completado — marcado como listo por ${tec.nombre}`, nuevo: 'listo', desde: ['recibido', 'en_reparacion'] },
            reabrir: { desc: `Orden reabierta por ${tec.nombre}`, nuevo: 'en_reparacion', desde: ['listo'] },
            nota: { desc: `Nota de ${tec.nombre}: ${nota}`, nuevo: null, desde: ['recibido', 'en_reparacion', 'listo'] },
          }[b.accion];
          const { data, error } = await admin.rpc('taller_ot_evento', {
            p_ot: otId, p_tecnico: tec.nombre, p_descripcion: reglas.desc, p_estado_nuevo: reglas.nuevo, p_estados_validos: reglas.desde,
          });
          if (error) throw error;
          hecho = data === true;
          break;
        }
        default:
          return json({ error: 'accion_invalida' }, 400);
      }

      // La orden ya no es suya o cambió de estado mientras tanto: se devuelve la situación real para que la página se corrija.
      if (!hecho) return json({ error: 'no_permitido', ...(await pagina(tec.nombre)) }, 409);
      return json(await pagina(tec.nombre));
    }

    return json({ error: 'metodo_no_permitido' }, 405);
  } catch (e) {
    console.error('taller-mecanico', e);
    return json({ error: 'interno' }, 500);
  }
});
