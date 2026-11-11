-- ============================================================================
-- 037. DURACIÓN DE CADA TAREA (lo que el mecánico tardó de verdad)
--
-- Al marcar una tarea como hecha, el mecánico indica cuánto tiempo le llevó (15 min, 30 min, 1 h…)
-- para que el taller vea el tiempo real y lo compare con las horas que cobra. Se guarda en minutos en
-- `ot_tareas.duracion_min` (vacío en las tareas anteriores a este cambio o si el mecánico no lo indicó).
--  · taller_ordenes devuelve `duracionMin` en cada tarea.
--  · taller_ot_tarea recibe `p_duracion` (opcional, para que una página abierta con la versión anterior siga
--    funcionando). Si la tarea ya estaba hecha y llega una duración, la corrige y lo anota en el historial.
-- ============================================================================
alter table public.ot_tareas
  add column if not exists duracion_min integer
  check (duracion_min is null or (duracion_min between 5 and 1440));

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
        where l->>'tipo' = 'producto') as piezas
    from public.ordenes_trabajo ot
    left join public.vehiculos v on v.id = ot.vehiculo_id
    where ot.estado in ('recibido', 'en_reparacion', 'listo')
      and lower(btrim(ot.tecnico_asignado)) = lower(btrim(p_tecnico))
  ) o;
$function$;

-- Se sustituye la firma de 4 parámetros por la de 5 (con el último opcional) para que no haya dos versiones ambiguas.
drop function if exists public.taller_ot_tarea(text, text, text, boolean);

create or replace function public.taller_ot_tarea(p_ot text, p_tecnico text, p_linea text, p_hecha boolean, p_duracion integer default null)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  ahora text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_desc text;
  v_ot public.ordenes_trabajo%rowtype;
  v_eventos jsonb;
  v_ya boolean;
  v_dur_anterior integer;
  v_texto_dur text;
begin
  if p_duracion is not null and (p_duracion < 5 or p_duracion > 1440) then return false; end if;

  select * into v_ot from public.ordenes_trabajo
   where id = p_ot and estado in ('recibido', 'en_reparacion', 'listo')
     and lower(btrim(tecnico_asignado)) = lower(btrim(p_tecnico))
   for update;
  if not found then return false; end if;

  select l->>'descripcion' into v_desc
    from jsonb_array_elements(v_ot.lineas) l
   where l->>'id' = p_linea and l->>'tipo' = 'mano_de_obra' limit 1;
  if v_desc is null then return false; end if;

  select true, duracion_min into v_ya, v_dur_anterior
    from public.ot_tareas where ot_id = p_ot and linea_id = p_linea;
  v_ya := coalesce(v_ya, false);

  -- «1 h 15 min», «45 min», «2 h»
  v_texto_dur := case when p_duracion is null then null
    else case when p_duracion >= 60 then (p_duracion / 60) || ' h' || case when p_duracion % 60 > 0 then ' ' || (p_duracion % 60) || ' min' else '' end
              else p_duracion || ' min' end end;

  if p_hecha then
    if v_ya then
      -- Ya estaba hecha: solo se admite corregir la duración; si no cambia, no hay nada que anotar.
      if p_duracion is null or p_duracion is not distinct from v_dur_anterior then return true; end if;
      update public.ot_tareas set duracion_min = p_duracion where ot_id = p_ot and linea_id = p_linea;
      update public.ordenes_trabajo set
        historial = coalesce(historial, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'fecha', ahora, 'descripcion', p_tecnico || ' indicó que "' || left(v_desc, 120) || '" le llevó ' || v_texto_dur)),
        fecha_actualizacion = ahora
       where id = p_ot;
      return true;
    end if;
    insert into public.ot_tareas (ot_id, linea_id, hecha_por, duracion_min) values (p_ot, p_linea, p_tecnico, p_duracion)
      on conflict (ot_id, linea_id) do nothing;
  else
    delete from public.ot_tareas where ot_id = p_ot and linea_id = p_linea;
  end if;

  v_eventos := jsonb_build_array(jsonb_build_object(
    'fecha', ahora,
    'descripcion', p_tecnico || case when p_hecha then ' marcó como hecha: ' else ' desmarcó: ' end || left(v_desc, 120)
                   || case when p_hecha and v_texto_dur is not null then ' (' || v_texto_dur || ')' else '' end));
  -- Primera tarea marcada con la orden aún en «Recibido»: empieza la reparación.
  if p_hecha and v_ot.estado = 'recibido' then
    v_eventos := v_eventos || jsonb_build_array(jsonb_build_object(
      'fecha', ahora, 'descripcion', 'Reparación iniciada por ' || p_tecnico || ' al marcar la primera tarea'));
  end if;

  update public.ordenes_trabajo set
    historial = coalesce(historial, '[]'::jsonb) || v_eventos,
    estado = case when p_hecha and v_ot.estado = 'recibido' then 'en_reparacion' else estado end,
    fecha_actualizacion = ahora
   where id = p_ot;
  return true;
end;
$function$;

revoke execute on function public.taller_ot_tarea(text, text, text, boolean, integer) from public, anon, authenticated;
grant execute on function public.taller_ot_tarea(text, text, text, boolean, integer) to service_role;
