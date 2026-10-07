-- ============================================================================
-- 11. AUTORREGISTRO DE CLIENTES + DOCUMENTO DE IDENTIDAD EN SOLICITUDES WEB
--
-- (a) invitaciones_cliente: enlace de un solo uso que el personal manda al
--     cliente para que rellene sus datos (NIF/NIE/pasaporte, contacto...). Lo
--     recibido NO toca la ficha del cliente: queda en `datos` hasta que el
--     personal lo revisa y lo aplica. Solo se guarda el HASH del token (el
--     token en claro solo existe en el enlace que ve el personal al crearlo).
--     La página pública no accede a la tabla: pasa por la Edge Function
--     `registro-cliente` (service_role). Sin políticas para `anon`.
-- (b) solicitudes_reserva.cliente_documento: el NIF/NIE/pasaporte que la web
--     empiece a pedir en el pago.
-- ============================================================================
create table if not exists public.invitaciones_cliente (
  id            text primary key,
  token_hash    text not null unique,
  cliente_id    text references public.clientes(id) on delete cascade,
  estado        text not null default 'pendiente'
                check (estado in ('pendiente','completada','aplicada','cancelada')),
  expira_en     timestamptz not null,
  datos         jsonb,
  idioma        text,
  completada_en timestamptz,
  creada_en     timestamptz not null default now()
);
create index if not exists invitaciones_cliente_estado_idx on public.invitaciones_cliente (estado);

alter table public.invitaciones_cliente enable row level security;
drop policy if exists auth_all on public.invitaciones_cliente;
create policy auth_all on public.invitaciones_cliente
  for all to authenticated using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'invitaciones_cliente'
  ) then
    alter publication supabase_realtime add table public.invitaciones_cliente;
  end if;
end $$;

alter table public.solicitudes_reserva add column if not exists cliente_documento text;
