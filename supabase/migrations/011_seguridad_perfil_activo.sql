-- ============================================================================
-- 13. SEGURIDAD: SOLO CUENTAS CON PERFIL ACTIVO TOCAN LOS DATOS
--
-- Hallazgos de la auditoría:
--  · Las políticas de las tablas de negocio decían solo "estar autenticado".
--    Cualquier sesión válida las pasaba: una cuenta creada por el registro
--    público de Supabase (si está abierto) o un usuario DESACTIVADO cuya sesión
--    seguía viva. Desactivar a alguien solo se comprobaba en la pantalla de
--    login, no en la base de datos.
--  · El trigger de alta creaba el perfil ACTIVO y con módulos por defecto.
--  · Las funciones SECURITY DEFINER eran invocables por anon/authenticated
--    desde /rest/v1/rpc.
--  · 17 claves foráneas sin índice y una política duplicada en empresa_config.
--
-- Qué hace esta migración:
--  · es_usuario_activo(): true solo si existe perfil con activo = true.
--  · current_rol(): devuelve NULL si el perfil está inactivo (un admin
--    desactivado pierde también sus permisos de administración).
--  · Alta por registro público => perfil INACTIVO y sin módulos. Las cuentas
--    legítimas las crea la Edge Function admin-users, que las activa.
--  · Todas las políticas exigen perfil activo. Cada usuario puede leer SU
--    propio perfil aunque esté inactivo, para que la app pueda decirle
--    "cuenta desactivada" en vez de un error genérico.
--  · REVOKE de EXECUTE a las funciones internas; los triggers siguen
--    funcionando (PostgreSQL no comprueba EXECUTE al disparar un trigger).
--  · Índices en las claves foráneas (borrados en cascada y joins rápidos).
-- ============================================================================

create or replace function public.current_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.usuarios where id = auth.uid() and activo;
$$;

create or replace function public.es_usuario_activo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.usuarios where id = auth.uid() and activo);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nombre, email, activo, modulos)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    false,
    '[]'::jsonb
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Tablas de trabajo diario: lectura y escritura solo con perfil activo.
-- (select ...) hace que Postgres evalúe la función una vez por consulta.
do $$
declare t text;
begin
  foreach t in array array[
    'vehiculos','clientes','intervenciones','ordenes_trabajo','reservas',
    'alertas','notificaciones','tecnicos','citas','invitaciones_cliente'
  ]
  loop
    execute format('drop policy if exists auth_all on public.%I;', t);
    execute format('drop policy if exists activos_all on public.%I;', t);
    execute format(
      'create policy activos_all on public.%I for all to authenticated using ((select public.es_usuario_activo())) with check ((select public.es_usuario_activo()));', t
    );
  end loop;
end $$;

-- facturas: leer y crear con perfil activo; editar o borrar solo admin/super_admin.
drop policy if exists facturas_read on public.facturas;
drop policy if exists facturas_insert on public.facturas;
drop policy if exists facturas_update on public.facturas;
drop policy if exists facturas_delete on public.facturas;
create policy facturas_read on public.facturas
  for select to authenticated using ((select public.es_usuario_activo()));
create policy facturas_insert on public.facturas
  for insert to authenticated with check ((select public.es_usuario_activo()));
create policy facturas_update on public.facturas
  for update to authenticated
  using ((select public.current_rol()) in ('admin','super_admin'))
  with check ((select public.current_rol()) in ('admin','super_admin'));
create policy facturas_delete on public.facturas
  for delete to authenticated
  using ((select public.current_rol()) in ('admin','super_admin'));

-- solicitudes_reserva: el personal activo lee y gestiona; solo la Edge Function inserta.
drop policy if exists solicitudes_read on public.solicitudes_reserva;
drop policy if exists solicitudes_update on public.solicitudes_reserva;
create policy solicitudes_read on public.solicitudes_reserva
  for select to authenticated using ((select public.es_usuario_activo()));
create policy solicitudes_update on public.solicitudes_reserva
  for update to authenticated
  using ((select public.es_usuario_activo())) with check ((select public.es_usuario_activo()));

-- empresa_config: leer con perfil activo; escribir solo admin/super_admin.
-- Se separa la escritura por operación para no solapar con la política de lectura.
drop policy if exists empresa_read on public.empresa_config;
drop policy if exists empresa_write on public.empresa_config;
drop policy if exists empresa_insert on public.empresa_config;
drop policy if exists empresa_update on public.empresa_config;
drop policy if exists empresa_delete on public.empresa_config;
create policy empresa_read on public.empresa_config
  for select to authenticated using ((select public.es_usuario_activo()));
create policy empresa_insert on public.empresa_config
  for insert to authenticated with check ((select public.current_rol()) in ('admin','super_admin'));
create policy empresa_update on public.empresa_config
  for update to authenticated
  using ((select public.current_rol()) in ('admin','super_admin'))
  with check ((select public.current_rol()) in ('admin','super_admin'));
create policy empresa_delete on public.empresa_config
  for delete to authenticated using ((select public.current_rol()) in ('admin','super_admin'));

-- usuarios: lectura de perfiles con perfil activo, más SU propia fila siempre.
drop policy if exists usuarios_read on public.usuarios;
create policy usuarios_read on public.usuarios
  for select to authenticated
  using (id = (select auth.uid()) or (select public.es_usuario_activo()));

-- Funciones internas: nadie las llama desde la API.
revoke execute on function public.crear_alertas_vehiculo() from public, anon, authenticated;
revoke execute on function public.sincronizar_alertas_vencimiento() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- Las políticas sí necesitan estas dos, pero solo para usuarios con sesión.
revoke execute on function public.current_rol() from public, anon;
revoke execute on function public.es_usuario_activo() from public, anon;
grant execute on function public.current_rol() to authenticated;
grant execute on function public.es_usuario_activo() to authenticated;

-- Índices en claves foráneas.
create index if not exists alertas_vehiculo_id_idx on public.alertas (vehiculo_id);
create index if not exists citas_cliente_id_idx on public.citas (cliente_id);
create index if not exists citas_vehiculo_id_idx on public.citas (vehiculo_id);
create index if not exists citas_tecnico_id_idx on public.citas (tecnico_id);
create index if not exists citas_ot_id_idx on public.citas (ot_id);
create index if not exists facturas_cliente_id_idx on public.facturas (cliente_id);
create index if not exists facturas_vehiculo_id_idx on public.facturas (vehiculo_id);
create index if not exists invitaciones_cliente_cliente_id_idx on public.invitaciones_cliente (cliente_id);
create index if not exists notificaciones_cliente_id_idx on public.notificaciones (cliente_id);
create index if not exists notificaciones_vehiculo_id_idx on public.notificaciones (vehiculo_id);
create index if not exists ordenes_trabajo_cliente_id_idx on public.ordenes_trabajo (cliente_id);
create index if not exists ordenes_trabajo_vehiculo_id_idx on public.ordenes_trabajo (vehiculo_id);
create index if not exists reservas_cliente_id_idx on public.reservas (cliente_id);
create index if not exists reservas_vehiculo_id_idx on public.reservas (vehiculo_id);
create index if not exists solicitudes_reserva_cliente_id_idx on public.solicitudes_reserva (cliente_id);
create index if not exists solicitudes_reserva_reserva_id_idx on public.solicitudes_reserva (reserva_id);
