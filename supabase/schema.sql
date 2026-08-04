-- ============================================================================
-- SW_2M · Esquema de base de datos (Supabase / PostgreSQL)
-- App exclusiva de 2M Rent a Car — un solo cliente (sin multi-tenant).
--
-- Convención: columnas escalares en snake_case; las sub-listas/objetos
-- anidados (líneas, historial, interacciones, tarifas, módulos) van en
-- columnas JSONB conservando sus claves camelCase tal cual las usa la app.
-- La capa de datos hace una conversión superficial snake<->camel.
--
-- Ejecutar en: Supabase → SQL Editor → New query → pegar todo → Run.
-- Es idempotente (se puede volver a ejecutar sin romper nada).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABLAS DE NEGOCIO
-- ---------------------------------------------------------------------------

create table if not exists public.empresa_config (
  id                integer primary key default 1 check (id = 1),
  nombre            text not null default '',
  tagline           text not null default '',
  razon_social      text not null default '',
  nif               text not null default '',
  direccion_fiscal  text not null default '',
  correo            text not null default '',
  telefono          text not null default '',
  web               text not null default '',
  ciudad            text not null default '',
  pais              text not null default '',
  brand_color       text not null default '#C38DD6',
  logo_base64       text not null default ''
);

create table if not exists public.vehiculos (
  id                    text primary key,
  marca                 text not null,
  modelo                text not null,
  anio                  integer,
  color                 text,
  combustible           text,
  matricula             text not null,
  bastidor              text,
  kilometraje           integer not null default 0,
  itv_vencimiento       text,
  seguro_vencimiento    text,
  impuesto_vencimiento  text,
  fecha_registro        text,
  es_flota_alquiler     boolean not null default false,
  tarifas_alquiler      jsonb
);

create table if not exists public.clientes (
  id                   text primary key,
  nombre               text not null,
  apellidos            text not null,
  nif_nie_pasaporte    text not null default '',
  correo               text not null default '',
  telefono             text not null default '',
  direccion            text not null default '',
  ciudad               text,
  pais                 text,
  es_cliente_alquiler  boolean not null default false,
  interacciones        jsonb not null default '[]'::jsonb,
  fecha_registro       text,
  vehiculos_asociados  jsonb not null default '[]'::jsonb
);

create table if not exists public.intervenciones (
  id                          text primary key,
  vehiculo_id                 text not null,
  tipo                        text not null,
  descripcion                 text not null default '',
  items                       jsonb,
  taller_realizador           text,
  costo                       numeric,
  kilometraje_en_intervencion integer not null default 0,
  fecha_intervencion          text,
  notas                       text
);

create table if not exists public.ordenes_trabajo (
  id                     text primary key,
  numero                 text not null,
  vehiculo_id            text not null,
  cliente_id             text not null,
  estado                 text not null,
  fecha_recepcion        text,
  fecha_estimada_entrega text,
  fecha_entrega          text,
  kilometraje_entrada    integer not null default 0,
  kilometraje_salida     integer,
  descripcion_problema   text not null default '',
  diagnostico            text,
  tecnico_asignado       text,
  lineas                 jsonb not null default '[]'::jsonb,
  subtotal               numeric not null default 0,
  iva_pct                numeric not null default 21,
  total_iva              numeric not null default 0,
  total                  numeric not null default 0,
  notas                  text,
  presupuesto_estado     text,
  presupuesto_aprobado   boolean,
  notificacion_enviada   boolean,
  fecha_actualizacion    text,
  historial              jsonb not null default '[]'::jsonb,
  albaran_id             text,
  factura_id             text
);

create table if not exists public.reservas (
  id                          text primary key,
  vehiculo_id                 text not null,
  cliente_id                  text not null,
  fecha_inicio                text not null,
  fecha_fin                   text not null,
  temporada                   text not null,
  tarifa_diaria               numeric not null default 0,
  total_cobrado               numeric not null default 0,
  estado                      text not null default 'confirmada',
  incluye_seguro_todo_riesgo  boolean not null default false
);

create table if not exists public.alertas (
  id                 text primary key,
  vehiculo_id        text not null,
  tipo               text not null,
  descripcion        text not null default '',
  estado             text not null,
  fecha_limite       text,
  kilometraje_limite integer
);

create table if not exists public.notificaciones (
  id           text primary key,
  cliente_id   text not null,
  vehiculo_id  text,
  tipo_envio   text not null,
  asunto       text,
  mensaje      text not null default '',
  fecha_envio  text,
  leido        boolean not null default false,
  tipo_evento  text
);

create table if not exists public.tecnicos (
  id            text primary key,
  nombre        text not null,
  especialidad  text,
  activo        boolean not null default true
);

create table if not exists public.facturas (
  id                text primary key,
  numero            text not null,
  albaran_id        text,
  cliente_id        text not null,
  vehiculo_id       text,
  intervencion_ids  jsonb not null default '[]'::jsonb,
  fecha             text,
  fecha_vencimiento text,
  estado            text not null default 'borrador',
  lineas            jsonb not null default '[]'::jsonb,
  notas             text not null default '',
  subtotal          numeric not null default 0,
  iva_pct           numeric not null default 21,
  total_iva         numeric not null default 0,
  total             numeric not null default 0
);

-- ---------------------------------------------------------------------------
-- 2. USUARIOS (perfil ligado a Supabase Auth) + roles
-- ---------------------------------------------------------------------------

create table if not exists public.usuarios (
  id             uuid primary key references auth.users(id) on delete cascade,
  nombre         text not null default '',
  email          text not null default '',
  rol            text not null default 'usuario' check (rol in ('super_admin','admin','usuario')),
  modulos        jsonb not null default '["vehiculos","clientes","taller","alertas","rentabilidad","facturas","alquileres"]'::jsonb,
  activo         boolean not null default true,
  fecha_creacion text not null default to_char(now(),'YYYY-MM-DD')
);

-- Rol del usuario actual (SECURITY DEFINER para evitar recursión en las RLS).
create or replace function public.current_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.usuarios where id = auth.uid();
$$;

-- Al crear un usuario en Auth, se crea su perfil con rol 'usuario' por defecto.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nombre, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3. SEGURIDAD (Row Level Security)
-- ---------------------------------------------------------------------------

-- Tablas de negocio: cualquier usuario autenticado puede operar.
-- (El control por módulos se aplica en la interfaz; a nivel de BD basta con
--  exigir sesión válida para un backoffice interno de un solo cliente.)
do $$
declare t text;
begin
  foreach t in array array[
    'vehiculos','clientes','intervenciones','ordenes_trabajo','reservas',
    'alertas','notificaciones','tecnicos','facturas'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists auth_all on public.%I;', t);
    execute format(
      'create policy auth_all on public.%I for all to authenticated using (true) with check (true);', t
    );
  end loop;
end $$;

-- empresa_config: todos los autenticados leen; solo admin/super_admin escriben.
alter table public.empresa_config enable row level security;
drop policy if exists empresa_read on public.empresa_config;
create policy empresa_read on public.empresa_config
  for select to authenticated using (true);
drop policy if exists empresa_write on public.empresa_config;
create policy empresa_write on public.empresa_config
  for all to authenticated
  using (public.current_rol() in ('admin','super_admin'))
  with check (public.current_rol() in ('admin','super_admin'));

-- usuarios: todos los autenticados pueden leer perfiles (para mostrar nombres).
--           solo admin/super_admin crean/editan/borran, y un admin normal
--           NO puede tocar a un super_admin (solo otro super_admin puede).
alter table public.usuarios enable row level security;

drop policy if exists usuarios_read on public.usuarios;
create policy usuarios_read on public.usuarios
  for select to authenticated using (true);

drop policy if exists usuarios_insert on public.usuarios;
create policy usuarios_insert on public.usuarios
  for insert to authenticated
  with check (public.current_rol() in ('admin','super_admin'));

drop policy if exists usuarios_update on public.usuarios;
create policy usuarios_update on public.usuarios
  for update to authenticated
  using (public.current_rol() = 'super_admin' or (public.current_rol() = 'admin' and rol <> 'super_admin'))
  with check (public.current_rol() = 'super_admin' or (public.current_rol() = 'admin' and rol <> 'super_admin'));

drop policy if exists usuarios_delete on public.usuarios;
create policy usuarios_delete on public.usuarios
  for delete to authenticated
  using (public.current_rol() = 'super_admin' or (public.current_rol() = 'admin' and rol <> 'super_admin'));

-- ---------------------------------------------------------------------------
-- 4. DATOS INICIALES (solo la ficha de empresa de 2M; el resto arranca vacío)
-- ---------------------------------------------------------------------------

insert into public.empresa_config (id, nombre, tagline, razon_social, nif, direccion_fiscal, correo, telefono, web, ciudad, pais, brand_color)
values (
  1,
  '2M Rent a Car',
  'Alquiler de vehículos y taller mecánico',
  'Two M Rent a Car SL',
  'B13712658',
  'Camí de Son Gotleu, 8 bajos',
  'info@2mrentacar.es',
  '(+34) 633 47 48 87',
  'www.2mrentacar.es',
  'Palma (Illes Balears)',
  'España',
  '#C38DD6'
)
on conflict (id) do nothing;
