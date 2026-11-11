-- ============================================================================
-- 039. CHECK LIST DEL CAMBIO DE ACEITE (filtros de aire, aceite, diésel y habitáculo)
--
--  · `ordenes_trabajo.es_cambio_aceite`: interruptor que pone el taller en la orden. Solo si está activo
--    aparece el check list (al mecánico y en la ficha de la orden).
--  · `ot_filtros`: un registro por filtro marcado (aire / aceite / diesel / habitaculo) con `cambiado`
--    true («Cambiado») o false («No se cambió»). Sin registro = sin revisar. Va en su propia tabla, como
--    `ot_tareas`: el formulario del taller guarda la orden entera y habría pisado lo que marca el mecánico.
--  · `taller_ordenes` devuelve `cambioAceite` y `filtros` de cada orden.
--  · `taller_ot_filtro` (mecánico) marca o quita un filtro y lo anota en el historial de la orden.
--    El personal escribe en `ot_filtros` directamente (mismo permiso que el resto del trabajo diario).
-- ============================================================================
alter table public.ordenes_trabajo
  add column if not exists es_cambio_aceite boolean not null default false;

create table if not exists public.ot_filtros (
  ot_id       text not null references public.ordenes_trabajo(id) on delete cascade,
  filtro      text not null check (filtro in ('aire', 'aceite', 'diesel', 'habitaculo')),
  cambiado    boolean not null,
  marcado_por text not null,
  marcado_en  timestamptz not null default now(),
  primary key (ot_id, filtro)
);

alter table public.ot_filtros enable row level security;
drop policy if exists activos_all on public.ot_filtros;
create policy activos_all on public.ot_filtros
  for all to authenticated
  using ((select public.es_usuario_activo()))
  with check ((select public.es_usuario_activo()));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ot_filtros') then
    alter publication supabase_realtime add table public.ot_filtros;
  end if;
end $$;

create or replace function public.taller_ordenes(p_tecnico text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(o order by o.ingreso asc, o.numero asc), '[]'::jsonb)
  from (
    select
      ot.id, ot.numero, ot.estado,
      ot.fecha_recepcion as recepcion,
      coalesce(
        (select min(e->>'fecha') from jsonb_array_elements(coalesce(ot.historial, '[]'::jsonb)) e
          where e->>'descripcion' ilike '%recibido en taller%'),
        ot.fecha_recepcion
      ) as ingreso,
      ot.fecha_estimada_entrega as "fechaEstimadaEntrega",
      ot.kilometraje_entrada as kilometraje,
      ot.descripcion_problema as problema,
      ot.diagnostico, ot.notas,
      ot.fecha_actualizacion as actualizada,
      jsonb_build_object('matricula', v.matricula, 'marca', v.marca, 'modelo', v.modelo, 'anio', v.anio, 'color', v.color) as vehiculo,
      (select coalesce(jsonb_agg(jsonb_build_object(
          'id', l->>'id', 'descripcion', l->>'descripcion', 'hecha', t.linea_id is not null,
          'hechaPor', t.hecha_por, 'hechaEn', t.hecha_en, 'duracionMin', t.duracion_min) order by ord), '[]'::jsonb)
         from jsonb_array_elements(ot.lineas) with ordinality as x(l, ord)
         left join public.ot_tareas t on t.ot_id = ot.id and t.linea_id = l->>'id'
        where l->>'tipo' = 'mano_de_obra') as tareas,
      (select coalesce(jsonb_agg(jsonb_build_object('descripcion', l->>'descripcion', 'cantidad', l->'cantidad') order by ord), '[]'::jsonb)
         from jsonb_array_elements(ot.lineas) with ordinality as x(l, ord)
        where l->>'tipo' = 'producto') as piezas,
      ot.es_cambio_aceite as "cambioAceite",
      coalesce((select jsonb_object_agg(f.filtro, f.cambiado) from public.ot_filtros f where f.ot_id = ot.id), '{}'::jsonb) as filtros
    from public.ordenes_trabajo ot
    left join public.vehiculos v on v.id = ot.vehiculo_id
    where ot.estado in ('recibido', 'en_reparacion', 'listo')
      and lower(btrim(ot.tecnico_asignado)) = lower(btrim(p_tecnico))
  ) o;
$function$;

-- p_cambiado = true («Cambiado») / false («No se cambió») / null (quitar la marca).
create or replace function public.taller_ot_filtro(p_ot text, p_tecnico text, p_filtro text, p_cambiado boolean)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  ahora text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_ot public.ordenes_trabajo%rowtype;
  v_nombre text;
  v_antes boolean;
  v_hay boolean;
  v_texto text;
begin
  v_nombre := case p_filtro when 'aire' then 'filtro de aire' when 'aceite' then 'filtro de aceite'
                            when 'diesel' then 'filtro de diésel' when 'habitaculo' then 'filtro de habitáculo' end;
  if v_nombre is null then return false; end if;

  select * into v_ot from public.ordenes_trabajo
   where id = p_ot and estado in ('recibido', 'en_reparacion', 'listo') and es_cambio_aceite
     and lower(btrim(tecnico_asignado)) = lower(btrim(p_tecnico))
   for update;
  if not found then return false; end if;

  select true, cambiado into v_hay, v_antes from public.ot_filtros where ot_id = p_ot and filtro = p_filtro;
  v_hay := coalesce(v_hay, false);

  -- Sin cambios reales no se anota nada.
  if (p_cambiado is null and not v_hay) or (p_cambiado is not null and v_hay and v_antes = p_cambiado) then return true; end if;

  if p_cambiado is null then
    delete from public.ot_filtros where ot_id = p_ot and filtro = p_filtro;
    v_texto := p_tecnico || ' quitó la marca del ' || v_nombre;
  else
    insert into public.ot_filtros (ot_id, filtro, cambiado, marcado_por) values (p_ot, p_filtro, p_cambiado, p_tecnico)
      on conflict (ot_id, filtro) do update set cambiado = excluded.cambiado, marcado_por = excluded.marcado_por, marcado_en = now();
    v_texto := p_tecnico || ' marcó el ' || v_nombre || ': ' || case when p_cambiado then 'cambiado' else 'no se cambió' end;
  end if;

  update public.ordenes_trabajo set
    historial = coalesce(historial, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('fecha', ahora, 'descripcion', v_texto)),
    fecha_actualizacion = ahora
   where id = p_ot;
  return true;
end;
$function$;

revoke execute on function public.taller_ot_filtro(text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.taller_ot_filtro(text, text, text, boolean) to service_role;
