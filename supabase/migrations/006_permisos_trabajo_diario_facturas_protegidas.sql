-- ============================================================================
-- 9. SEGURIDAD: TRABAJO DIARIO ABIERTO A CUALQUIER USUARIO AUTENTICADO,
--    FACTURAS YA CREADAS PROTEGIDAS (solo admin/super_admin las edita o borra)
--
-- El rol 'usuario' es el personal de oficina que hace el trabajo diario:
-- crear/editar vehículos, clientes, órdenes de trabajo, reservas, alertas,
-- notificaciones, técnicos, citas. 'admin'/'super_admin' es la gerencia.
-- Única excepción: una factura ya creada (emitida/pagada/etc.) solo puede
-- editarse o eliminarse por admin/super_admin — crear facturas nuevas sigue
-- abierto a cualquier autenticado.
--
-- Nota: si ya ejecutaste una versión anterior de este archivo con el
-- esquema "lectura para todos, escritura solo admin", este script la
-- sustituye por completo (es idempotente, se puede ejecutar sin problema
-- las veces que haga falta).
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'vehiculos','clientes','intervenciones','ordenes_trabajo','reservas',
    'alertas','notificaciones','tecnicos','citas'
  ]
  loop
    execute format('drop policy if exists auth_all on public.%I;', t);
    execute format('drop policy if exists %I_read on public.%I;', t, t);
    execute format('drop policy if exists %I_write on public.%I;', t, t);
    execute format(
      'create policy auth_all on public.%I for all to authenticated using (true) with check (true);', t
    );
  end loop;
end $$;

-- facturas: cualquier autenticado lee y crea; solo admin/super_admin edita
-- o elimina una factura ya existente.
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
