-- ============================================================================
-- 9. SEGURIDAD: LECTURA PARA TODOS, ESCRITURA SOLO ADMIN/SUPER_ADMIN
--
-- Hasta ahora las tablas de negocio tenían una única política "auth_all"
-- (for all to authenticated using (true) with check (true)): cualquier
-- usuario autenticado, incluido el rol 'usuario' (operativo), podía escribir
-- directamente en la base de datos aunque la interfaz no le mostrara esa
-- pestaña. Esta migración la sustituye por dos políticas por tabla:
--   - lectura: abierta a cualquier autenticado.
--   - escritura (insert/update/delete): solo admin/super_admin.
-- El control por módulos (usuarios.modulos) sigue decidiendo en la interfaz
-- qué pestañas ve cada usuario; esto añade la barrera real a nivel de BD.
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'vehiculos','clientes','intervenciones','ordenes_trabajo','reservas',
    'alertas','notificaciones','tecnicos','facturas','citas'
  ]
  loop
    execute format('drop policy if exists auth_all on public.%I;', t);
    execute format('drop policy if exists %I_read on public.%I;', t, t);
    execute format('drop policy if exists %I_write on public.%I;', t, t);
    execute format(
      'create policy %I_read on public.%I for select to authenticated using (true);', t, t
    );
    execute format(
      'create policy %I_write on public.%I for all to authenticated using (public.current_rol() in (''admin'',''super_admin'')) with check (public.current_rol() in (''admin'',''super_admin''));', t, t
    );
  end loop;
end $$;
