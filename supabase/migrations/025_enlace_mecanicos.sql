-- ============================================================================
-- 27. ENLACE PARA MECÁNICOS Y TABLERO DEL TALLER
--
-- Cada mecánico recibe un enlace personal (/?taller=<token>) para ver SUS órdenes
-- en recibido / en reparación / listo, marcar tareas, empezar y terminar el
-- trabajo. La página pública habla solo con la función `taller-mecanico`, que
-- usa estas funciones; el mecánico nunca toca las tablas.
--
--  · El enlace es permanente y revocable. En la base solo queda el hash SHA-256
--    del token (`enlace_hash`), que el navegador del personal no descarga.
--  · Las tareas hechas van en su propia tabla (`ot_tareas`) y no dentro de las
--    líneas de la orden: el formulario del taller guarda las líneas enteras y
--    habría pisado las marcas del mecánico.
--  · Lo que ve el mecánico lo fija `taller_ordenes`: sin precios, sin datos
--    personales del cliente.
--  · Las órdenes se enlazan al técnico por NOMBRE (así lo guarda la orden), por
--    eso el nombre del técnico debe ser único.
--  · Tiempo real: ordenes_trabajo y ot_tareas se publican para que el tablero
--    del taller se actualice solo.
-- ============================================================================
alter table public.tecnicos
  add column if not exists enlace_hash text,
  add column if not exists enlace_creado_en timestamptz;

create unique index if not exists tecnicos_nombre_unico_idx on public.tecnicos (lower(btrim(nombre)));
create unique index if not exists tecnicos_enlace_hash_idx on public.tecnicos (enlace_hash) where enlace_hash is not null;

create table if not exists public.ot_tareas (
  ot_id     text not null references public.ordenes_trabajo(id) on delete cascade,
  linea_id  text not null,
  hecha_en  timestamptz not null default now(),
  hecha_por text not null,
  primary key (ot_id, linea_id)
);

alter table public.ot_tareas enable row level security;
drop policy if exists ot_tareas_read on public.ot_tareas;
create policy ot_tareas_read on public.ot_tareas
  for select to authenticated using ((select public.es_usuario_activo()));
-- Sin políticas de escritura: solo las funciones de abajo (service_role) las modifican.

-- Órdenes del mecánico, con solo lo que debe ver.
create or replace function public.taller_ordenes(p_tecnico text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(o order by o.recepcion desc, o.numero desc), '[]'::jsonb)
  from (
    select
      ot.id, ot.numero, ot.estado,
      ot.fecha_recepcion as recepcion,
      ot.fecha_estimada_entrega as "fechaEstimadaEntrega",
      ot.kilometraje_entrada as kilometraje,
      ot.descripcion_problema as problema,
      ot.diagnostico, ot.notas,
      ot.fecha_actualizacion as actualizada,
      jsonb_build_object('matricula', v.matricula, 'marca', v.marca, 'modelo', v.modelo, 'anio', v.anio, 'color', v.color) as vehiculo,
      (select coalesce(jsonb_agg(jsonb_build_object(
          'id', l->>'id', 'descripcion', l->>'descripcion', 'hecha', t.linea_id is not null,
          'hechaPor', t.hecha_por, 'hechaEn', t.hecha_en) order by ord), '[]'::jsonb)
         from jsonb_array_elements(ot.lineas) with ordinality as x(l, ord)
         left join public.ot_tareas t on t.ot_id = ot.id and t.linea_id = l->>'id'
        where l->>'tipo' = 'mano_de_obra') as tareas,
      (select coalesce(jsonb_agg(jsonb_build_object('descripcion', l->>'descripcion', 'cantidad', l->'cantidad') order by ord), '[]'::jsonb)
         from jsonb_array_elements(ot.lineas) with ordinality as x(l, ord)
        where l->>'tipo' = 'producto') as piezas
    from public.ordenes_trabajo ot
    left join public.vehiculos v on v.id = ot.vehiculo_id
    where ot.estado in ('recibido', 'en_reparacion', 'listo')
      and lower(btrim(ot.tecnico_asignado)) = lower(btrim(p_tecnico))
  ) o;
$$;

-- Marca o desmarca una tarea (línea de mano de obra) de una orden del mecánico y lo anota en el historial.
create or replace function public.taller_ot_tarea(p_ot text, p_tecnico text, p_linea text, p_hecha boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ahora text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_desc text;
  v_ot public.ordenes_trabajo%rowtype;
begin
  select * into v_ot from public.ordenes_trabajo
   where id = p_ot and estado in ('recibido', 'en_reparacion', 'listo')
     and lower(btrim(tecnico_asignado)) = lower(btrim(p_tecnico))
   for update;
  if not found then return false; end if;

  select l->>'descripcion' into v_desc
    from jsonb_array_elements(v_ot.lineas) l
   where l->>'id' = p_linea and l->>'tipo' = 'mano_de_obra' limit 1;
  if v_desc is null then return false; end if;

  if p_hecha then
    insert into public.ot_tareas (ot_id, linea_id, hecha_por) values (p_ot, p_linea, p_tecnico)
      on conflict (ot_id, linea_id) do nothing;
  else
    delete from public.ot_tareas where ot_id = p_ot and linea_id = p_linea;
  end if;

  update public.ordenes_trabajo set
    historial = coalesce(historial, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'fecha', ahora,
      'descripcion', p_tecnico || case when p_hecha then ' marcó como hecha: ' else ' desmarcó: ' end || left(v_desc, 120))),
    fecha_actualizacion = ahora
   where id = p_ot;
  return true;
end;
$$;

-- Anota un evento en el historial de una orden del mecánico y, si se pide, cambia su estado.
-- Solo actúa si la orden es suya y está en uno de los estados indicados.
create or replace function public.taller_ot_evento(p_ot text, p_tecnico text, p_descripcion text, p_estado_nuevo text, p_estados_validos text[])
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ahora text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  update public.ordenes_trabajo set
    historial = coalesce(historial, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('fecha', ahora, 'descripcion', left(p_descripcion, 600))),
    fecha_actualizacion = ahora,
    estado = coalesce(p_estado_nuevo, estado)
   where id = p_ot and estado = any(p_estados_validos)
     and lower(btrim(tecnico_asignado)) = lower(btrim(p_tecnico));
  return found;
end;
$$;

revoke execute on function public.taller_ordenes(text) from public, anon, authenticated;
revoke execute on function public.taller_ot_tarea(text, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.taller_ot_evento(text, text, text, text, text[]) from public, anon, authenticated;
grant execute on function public.taller_ordenes(text) to service_role;
grant execute on function public.taller_ot_tarea(text, text, text, boolean) to service_role;
grant execute on function public.taller_ot_evento(text, text, text, text, text[]) to service_role;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ordenes_trabajo') then
    alter publication supabase_realtime add table public.ordenes_trabajo;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ot_tareas') then
    alter publication supabase_realtime add table public.ot_tareas;
  end if;
end $$;
