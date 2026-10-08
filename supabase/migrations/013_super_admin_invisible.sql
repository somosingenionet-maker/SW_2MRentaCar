-- ============================================================================
-- 15. EL SUPER ADMIN ES INVISIBLE PARA EL RESTO
--
-- El super_admin es la cuenta del proveedor (soporte): el cliente no debe verla
-- ni saber que existe. Hasta ahora cualquier usuario activo podía leer todos
-- los perfiles, así que el administrador de la empresa la veía en su panel.
--
-- Ahora un perfil con rol super_admin solo lo lee otro super_admin (y cada
-- usuario siempre puede leer el suyo propio). La regla vive en la base de datos,
-- no en la pantalla: no se puede saltar desde la API.
-- Un admin sigue viendo y gestionando a los usuarios de su empresa.
-- ============================================================================
drop policy if exists usuarios_read on public.usuarios;
create policy usuarios_read on public.usuarios
  for select to authenticated
  using (
    id = (select auth.uid())
    or (
      (select public.es_usuario_activo())
      and (rol <> 'super_admin' or (select public.current_rol()) = 'super_admin')
    )
  );
