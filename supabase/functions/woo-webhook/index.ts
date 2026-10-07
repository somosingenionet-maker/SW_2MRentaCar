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
// Solo un pedido que sea una reserva real da de alta al cliente en el CRM.
const ESTADOS_CLIENTE = new Set(['on-hold', 'processing', 'completed']);

const PAISES: Record<string, string> = {
  ES: 'España', LT: 'Lituania', GB: 'Reino Unido', DE: 'Alemania', RO: 'Rumanía', HR: 'Croacia', EE: 'Estonia',
  PT: 'Portugal', PL: 'Polonia', BE: 'Bélgica', DK: 'Dinamarca', FR: 'Francia', AU: 'Australia', IT: 'Italia',
  CY: 'Chipre', PR: 'Puerto Rico', NL: 'Países Bajos', EG: 'Egipto', US: 'Estados Unidos', CZ: 'Chequia', AT: 'Austria',
  IE: 'Irlanda', SE: 'Suecia', NO: 'Noruega', FI: 'Finlandia', CH: 'Suiza', LU: 'Luxemburgo', GR: 'Grecia', HU: 'Hungría',
  BG: 'Bulgaria', SK: 'Eslovaquia', SI: 'Eslovenia', LV: 'Letonia', MA: 'Marruecos', UA: 'Ucrania', CA: 'Canadá', MX: 'México',
  AR: 'Argentina', CO: 'Colombia', BR: 'Brasil', VE: 'Venezuela', RU: 'Rusia', TR: 'Turquía', CN: 'China', JP: 'Japón',
};

const sinEspacios = (t: unknown): string => (typeof t === 'string' ? t.replace(/\s+/g, ' ').trim() : '');
// "kayo OZUNO" → "Kayo Ozuno"; si ya viene con mayúsculas y minúsculas mezcladas, se respeta.
const nombrePropio = (t: unknown): string => {
  const x = sinEspacios(t);
  return x && (x === x.toLowerCase() || x === x.toUpperCase())
    ? x.toLowerCase().replace(/(^|[\s'-])(\S)/g, (_m, a: string, b: string) => a + b.toUpperCase())
    : x;
};

async function sha1Hex(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', encoder.encode(texto));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// El cliente de Supabase sin esquema tipado (las tablas se consultan por nombre).
// deno-lint-ignore no-explicit-any
type Supa = any;

/**
 * Da de alta (o localiza) al cliente del pedido en el CRM y devuelve su id.
 * - Se busca por correo; si no existe, se crea con un id estable derivado del
 *   correo (o del teléfono), así dos avisos simultáneos del mismo pedido no
 *   duplican al cliente.
 * - A un cliente que ya existe solo se le rellena el documento si lo tiene
 *   vacío: lo que haya editado el equipo nunca se pisa.
 * - No se crean clientes con el correo o el teléfono de la propia empresa
 *   (reservas de prueba o internas).
 */
async function asegurarCliente(
  admin: Supa, billing: Record<string, string>, documento: string | null, fechaPedido: string | null,
): Promise<string | null> {
  const email = sinEspacios(billing.email).toLowerCase();
  const tel = sinEspacios(billing.phone);
  const telDig = tel.replace(/\D/g, '');
  const clave = email ? `e:${email}` : telDig.length >= 7 ? `p:${telDig}` : null;
  if (!clave) return null;

  const { data: emp } = await admin.from('empresa_config').select('correo, telefono').eq('id', 1).maybeSingle();
  const empDig = String(emp?.telefono ?? '').replace(/\D/g, '');
  if ((email && email === String(emp?.correo ?? '').toLowerCase()) ||
      (telDig.length >= 9 && empDig.length >= 9 && telDig.slice(-9) === empDig.slice(-9))) return null;

  const id = 'cli-web-' + (await sha1Hex(clave)).slice(0, 10);
  let existente: { id: string; nif_nie_pasaporte: string | null } | null = null;
  if (email) {
    // _ y % son comodines de ilike: se escapan para comparar el correo tal cual.
    const { data } = await admin.from('clientes').select('id, nif_nie_pasaporte')
      .ilike('correo', email.replace(/[\\_%]/g, m => '\\' + m)).limit(1);
    existente = data?.[0] ?? null;
  }
  if (!existente) {
    const { data } = await admin.from('clientes').select('id, nif_nie_pasaporte').eq('id', id).maybeSingle();
    existente = data;
  }
  if (existente) {
    if (documento && !existente.nif_nie_pasaporte) {
      await admin.from('clientes').update({ nif_nie_pasaporte: documento }).eq('id', existente.id).eq('nif_nie_pasaporte', '');
    }
    return existente.id;
  }

  // La web rellena "España" por defecto: con un teléfono internacional (+49, 0044...) el país no es fiable.
  const codigo = sinEspacios(billing.country).toUpperCase();
  const telInternacional = /^(\+|00)/.test(tel) && !/^(\+|00)34/.test(tel);
  const pais = !codigo ? null : codigo === 'ES' && telInternacional ? null : (PAISES[codigo] ?? codigo);

  const { error } = await admin.from('clientes').upsert({
    id,
    nombre: nombrePropio(billing.first_name),
    apellidos: nombrePropio(billing.last_name),
    nif_nie_pasaporte: documento ?? '',
    correo: email,
    telefono: tel,
    direccion: nombrePropio(billing.address_1),
    ciudad: nombrePropio(billing.city) || null,
    pais,
    es_cliente_alquiler: true,
    interacciones: [],
    fecha_registro: (fechaPedido ?? new Date().toISOString()).slice(0, 10),
    vehiculos_asociados: [],
  }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
  return id;
}

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
  const referencia = String(order.id);

  // NIF/NIE/pasaporte: lo pide el campo `billing_nif` del pago (se guarda como
  // `_billing_nif`). Se aceptan alias por si el campo se llama distinto.
  const documentoMeta = ['_billing_nif', 'billing_nif', '_billing_dni', '_billing_documento']
    .map(k => meta(k)).find(v => typeof v === 'string' && v.trim() !== '') as string | undefined;
  const documento = documentoMeta ? documentoMeta.trim().toUpperCase().replace(/[\s.-]+/g, '') : null;

  // El vehículo NO siempre es el primer artículo del pedido. Se distingue con el
  // catálogo `web_productos`; si el producto no está, se considera vehículo solo
  // si su nombre lleva "o similar" (convención de la web).
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: catalogo } = await admin.from('web_productos').select('id,tipo');
  const tipoDe = new Map((catalogo ?? []).map((p: { id: string; tipo: string }) => [p.id, p.tipo]));
  const esVehiculo = (i: LineItem): boolean => {
    const tipo = i.product_id != null ? tipoDe.get(String(i.product_id)) : undefined;
    return tipo ? tipo === 'vehiculo' : /o similar/i.test(i.name ?? '');
  };
  const items = order.line_items as LineItem[];
  const vehiculo = items.find(esVehiculo);
  const extras = items.filter(i => i !== vehiculo);

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
    cliente_documento: documento,
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

  // El cliente se da de alta ANTES de guardar la solicitud: así, cuando la app
  // se entera de la solicitud nueva (tiempo real), el cliente ya existe. Si
  // falla, el pedido se guarda igualmente (el cliente se puede crear al asignar).
  let clienteId: string | null = null;
  if (ESTADOS_CLIENTE.has(String(order.status))) {
    try {
      clienteId = await asegurarCliente(admin, billing, documento, fila.fecha_pedido);
    } catch (e) {
      console.error('No se pudo dar de alta al cliente', referencia, e instanceof Error ? e.message : e);
    }
  }

  const { error } = await admin.from('solicitudes_reserva').upsert(fila, { onConflict: 'origen,referencia_externa' });
  if (error) {
    console.error('Error guardando solicitud', referencia, error.message);
    // 500 para que WooCommerce reintente el aviso más tarde.
    return json({ error: 'No se pudo guardar' }, 500);
  }
  // Vincula la solicitud con su cliente solo si aún no tenía uno (no pisa decisiones del equipo).
  if (clienteId) {
    await admin.from('solicitudes_reserva').update({ cliente_id: clienteId }).eq('id', fila.id).is('cliente_id', null);
  }
  return json({ ok: true, id: fila.id, cliente: clienteId });
});
