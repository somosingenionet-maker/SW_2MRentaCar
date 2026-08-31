-- ============================================================================
-- 6. INTEGRIDAD REFERENCIAL AL BORRAR VEHÍCULOS/CLIENTES
--
-- Hasta ahora vehiculo_id/cliente_id eran simples columnas de texto sin
-- restricción — al borrar un vehículo o cliente, todo lo que lo referenciaba
-- (alertas, intervenciones, órdenes de trabajo, reservas, facturas,
-- notificaciones) se quedaba huérfano, apuntando a un id que ya no existe.
--
-- Regla aplicada:
--   - alertas: se BORRAN en cascada (no tienen ningún sentido sin el
--     vehículo — son datos derivados, no historial).
--   - intervenciones/ordenes_trabajo/reservas/facturas/notificaciones: NUNCA
--     se borran (son historial real, y en el caso de facturas, contable). Al
--     borrar el vehículo o cliente, solo se DESVINCULA la referencia (queda
--     en null) — la interfaz ya sabe mostrar "—"/"Eliminado" cuando falta.
-- ============================================================================

-- 1) Se relaja NOT NULL primero (hace falta para poder desvincular las filas
--    huérfanas del siguiente paso sin borrar el historial).
alter table public.intervenciones alter column vehiculo_id drop not null;
alter table public.ordenes_trabajo alter column vehiculo_id drop not null;
alter table public.ordenes_trabajo alter column cliente_id drop not null;
alter table public.reservas alter column vehiculo_id drop not null;
alter table public.reservas alter column cliente_id drop not null;
alter table public.facturas alter column cliente_id drop not null;
alter table public.notificaciones alter column cliente_id drop not null;

-- 2) Limpieza de datos huérfanos ya existentes (de antes de esta migración).
delete from public.alertas a
  where not exists (select 1 from public.vehiculos v where v.id = a.vehiculo_id);

update public.intervenciones i set vehiculo_id = null
  where vehiculo_id is not null and not exists (select 1 from public.vehiculos v where v.id = i.vehiculo_id);

update public.ordenes_trabajo o set vehiculo_id = null
  where vehiculo_id is not null and not exists (select 1 from public.vehiculos v where v.id = o.vehiculo_id);
update public.ordenes_trabajo o set cliente_id = null
  where cliente_id is not null and not exists (select 1 from public.clientes c where c.id = o.cliente_id);

update public.reservas r set vehiculo_id = null
  where vehiculo_id is not null and not exists (select 1 from public.vehiculos v where v.id = r.vehiculo_id);
update public.reservas r set cliente_id = null
  where cliente_id is not null and not exists (select 1 from public.clientes c where c.id = r.cliente_id);

update public.facturas f set vehiculo_id = null
  where vehiculo_id is not null and not exists (select 1 from public.vehiculos v where v.id = f.vehiculo_id);
update public.facturas f set cliente_id = null
  where cliente_id is not null and not exists (select 1 from public.clientes c where c.id = f.cliente_id);

update public.notificaciones n set vehiculo_id = null
  where vehiculo_id is not null and not exists (select 1 from public.vehiculos v where v.id = n.vehiculo_id);
update public.notificaciones n set cliente_id = null
  where cliente_id is not null and not exists (select 1 from public.clientes c where c.id = n.cliente_id);

-- 3) Restricciones de integridad referencial reales.
alter table public.alertas
  add constraint alertas_vehiculo_id_fkey foreign key (vehiculo_id) references public.vehiculos(id) on delete cascade;

alter table public.intervenciones
  add constraint intervenciones_vehiculo_id_fkey foreign key (vehiculo_id) references public.vehiculos(id) on delete set null;

alter table public.ordenes_trabajo
  add constraint ordenes_trabajo_vehiculo_id_fkey foreign key (vehiculo_id) references public.vehiculos(id) on delete set null,
  add constraint ordenes_trabajo_cliente_id_fkey foreign key (cliente_id) references public.clientes(id) on delete set null;

alter table public.reservas
  add constraint reservas_vehiculo_id_fkey foreign key (vehiculo_id) references public.vehiculos(id) on delete set null,
  add constraint reservas_cliente_id_fkey foreign key (cliente_id) references public.clientes(id) on delete set null;

alter table public.facturas
  add constraint facturas_vehiculo_id_fkey foreign key (vehiculo_id) references public.vehiculos(id) on delete set null,
  add constraint facturas_cliente_id_fkey foreign key (cliente_id) references public.clientes(id) on delete set null;

alter table public.notificaciones
  add constraint notificaciones_vehiculo_id_fkey foreign key (vehiculo_id) references public.vehiculos(id) on delete set null,
  add constraint notificaciones_cliente_id_fkey foreign key (cliente_id) references public.clientes(id) on delete set null;
