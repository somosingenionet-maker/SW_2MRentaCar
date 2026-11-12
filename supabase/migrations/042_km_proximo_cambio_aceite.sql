-- ============================================================================
-- 042. KM DEL PRÓXIMO CAMBIO DE ACEITE
--
--  · `vehiculos.aceite_proximo_km`: el cambio también se recomienda a un kilometraje («o a los 100.000 km»).
--    Lo anota el mecánico al terminar, junto con la fecha del próximo cambio (opcional).
--  · `taller_ot_aceite_proximo` recibe `p_km` (opcional); debe ser posterior a los km del cambio actual.
--  · `taller_ordenes` devuelve `proximoKm`.
-- ============================================================================
alter table public.vehiculos
  add column if not exists aceite_proximo_km integer check (aceite_proximo_km is null or aceite_proximo_km >= 0);

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
      -- Próximo cambio ya anotado en esta visita (si la ficha tiene un cambio de esta orden o posterior); el de un ciclo anterior no se enseña.
      case when v.aceite_fecha is not null and v.aceite_fecha >= ot.fecha_recepcion then v.aceite_proxima_fecha end as "proximoCambio",
      case when v.aceite_fecha is not null and v.aceite_fecha >= ot.fecha_recepcion then v.aceite_proximo_km end as "proximoKm",
      coalesce((select jsonb_object_agg(f.filtro, f.cambiado) from public.ot_filtros f where f.ot_id = ot.id), '{}'::jsonb) as filtros
    from public.ordenes_trabajo ot
    left join public.vehiculos v on v.id = ot.vehiculo_id
    where ot.estado in ('recibido', 'en_reparacion', 'listo')
      and lower(btrim(ot.tecnico_asignado)) = lower(btrim(p_tecnico))
  ) o;
$function$;



-- Se sustituye la firma de 3 parámetros por la de 4 (con el último opcional) para que no haya dos versiones ambiguas.
drop function if exists public.taller_ot_aceite_proximo(text, text, text);

create or replace function public.taller_ot_aceite_proximo(p_ot text, p_tecnico text, p_fecha text, p_km integer default null)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  ahora text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  v_ot public.ordenes_trabajo%rowtype;
  v_fecha date;
  v_km integer;
begin
  if p_km is not null and (p_km < 0 or p_km > 2000000) then return false; end if;
  if p_fecha is null or p_fecha !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
  begin v_fecha := p_fecha::date; exception when others then return false; end;
  if to_char(v_fecha, 'YYYY-MM-DD') <> p_fecha or v_fecha < hoy or v_fecha > hoy + 3650 then return false; end if;

  select * into v_ot from public.ordenes_trabajo
   where id = p_ot and estado in ('recibido', 'en_reparacion', 'listo') and es_cambio_aceite
     and lower(btrim(tecnico_asignado)) = lower(btrim(p_tecnico))
   for update;
  if not found or v_ot.vehiculo_id is null then return false; end if;

  v_km := coalesce(nullif(v_ot.kilometraje_salida, 0), nullif(v_ot.kilometraje_entrada, 0));
  -- El próximo cambio por km tiene que ser posterior a los km a los que se hace este (si se conocen).
  if p_km is not null and coalesce(v_km, 0) > 0 and p_km <= v_km then return false; end if;
  update public.vehiculos set
    aceite_fecha = to_char(hoy, 'YYYY-MM-DD'),
    aceite_km = coalesce(v_km, aceite_km),
    aceite_proxima_fecha = p_fecha,
    aceite_proximo_km = p_km
   where id = v_ot.vehiculo_id;
  if not found then return false; end if;

  update public.ordenes_trabajo set
    historial = coalesce(historial, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'fecha', ahora, 'descripcion', p_tecnico || ' anotó el próximo cambio de aceite: ' || to_char(v_fecha, 'DD/MM/YYYY')
        || case when p_km is not null then ' o a los ' || replace(to_char(p_km, 'FM999G999G999'), ',', '.') || ' km' else '' end
        || ' (ficha del vehículo actualizada)')),
    fecha_actualizacion = ahora
   where id = p_ot;
  return true;
end;
$function$;


revoke execute on function public.taller_ot_aceite_proximo(text, text, text, integer) from public, anon, authenticated;
grant execute on function public.taller_ot_aceite_proximo(text, text, text, integer) to service_role;
