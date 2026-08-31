-- ============================================================================
-- 5. ALERTAS AUTOMÁTICAS (ITV, seguro, impuesto, mantenimiento)
--
-- Antes de esto, solo se creaba la alerta de ITV, y solo desde el código del
-- navegador al dar de alta un vehículo — el resto (seguro, impuesto,
-- mantenimiento) nunca se creaba, y al "atender" una alerta se marcaba
-- atendida para siempre sin volver a abrirse en el siguiente vencimiento.
-- Se resuelve con triggers de base de datos: fuente única de verdad,
-- funciona sin depender del código del cliente.
-- ============================================================================

-- Permite insertar filas de alerta sin id explícito (los triggers no conocen
-- el generador de ids del cliente). El código del cliente sigue mandando su
-- propio id cuando crea una alerta a mano; aquí solo se usa como red de
-- seguridad para los inserts hechos por los triggers.
alter table public.alertas alter column id set default gen_random_uuid()::text;

-- Alta de vehículo: crea itv/seguro/impuesto (si el vehículo trae esa fecha)
-- y una alerta inicial de mantenimiento a kilometraje + 15000 (mismo
-- incremento que ya usa la app al renovar mantenimiento manualmente).
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
  insert into public.alertas (vehiculo_id, tipo, descripcion, estado, kilometraje_limite)
  values (new.id, 'mantenimiento',
    'Revisión de mantenimiento preventivo recomendada a los ' || (new.kilometraje + 15000) || ' km.',
    'activa', new.kilometraje + 15000);
  return new;
end;
$$;
drop trigger if exists trg_vehiculos_crear_alertas on public.vehiculos;
create trigger trg_vehiculos_crear_alertas after insert on public.vehiculos
  for each row execute function public.crear_alertas_vehiculo();

-- Renovación: cuando cambia una fecha de vencimiento del vehículo (lo que ya
-- hace la app al "Atender Alerta" de itv/seguro/impuesto), reabre/actualiza
-- la misma fila de alerta en vez de dejarla huérfana en 'atendida'.
-- (El mantenimiento por kilometraje NO se gestiona aquí: se renueva de forma
-- explícita desde el código de la app, porque el kilometraje cambia por
-- muchos motivos que no deben disparar la alerta sin más.)
create or replace function public.sincronizar_alertas_vencimiento()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_alerta_id text;
begin
  if new.itv_vencimiento is distinct from old.itv_vencimiento and new.itv_vencimiento is not null and new.itv_vencimiento <> '' then
    select id into v_alerta_id from public.alertas
      where vehiculo_id = new.id and tipo = 'itv' order by id desc limit 1;
    if v_alerta_id is null then
      insert into public.alertas (vehiculo_id, tipo, descripcion, estado, fecha_limite)
      values (new.id, 'itv',
        'Inspección Técnica obligatoria (ITV) programada para el vencimiento: ' || new.itv_vencimiento || '.',
        'activa', new.itv_vencimiento);
    else
      update public.alertas set estado = 'activa', fecha_limite = new.itv_vencimiento,
        descripcion = 'Inspección Técnica obligatoria (ITV) programada para el vencimiento: ' || new.itv_vencimiento || '.'
        where id = v_alerta_id;
    end if;
  end if;

  if new.seguro_vencimiento is distinct from old.seguro_vencimiento and new.seguro_vencimiento is not null and new.seguro_vencimiento <> '' then
    select id into v_alerta_id from public.alertas
      where vehiculo_id = new.id and tipo = 'seguro' order by id desc limit 1;
    if v_alerta_id is null then
      insert into public.alertas (vehiculo_id, tipo, descripcion, estado, fecha_limite)
      values (new.id, 'seguro',
        'Póliza de seguro con vencimiento el ' || new.seguro_vencimiento || '.', 'activa', new.seguro_vencimiento);
    else
      update public.alertas set estado = 'activa', fecha_limite = new.seguro_vencimiento,
        descripcion = 'Póliza de seguro con vencimiento el ' || new.seguro_vencimiento || '.'
        where id = v_alerta_id;
    end if;
  end if;

  if new.impuesto_vencimiento is distinct from old.impuesto_vencimiento and new.impuesto_vencimiento is not null and new.impuesto_vencimiento <> '' then
    select id into v_alerta_id from public.alertas
      where vehiculo_id = new.id and tipo = 'impuesto' order by id desc limit 1;
    if v_alerta_id is null then
      insert into public.alertas (vehiculo_id, tipo, descripcion, estado, fecha_limite)
      values (new.id, 'impuesto',
        'Impuesto de circulación con vencimiento el ' || new.impuesto_vencimiento || '.', 'activa', new.impuesto_vencimiento);
    else
      update public.alertas set estado = 'activa', fecha_limite = new.impuesto_vencimiento,
        descripcion = 'Impuesto de circulación con vencimiento el ' || new.impuesto_vencimiento || '.'
        where id = v_alerta_id;
    end if;
  end if;

  return new;
end;
$$;
drop trigger if exists trg_vehiculos_sync_alertas on public.vehiculos;
create trigger trg_vehiculos_sync_alertas
  after update of itv_vencimiento, seguro_vencimiento, impuesto_vencimiento on public.vehiculos
  for each row execute function public.sincronizar_alertas_vencimiento();
