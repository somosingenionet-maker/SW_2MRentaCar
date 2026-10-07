// Edge Function: recibe los pedidos de alquiler de la web (WooCommerce) y los
// guarda en la bandeja `solicitudes_reserva`. NO crea reservas: la web vende
// un modelo ("Fiat Doblo o similar") y alguien del equipo asigna el coche.
//
// DESPLIEGUE: esta función es pública (la llama WooCommerce, no un usuario
// con sesión), así que hay que desplegarla SIN verificación de JWT
// (`--no-verify-jwt` en la CLI, o desactivar "Verify JWT" en el panel).
// La seguridad la da la firma HMAC que WooCommerce añade a cada aviso.
//
// SECRETO necesario (Edge Functions → Secrets): WOO_WEBHOOK_SECRET, el mismo
// valor que se pone en el webhook de WooCommerce (campo "Secret").
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase solos.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const encoder = new TextEncoder();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// WooCommerce firma el cuerpo con HMAC-SHA256 (base64) en X-WC-Webhook-Signature.
async function firmaValida(cuerpo: string, recibida: string | null, secreto: string): Promise<boolean> {
  if (!recibida) return false;
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(cuerpo)));
  let bin = '';
  for (const b of mac) bin += String.fromCharCode(b);
  const esperada = btoa(bin);
  if (esperada.length !== recibida.length) return false;
  let diff = 0;
  for (let i = 0; i < esperada.length; i++) diff |= esperada.charCodeAt(i) ^ recibida.charCodeAt(i);
  return diff === 0;
}

function esPing(cuerpo: string): boolean {
  if (/^webhook_id=\d+$/.test(cuerpo.trim())) return true;
  try {
    const o = JSON.parse(cuerpo);
    return !!o && typeof o === 'object' && Object.keys(o).length === 1 && 'webhook_id' in o;
  } catch {
    return false;
  }
}

const MESES: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8,
  september: 9, october: 10, november: 11, december: 12,
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8,
  septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

const dos = (n: number) => String(n).padStart(2, '0');

// "September 13, 2026 12:00 am" → "2026-09-13T00:00" (hora local de la oficina,
// sin zona horaria, igual que el resto de fechas de la app). Si no se entiende
// el formato devuelve null y el dato original sigue disponible en `payload`.
function parseFecha(txt: unknown): string | null {
  if (typeof txt !== 'string') return null;
  const t = txt.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 16).replace(' ', 'T');
  const m = t.match(/^([A-Za-zÀ-ÿ]+)\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!m) return null;
  const mes = MESES[m[1].toLowerCase()];
  if (!mes) return null;
  let h = parseInt(m[4], 10);
  const ampm = m[6]?.toLowerCase();
  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  return `${m[3]}-${dos(mes)}-${dos(parseInt(m[2], 10))}T${dos(h)}:${m[5]}`;
}

type Meta = { key: string; value: unknown };
type LineItem = { name?: string; product_id?: number; quantity?: number; total?: string };

// Quita datos personales/técnicos que no hacen falta para operar (minimización RGPD).
function sanear(order: Record<string, unknown>): Record<string, unknown> {
  const copia: Record<string, unknown> = { ...order };
  for (const k of ['customer_ip_address', 'customer_user_agent', 'order_key', 'cart_hash', 'payment_url', '_links']) {
    delete copia[k];
  }
  if (Array.isArray(copia.meta_data)) {
    copia.meta_data = (copia.meta_data as Meta[]).filter(
      m => !m.key.startsWith('_wc_order_attribution') && !m.key.startsWith('_ppcp'),
    );
  }
  return copia;
}

const ESTADOS_IGNORADOS = new Set(['auto-draft', 'checkout-draft', 'trash']);

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const secreto = Deno.env.get('WOO_WEBHOOK_SECRET');
  if (!secreto) return json({ error: 'Falta el secreto WOO_WEBHOOK_SECRET' }, 500);

  const cuerpo = await req.text();

  // El "ping" que WooCommerce manda al guardar el webhook NO va firmado y solo
  // trae el id del webhook ({"webhook_id":N}): no contiene datos ni hace nada,
  // así que se contesta 200 antes de exigir firma (si no, WooCommerce se niega
  // a guardar el webhook). Cualquier otra petición debe venir firmada.
  if (esPing(cuerpo)) return json({ ok: true, ping: true });

  if (!(await firmaValida(cuerpo, req.headers.get('x-wc-webhook-signature'), secreto))) {
    return json({ error: 'Firma no válida' }, 401);
  }

  let order: Record<string, any>;
  try {
    order = JSON.parse(cuerpo);
  } catch {
    return json({ error: 'Cuerpo no válido' }, 400);
  }
  if (!order || typeof order !== 'object' || !order.id || !Array.isArray(order.line_items)) {
    return json({ ok: true, ignorado: 'sin datos de pedido' });
  }
  if (ESTADOS_IGNORADOS.has(String(order.status))) {
    return json({ ok: true, ignorado: order.status });
  }

  const meta = (k: string): unknown => (order.meta_data as Meta[] | undefined)?.find(m => m.key === k)?.value;
  const billing = (order.billing ?? {}) as Record<string, string>;
  const [vehiculo, ...extras] = order.line_items as LineItem[];
  const referencia = String(order.id);

  // Solo columnas de datos del pedido: estado_gestion, cliente_id y reserva_id
  // no se envían, así que una actualización desde la web nunca pisa lo que ya
  // decidió el equipo.
  const fila = {
    id: `web-${referencia}`,
    origen: 'web',
    referencia_externa: referencia,
    estado_externo: String(order.status ?? ''),
    cliente_nombre: billing.first_name ?? '',
    cliente_apellidos: billing.last_name ?? '',
    cliente_email: billing.email ?? '',
    cliente_telefono: billing.phone ?? '',
    cliente_direccion: billing.address_1 || null,
    cliente_ciudad: billing.city || null,
    cliente_pais: billing.country || null,
    carnet_categoria: (meta('_billing_driver_license') as string) || null,
    fecha_recogida: parseFecha(meta('order_pickup_date')),
    fecha_devolucion: parseFecha(meta('order_drop_date')),
    lugar_recogida: (meta('order_pickup_location') as string) || null,
    lugar_devolucion: (meta('order_drop_location') as string) || null,
    vehiculo_nombre: vehiculo?.name ?? '',
    vehiculo_web_id: vehiculo?.product_id != null ? String(vehiculo.product_id) : null,
    vehiculo_total: Number(vehiculo?.total ?? 0),
    extras: extras.map(i => ({ nombre: i.name ?? '', cantidad: i.quantity ?? 1, total: Number(i.total ?? 0) })),
    descuento: Number(order.discount_total ?? 0),
    total: Number(order.total ?? 0),
    metodo_pago: (order.payment_method_title as string) || null,
    pagado: Boolean(order.date_paid),
    fecha_pedido: order.date_created_gmt ? `${order.date_created_gmt}Z` : null,
    payload: sanear(order),
    actualizado_en: new Date().toISOString(),
  };

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await admin.from('solicitudes_reserva').upsert(fila, { onConflict: 'origen,referencia_externa' });
  if (error) {
    console.error('Error guardando solicitud', referencia, error.message);
    // 500 para que WooCommerce reintente el aviso más tarde.
    return json({ error: 'No se pudo guardar' }, 500);
  }
  return json({ ok: true, id: fila.id });
});
