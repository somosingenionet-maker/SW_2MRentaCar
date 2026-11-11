-- ============================================================================
-- 041. ALERTAS: CAMBIO DE ACEITE EN VEZ DE MANTENIMIENTO POR KM, Y CONTROL DE AVISOS
--
--  · Se deja de crear la alerta de «mantenimiento» (km del coche + 15.000): era un número sin base real.
--    Las filas que ya existen NO se borran; la app simplemente no las enseña.
--  · Nueva alerta `aceite`: nace de `vehiculos.aceite_proxima_fecha` (la fecha que pone el mecánico o el taller).
--    Si cambia la fecha, la alerta se reabre con la nueva (igual que ITV/seguro/impuesto). Si se borra la fecha, se borra la alerta.
--  · `notificaciones.referencia`: qué dato motivó el aviso (la fecha del próximo cambio, o la orden), para no repetir
--    nunca el mismo aviso aunque pase el tiempo.
--  · `clientes.no_avisar`: el cliente pidió no recibir avisos.
-- ============================================================================
alter table public.notificaciones add column if not exists referencia text;
alter table public.clientes add column if not exists no_avisar boolean not null default false;

create or replace function public.crear_alertas_vehiculo()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.itv_vencimiento is not null and new.itv_vencimiento <> '' then
    insert into public.alertas (vehiculo_id, tipo, descripcion, estado, fecha_limite)
    values (new.id, 'itv',
      'Inspección Técnica obligatoria (ITV) programada para el vencimiento: ' || new.itv_vencimiento || '.',
      'activa', new.itv_vencimiento);
  end if;
  if new.seguro_vencimiento is not null and new.seguro_vencimiento <> '' then
    insert into public.alertas (vehiculo_id, tipo, descripcion, estado, fecha_limite)
    values (new.id, 'seguro',
      'Póliza de seguro con vencimiento el ' || new.seguro_vencimiento || '.',
      'activa', new.seguro_vencimiento);
  end if;
  if new.impuesto_vencimiento is not null and new.impuesto_vencimiento <> '' then
    insert into public.alertas (vehiculo_id, tipo, descripcion, estado, fecha_limite)
    values (new.id, 'impuesto',
      'Impuesto de circulación con vencimiento el ' || new.impuesto_vencimiento || '.',
      'activa', new.impuesto_vencimiento);
  end if;
  if new.aceite_proxima_fecha is not null and new.aceite_proxima_fecha <> '' then
    insert into public.alertas (vehiculo_id, tipo, descripcion, estado, fecha_limite)
    values (new.id, 'aceite',
      'Cambio de aceite previsto para el ' || new.aceite_proxima_fecha || '.',
      'activa', new.aceite_proxima_fecha);
  end if;
  return new;
end;
$$;

create or replace function public.sincronizar_alerta_aceite()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_alerta_id text;
begin
  if new.aceite_proxima_fecha is null or new.aceite_proxima_fecha = '' then
    delete from public.alertas where vehiculo_id = new.id and tipo = 'aceite' and estado <> 'atendida';
    return new;
  end if;
  select id into v_alerta_id from public.alertas
    where vehiculo_id = new.id and tipo = 'aceite' order by id desc limit 1;
  if v_alerta_id is null then
    insert into public.alertas (vehiculo_id, tipo, descripcion, estado, fecha_limite)
    values (new.id, 'aceite', 'Cambio de aceite previsto para el ' || new.aceite_proxima_fecha || '.', 'activa', new.aceite_proxima_fecha);
  else
    update public.alertas set estado = 'activa', fecha_limite = new.aceite_proxima_fecha,
      descripcion = 'Cambio de aceite previsto para el ' || new.aceite_proxima_fecha || '.'
      where id = v_alerta_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_vehiculos_sync_alerta_aceite on public.vehiculos;
create trigger trg_vehiculos_sync_alerta_aceite
  after update of aceite_proxima_fecha on public.vehiculos
  for each row when (new.aceite_proxima_fecha is distinct from old.aceite_proxima_fecha)
  execute function public.sincronizar_alerta_aceite();
revoke execute on function public.sincronizar_alerta_aceite() from public, anon, authenticated;

-- Vehículos que ya tienen fecha de próximo cambio y aún no tienen su alerta.
insert into public.alertas (vehiculo_id, tipo, descripcion, estado, fecha_limite)
select v.id, 'aceite', 'Cambio de aceite previsto para el ' || v.aceite_proxima_fecha || '.', 'activa', v.aceite_proxima_fecha
  from public.vehiculos v
 where v.aceite_proxima_fecha is not null and v.aceite_proxima_fecha <> ''
   and not exists (select 1 from public.alertas a where a.vehiculo_id = v.id and a.tipo = 'aceite');
