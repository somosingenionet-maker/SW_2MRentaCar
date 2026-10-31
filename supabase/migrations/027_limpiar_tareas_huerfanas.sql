-- ============================================================================
-- 29. LIMPIEZA DE TAREAS DE MECÁNICO SIN LÍNEA
--
-- Las tareas hechas por el mecánico (`ot_tareas`) apuntan a una línea de mano de obra de la
-- orden. Si el taller quita esa línea, la marca se quedaba huérfana para siempre. Ahora se
-- borra sola al cambiar las líneas de la orden (solo si las líneas cambian de verdad), y esta
-- migración limpia las que ya habían quedado sueltas.
-- ============================================================================
create or replace function public.ot_tareas_limpiar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.ot_tareas t
   where t.ot_id = new.id
     and not exists (
       select 1 from jsonb_array_elements(coalesce(new.lineas, '[]'::jsonb)) l
        where l->>'id' = t.linea_id and l->>'tipo' = 'mano_de_obra');
  return null;
end;
$$;

drop trigger if exists ot_tareas_limpiar on public.ordenes_trabajo;
create trigger ot_tareas_limpiar
  after update of lineas on public.ordenes_trabajo
  for each row when (old.lineas is distinct from new.lineas)
  execute function public.ot_tareas_limpiar();
revoke execute on function public.ot_tareas_limpiar() from public, anon, authenticated;

delete from public.ot_tareas t
 where not exists (
   select 1 from public.ordenes_trabajo o, jsonb_array_elements(o.lineas) l
    where o.id = t.ot_id and l->>'id' = t.linea_id and l->>'tipo' = 'mano_de_obra');
