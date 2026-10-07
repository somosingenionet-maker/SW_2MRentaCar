-- ============================================================================
-- 9. SOLICITUDES DE RESERVA (bandeja de entrada de reservas externas)
--
-- Cada pedido de alquiler que llega de la web (WooCommerce) se guarda aquí tal
-- cual, SIN crear todavía una Reserva: la web vende un modelo ("Fiat Doblo o
-- similar"), no un coche concreto, así que alguien del equipo asigna el
-- vehículo físico y entonces la solicitud pasa a ser una Reserva real.
--
-- · Idempotente: la clave (origen, referencia_externa) evita duplicados si el
--   aviso llega dos veces o el pedido cambia de estado en la web.
-- · Solo la Edge Function (service_role) inserta; el personal solo lee y
--   actualiza la parte de gestión (estado_gestion, reserva_id, cliente_id).
-- · Nunca se borra desde la app: es un registro histórico.
-- · `origen` / `referencia_externa` permiten sumar otros canales más adelante.
-- ============================================================================
create table if not exists public.solicitudes_reserva (
  id                  text primary key,
  origen              text not null default 'web',
  referencia_externa  text not null,
  estado_externo      text not null default '',
  estado_gestion      text not null default 'pendiente'
                      check (estado_gestion in ('pendiente','convertida','descartada')),

  cliente_nombre      text not null default '',
  cliente_apellidos   text not null default '',
  cliente_email       text not null default '',
  cliente_telefono    text not null default '',
  cliente_direccion   text,
  cliente_ciudad      text,
  cliente_pais        text,
  carnet_categoria    text,

  fecha_recogida      text,
  fecha_devolucion    text,
  lugar_recogida      text,
  lugar_devolucion    text,

  vehiculo_nombre     text not null default '',
  vehiculo_web_id     text,
  vehiculo_total      numeric not null default 0,
  extras              jsonb not null default '[]'::jsonb,
  descuento           numeric not null default 0,
  total               numeric not null default 0,
  metodo_pago         text,
  pagado              boolean not null default false,
  fecha_pedido        timestamptz,

  cliente_id          text references public.clientes(id) on delete set null,
  reserva_id          text references public.reservas(id) on delete set null,

  payload             jsonb,
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),

  unique (origen, referencia_externa)
);
create index if not exists solicitudes_reserva_gestion_idx on public.solicitudes_reserva (estado_gestion);

-- Trazabilidad en la reserva: de dónde viene.
alter table public.reservas add column if not exists origen text not null default 'manual';

-- RLS: el personal lee todo y actualiza (asignar/descartar); no inserta ni borra.
alter table public.solicitudes_reserva enable row level security;
drop policy if exists solicitudes_read on public.solicitudes_reserva;
drop policy if exists solicitudes_update on public.solicitudes_reserva;
create policy solicitudes_read on public.solicitudes_reserva
  for select to authenticated using (true);
create policy solicitudes_update on public.solicitudes_reserva
  for update to authenticated using (true) with check (true);

-- Tiempo real: la app se entera al instante cuando entra una solicitud nueva.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'solicitudes_reserva'
  ) then
    alter publication supabase_realtime add table public.solicitudes_reserva;
  end if;
end $$;
