-- ============================================================================
-- 036. MARCAR LA PRIMERA TAREA INICIA LA REPARACIÓN
--
-- Si el mecánico marcaba tareas con la orden en «Recibido» sin pulsar «Empezar», la orden se quedaba
-- en «Recibido» con trabajo ya hecho (el tablero decía «sin empezar» y «2 de 4 tareas» a la vez).
-- Ahora, al MARCAR una tarea de una orden en «Recibido», la orden pasa a «En reparación» y el historial
-- lo anota. Desmarcar no cambia el estado, y en «Listo» tampoco (para eso está «Reabrir»).
-- ============================================================================
create or replace function public.taller_ot_tarea(p_ot text, p_tecnico text, p_linea text, p_hecha boolean)
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

  v_eventos := jsonb_build_array(jsonb_build_object(
    'fecha', ahora,
    'descripcion', p_tecnico || case when p_hecha then ' marcó como hecha: ' else ' desmarcó: ' end || left(v_desc, 120)));
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
