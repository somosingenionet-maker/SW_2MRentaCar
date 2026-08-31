-- ============================================================================
-- 8. AGENDA DE CITAS
--
-- Admite datos libres (contacto_nombre/contacto_telefono/vehiculo_descripcion)
-- para clientes o vehículos que aún no están registrados — se completan al
-- convertir la cita en Orden de Trabajo. Cliente/vehículo/técnico/OT se
-- desvinculan (no se borra la cita) si el registro enlazado se elimina.
-- ============================================================================
create table if not exists public.citas (
  id                    text primary key,
  fecha_hora            timestamptz not null,
  duracion_minutos      integer not null default 60,
  cliente_id            text references public.clientes(id) on delete set null,
  vehiculo_id           text references public.vehiculos(id) on delete set null,
  contacto_nombre       text,
  contacto_telefono     text,
  vehiculo_descripcion  text,
  motivo                text not null default '',
  tecnico_id            text references public.tecnicos(id) on delete set null,
  estado                text not null default 'pendiente' check (estado in ('pendiente','confirmada','cancelada','convertida')),
  notas                 text,
  ot_id                 text references public.ordenes_trabajo(id) on delete set null,
  constraint citas_cliente_o_contacto check (cliente_id is not null or contacto_nombre is not null)
);
create index if not exists citas_fecha_hora_idx on public.citas (fecha_hora);

alter table public.citas enable row level security;
drop policy if exists auth_all on public.citas;
create policy auth_all on public.citas for all to authenticated using (true) with check (true);
