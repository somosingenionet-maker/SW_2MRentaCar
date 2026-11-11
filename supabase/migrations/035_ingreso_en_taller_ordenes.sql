-- ============================================================================
-- 035. FECHA Y HORA DE INGRESO EN LA LISTA DEL MECÁNICO
--
-- La lista que ve cada mecánico (función taller_ordenes) ordenaba y enseñaba la «fecha de
-- recepción» de la orden, que es solo un día y a veces una fecha prevista (hay órdenes con
-- fecha futura). El momento real en que el coche entró al taller queda en el historial de la
-- orden («Vehículo recibido en taller», «Presupuesto aprobado — vehículo recibido en taller»,
-- «… desde cita»). Se añade el campo `ingreso` con ese instante; si la orden no lo tiene (antiguas),
-- se usa la fecha de recepción. El resto de campos no cambia. La lista sale del más antiguo al más nuevo.
-- ============================================================================
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
$function$;
