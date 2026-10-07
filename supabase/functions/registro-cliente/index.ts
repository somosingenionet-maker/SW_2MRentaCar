// Edge Function: autorregistro de clientes por enlace de un solo uso.
//
//   GET  ?t=<token>  → dice si el enlace es válido y devuelve lo mínimo para
//                      pintar el formulario (nombre de la empresa, color y
//                      datos de contacto que ya tenemos del cliente).
//   POST {token, datos} → valida y guarda lo que el cliente envía en
//                      invitaciones_cliente.datos (estado 'completada'). NO
//                      toca la ficha del cliente: el personal lo revisa antes.
//
// Pública a propósito (verify_jwt=false): la usa el cliente desde su móvil sin
// cuenta. La seguridad está en el token: 256 bits aleatorios, caducidad, un
// solo uso, y en la BD solo se guarda su hash SHA-256.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

async function sha256Hex(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE';

// DNI: 8 cifras + letra de control. NIE: X/Y/Z + 7 cifras + letra de control.
function documentoValido(tipo: string, doc: string): boolean {
  if (tipo === 'dni') {
    if (!/^\d{8}[A-Z]$/.test(doc)) return false;
    return LETRAS_DNI[parseInt(doc.slice(0, 8), 10) % 23] === doc[8];
  }
  if (tipo === 'nie') {
    if (!/^[XYZ]\d{7}[A-Z]$/.test(doc)) return false;
    const num = 'XYZ'.indexOf(doc[0]) + doc.slice(1, 8);
    return LETRAS_DNI[parseInt(num, 10) % 23] === doc[8];
  }
  return /^[A-Z0-9]{5,20}$/.test(doc); // pasaporte u otro documento extranjero
}

const limpia = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Busca la invitación por token y devuelve su estado real.
  async function cargar(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) return { estado: 'invalido' as const };
    const { data } = await admin
      .from('invitaciones_cliente')
      .select('id, estado, expira_en, cliente_id')
      .eq('token_hash', await sha256Hex(token))
      .maybeSingle();
    if (!data) return { estado: 'invalido' as const };
    if (data.estado === 'completada' || data.estado === 'aplicada') return { estado: 'usado' as const };
    if (data.estado === 'cancelada') return { estado: 'invalido' as const };
    if (new Date(data.expira_en).getTime() < Date.now()) return { estado: 'expirado' as const };
    return { estado: 'ok' as const, inv: data };
  }

  try {
    if (req.method === 'GET') {
      const token = new URL(req.url).searchParams.get('t') ?? '';
      const r = await cargar(token);
      if (r.estado !== 'ok') return json({ estado: r.estado });

      const { data: emp } = await admin
        .from('empresa_config').select('nombre, brand_color, telefono, correo, razon_social, nif, direccion_fiscal').eq('id', 1).maybeSingle();
      let cliente: Record<string, string> | null = null;
      if (r.inv.cliente_id) {
        const { data: c } = await admin
          .from('clientes').select('nombre, apellidos, correo, telefono, direccion, ciudad, pais').eq('id', r.inv.cliente_id).maybeSingle();
        cliente = c;
      }
      return json({
        estado: 'ok',
        empresa: {
          nombre: emp?.nombre ?? '', color: emp?.brand_color ?? '#C38DD6', telefono: emp?.telefono ?? '',
          correo: emp?.correo ?? '', razonSocial: emp?.razon_social ?? '', nif: emp?.nif ?? '', direccion: emp?.direccion_fiscal ?? '',
        },
        cliente,
      });
    }

    if (req.method === 'POST') {
      const texto = await req.text();
      if (texto.length > 20000) return json({ error: 'demasiado_grande' }, 413);
      let body: { token?: string; datos?: Record<string, unknown> };
      try { body = JSON.parse(texto); } catch { return json({ error: 'cuerpo_invalido' }, 400); }

      const r = await cargar(String(body.token ?? ''));
      if (r.estado !== 'ok') return json({ error: r.estado }, 410);

      const d = body.datos ?? {};
      const tipo = ['dni', 'nie', 'pasaporte'].includes(String(d.tipoDocumento)) ? String(d.tipoDocumento) : '';
      const documento = limpia(d.documento, 30).toUpperCase().replace(/[\s.-]+/g, '');
      const datos = {
        nombre: limpia(d.nombre, 80),
        apellidos: limpia(d.apellidos, 120),
        tipoDocumento: tipo,
        documento,
        correo: limpia(d.correo, 120).toLowerCase(),
        telefono: limpia(d.telefono, 30),
        direccion: limpia(d.direccion, 200),
        ciudad: limpia(d.ciudad, 80),
        pais: limpia(d.pais, 60),
      };

      const errores: string[] = [];
      if (!datos.nombre) errores.push('nombre');
      if (!datos.apellidos) errores.push('apellidos');
      if (!tipo || !documentoValido(tipo, documento)) errores.push('documento');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(datos.correo)) errores.push('correo');
      if (datos.telefono.replace(/\D/g, '').length < 7) errores.push('telefono');
      if (!datos.direccion) errores.push('direccion');
      if (!datos.ciudad) errores.push('ciudad');
      if (!datos.pais) errores.push('pais');
      if (d.consentimiento !== true) errores.push('consentimiento');
      if (errores.length) return json({ error: 'validacion', campos: errores }, 422);

      const idioma = ['es', 'en'].includes(String(d.idioma)) ? String(d.idioma) : null;
      // El `.eq('estado','pendiente')` evita que dos envíos simultáneos con el mismo enlace se pisen.
      const { data: actualizadas, error } = await admin
        .from('invitaciones_cliente')
        .update({ datos: { ...datos, consentimientoEn: new Date().toISOString() }, estado: 'completada', completada_en: new Date().toISOString(), idioma })
        .eq('id', r.inv.id).eq('estado', 'pendiente')
        .select('id');
      if (error) { console.error('registro-cliente', error.message); return json({ error: 'no_guardado' }, 500); }
      if (!actualizadas?.length) return json({ error: 'usado' }, 410);
      return json({ ok: true });
    }

    return json({ error: 'metodo_no_permitido' }, 405);
  } catch (e) {
    console.error('registro-cliente', e);
    return json({ error: 'interno' }, 500);
  }
});
