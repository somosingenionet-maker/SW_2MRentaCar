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

-- Tablas de negocio (trabajo diario del personal de oficina): cualquier
-- usuario autenticado puede leer y escribir por igual (crear/editar
-- vehículos, clientes, órdenes de trabajo, reservas, alertas,
-- notificaciones, técnicos). El rol 'usuario' es el que hace este trabajo
-- día a día; 'admin'/'super_admin' es el dueño/gerencia.
-- (El control por módulos sigue aplicándose en la interfaz para decidir qué
--  pestañas ve cada usuario.)
do $$
declare t text;
begin
  foreach t in array array[
    'vehiculos','clientes','intervenciones','ordenes_trabajo','reservas',
    'alertas','notificaciones','tecnicos'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists auth_all on public.%I;', t);
    execute format('drop policy if exists %I_read on public.%I;', t, t);
    execute format('drop policy if exists %I_write on public.%I;', t, t);
    execute format(
      'create policy auth_all on public.%I for all to authenticated using (true) with check (true);', t
    );
  end loop;
end $$;

-- facturas: cualquier autenticado puede leer y crear facturas nuevas, pero
-- una factura ya creada solo puede editarse o eliminarse por admin/super_admin
-- (protege el registro contable una vez emitido).
alter table public.facturas enable row level security;
drop policy if exists auth_all on public.facturas;
drop policy if exists facturas_read on public.facturas;
drop policy if exists facturas_write on public.facturas;
drop policy if exists facturas_insert on public.facturas;
drop policy if exists facturas_update on public.facturas;
drop policy if exists facturas_delete on public.facturas;
create policy facturas_read on public.facturas
  for select to authenticated using (true);
create policy facturas_insert on public.facturas
  for insert to authenticated with check (true);
create policy facturas_update on public.facturas
  for update to authenticated
  using (public.current_rol() in ('admin','super_admin'))
  with check (public.current_rol() in ('admin','super_admin'));
create policy facturas_delete on public.facturas
  for delete to authenticated
  using (public.current_rol() in ('admin','super_admin'));

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

-- ============================================================================
-- 5. ALERTAS AUTOMÁTICAS (ITV, seguro, impuesto, mantenimiento)
--
-- Antes de esto, solo se creaba la alerta de ITV, y solo desde el código del
-- navegador al dar de alta un vehículo — el resto (seguro, impuesto,
-- mantenimiento) nunca se creaba, y al "atender" una alerta se marcaba
-- atendida para siempre sin volver a abrirse en el siguiente vencimiento.
-- Se resuelve con triggers de base de datos: fuente única de verdad,
-- funciona sin depender del código del cliente.
-- ============================================================================

-- Permite insertar filas de alerta sin id explícito (los triggers no conocen
-- el generador de ids del cliente). El código del cliente sigue mandando su
-- propio id cuando crea una alerta a mano; aquí solo se usa como red de
-- seguridad para los inserts hechos por los triggers.
alter table public.alertas alter column id set default gen_random_uuid()::text;

-- Alta de vehículo: crea itv/seguro/impuesto (si el vehículo trae esa fecha)
-- y una alerta inicial de mantenimiento a kilometraje + 15000 (mismo
-- incremento que ya usa la app al renovar mantenimiento manualmente).
create or replace function public.crear_alertas_vehiculo()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.itv_vencimiento is not null and new.itv_vencimiento <> '' then
    insert into public.alertas (vehiculo_id, tipo, descripcion, estado, fecha_limite)
    values (new.id, 'itv',
      'Inspección Técnica obligatoria (ITV) programada para el vencimiento: ' || new.itv_vencimiento || '.',
      'activa', new.itv_vencimiento);
  end if;
  if new.seguro_vencimiento is not null and new.seguro_vencimiento <> '' then
    insert into public.alertas (vehiculo_id, tipo, descripcion, estado, fecha_limite)
    values (new.id, 'seguro',
      'Póliza de seguro con vencimiento el ' || new.seguro_vencimiento || '.',
      'activa', new.seguro_vencimiento);
  end if;
  if new.impuesto_vencimiento is not null and new.impuesto_vencimiento <> '' then
    insert into public.alertas (vehiculo_id, tipo, descripcion, estado, fecha_limite)
    values (new.id, 'impuesto',
      'Impuesto de circulación con vencimiento el ' || new.impuesto_vencimiento || '.',
      'activa', new.impuesto_vencimiento);
  end if;
  insert into public.alertas (vehiculo_id, tipo, descripcion, estado, kilometraje_limite)
  values (new.id, 'mantenimiento',
    'Revisión de mantenimiento preventivo recomendada a los ' || (new.kilometraje + 15000) || ' km.',
    'activa', new.kilometraje + 15000);
  return new;
end;
$$;
drop trigger if exists trg_vehiculos_crear_alertas on public.vehiculos;
create trigger trg_vehiculos_crear_alertas after insert on public.vehiculos
  for each row execute function public.crear_alertas_vehiculo();

-- Renovación: cuando cambia una fecha de vencimiento del vehículo (lo que ya
-- hace la app al "Atender Alerta" de itv/seguro/impuesto), reabre/actualiza
-- la misma fila de alerta en vez de dejarla huérfana en 'atendida'.
-- (El mantenimiento por kilometraje NO se gestiona aquí: se renueva de forma
-- explícita desde el código de la app, porque el kilometraje cambia por
-- muchos motivos que no deben disparar la alerta sin más.)
create or replace function public.sincronizar_alertas_vencimiento()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_alerta_id text;
begin
  if new.itv_vencimiento is distinct from old.itv_vencimiento and new.itv_vencimiento is not null and new.itv_vencimiento <> '' then
    select id into v_alerta_id from public.alertas
      where vehiculo_id = new.id and tipo = 'itv' order by id desc limit 1;
    if v_alerta_id is null then
      insert into public.alertas (vehiculo_id, tipo, descripcion, estado, fecha_limite)
      values (new.id, 'itv',
        'Inspección Técnica obligatoria (ITV) programada para el vencimiento: ' || new.itv_vencimiento || '.',
        'activa', new.itv_vencimiento);
    else
      update public.alertas set estado = 'activa', fecha_limite = new.itv_vencimiento,
        descripcion = 'Inspección Técnica obligatoria (ITV) programada para el vencimiento: ' || new.itv_vencimiento || '.'
        where id = v_alerta_id;
    end if;
  end if;

  if new.seguro_vencimiento is distinct from old.seguro_vencimiento and new.seguro_vencimiento is not null and new.seguro_vencimiento <> '' then
    select id into v_alerta_id from public.alertas
      where vehiculo_id = new.id and tipo = 'seguro' order by id desc limit 1;
    if v_alerta_id is null then
      insert into public.alertas (vehiculo_id, tipo, descripcion, estado, fecha_limite)
      values (new.id, 'seguro',
        'Póliza de seguro con vencimiento el ' || new.seguro_vencimiento || '.', 'activa', new.seguro_vencimiento);
    else
      update public.alertas set estado = 'activa', fecha_limite = new.seguro_vencimiento,
        descripcion = 'Póliza de seguro con vencimiento el ' || new.seguro_vencimiento || '.'
        where id = v_alerta_id;
    end if;
  end if;

  if new.impuesto_vencimiento is distinct from old.impuesto_vencimiento and new.impuesto_vencimiento is not null and new.impuesto_vencimiento <> '' then
    select id into v_alerta_id from public.alertas
      where vehiculo_id = new.id and tipo = 'impuesto' order by id desc limit 1;
    if v_alerta_id is null then
      insert into public.alertas (vehiculo_id, tipo, descripcion, estado, fecha_limite)
      values (new.id, 'impuesto',
        'Impuesto de circulación con vencimiento el ' || new.impuesto_vencimiento || '.', 'activa', new.impuesto_vencimiento);
    else
      update public.alertas set estado = 'activa', fecha_limite = new.impuesto_vencimiento,
        descripcion = 'Impuesto de circulación con vencimiento el ' || new.impuesto_vencimiento || '.'
        where id = v_alerta_id;
    end if;
  end if;

  return new;
end;
$$;
drop trigger if exists trg_vehiculos_sync_alertas on public.vehiculos;
create trigger trg_vehiculos_sync_alertas
  after update of itv_vencimiento, seguro_vencimiento, impuesto_vencimiento on public.vehiculos
  for each row execute function public.sincronizar_alertas_vencimiento();

-- ============================================================================
-- 6. INTEGRIDAD REFERENCIAL AL BORRAR VEHÍCULOS/CLIENTES
--
-- vehiculo_id/cliente_id eran simples columnas de texto sin restricción — al
-- borrar un vehículo o cliente, todo lo que lo referenciaba se quedaba
-- huérfano. Regla aplicada:
--   - alertas: se BORRAN en cascada (datos derivados, sin sentido sin el
--     vehículo).
--   - intervenciones/ordenes_trabajo/reservas/facturas/notificaciones: NUNCA
--     se borran (historial real, y en facturas, contable). Al borrar el
--     vehículo/cliente solo se desvincula la referencia (queda en null); la
--     interfaz ya muestra "—"/"Eliminado" cuando falta.
-- ============================================================================

alter table public.intervenciones alter column vehiculo_id drop not null;
alter table public.ordenes_trabajo alter column vehiculo_id drop not null;
alter table public.ordenes_trabajo alter column cliente_id drop not null;
alter table public.reservas alter column vehiculo_id drop not null;
alter table public.reservas alter column cliente_id drop not null;
alter table public.facturas alter column cliente_id drop not null;
alter table public.notificaciones alter column cliente_id drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'alertas_vehiculo_id_fkey') then
    alter table public.alertas
      add constraint alertas_vehiculo_id_fkey foreign key (vehiculo_id) references public.vehiculos(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'intervenciones_vehiculo_id_fkey') then
    alter table public.intervenciones
      add constraint intervenciones_vehiculo_id_fkey foreign key (vehiculo_id) references public.vehiculos(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ordenes_trabajo_vehiculo_id_fkey') then
    alter table public.ordenes_trabajo
      add constraint ordenes_trabajo_vehiculo_id_fkey foreign key (vehiculo_id) references public.vehiculos(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ordenes_trabajo_cliente_id_fkey') then
    alter table public.ordenes_trabajo
      add constraint ordenes_trabajo_cliente_id_fkey foreign key (cliente_id) references public.clientes(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reservas_vehiculo_id_fkey') then
    alter table public.reservas
      add constraint reservas_vehiculo_id_fkey foreign key (vehiculo_id) references public.vehiculos(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reservas_cliente_id_fkey') then
    alter table public.reservas
      add constraint reservas_cliente_id_fkey foreign key (cliente_id) references public.clientes(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'facturas_vehiculo_id_fkey') then
    alter table public.facturas
      add constraint facturas_vehiculo_id_fkey foreign key (vehiculo_id) references public.vehiculos(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'facturas_cliente_id_fkey') then
    alter table public.facturas
      add constraint facturas_cliente_id_fkey foreign key (cliente_id) references public.clientes(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'notificaciones_vehiculo_id_fkey') then
    alter table public.notificaciones
      add constraint notificaciones_vehiculo_id_fkey foreign key (vehiculo_id) references public.vehiculos(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'notificaciones_cliente_id_fkey') then
    alter table public.notificaciones
      add constraint notificaciones_cliente_id_fkey foreign key (cliente_id) references public.clientes(id) on delete set null;
  end if;
end $$;

-- ============================================================================
-- 7. AGENDA DE CITAS
-- (nota: la migración 004_unificar_pieza_material.sql fue solo de datos —
-- convierte líneas 'pieza'/'material' ya guardadas a 'producto' — no toca
-- la estructura, así que no aporta nada a este archivo de instalación
-- limpia; por eso no hay una sección numerada para ella aquí.)
--
-- Admite datos libres (contacto_nombre/contacto_telefono/vehiculo_descripcion)
-- para clientes o vehículos que aún no están registrados — se completan al
-- convertir la cita en Orden de Trabajo. Cliente/vehículo/técnico/OT se
-- desvinculan (no se borra la cita) si el registro enlazado se elimina.
-- ============================================================================
create table if not exists public.citas (
  id                    text primary key,
  fecha_hora            timestamptz not null,
  duracion_minutos      integer not null default 60,
  cliente_id            text references public.clientes(id) on delete set null,
  vehiculo_id           text references public.vehiculos(id) on delete set null,
  contacto_nombre       text,
  contacto_telefono     text,
  vehiculo_descripcion  text,
  motivo                text not null default '',
  tecnico_id            text references public.tecnicos(id) on delete set null,
  estado                text not null default 'pendiente' check (estado in ('pendiente','confirmada','cancelada','convertida')),
  notas                 text,
  ot_id                 text references public.ordenes_trabajo(id) on delete set null,
  constraint citas_cliente_o_contacto check (cliente_id is not null or contacto_nombre is not null)
);
create index if not exists citas_fecha_hora_idx on public.citas (fecha_hora);

alter table public.citas enable row level security;
drop policy if exists auth_all on public.citas;
drop policy if exists citas_read on public.citas;
drop policy if exists citas_write on public.citas;
create policy auth_all on public.citas for all to authenticated using (true) with check (true);
