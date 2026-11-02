-- ============================================================================
-- 30. COMPLEMENTOS DE LA RESERVA (sillitas, baca, portabicicletas...)
--
--  · `reservas.extras`: copia de los complementos que lleva cada reserva (nombre,
--    cantidad, total y, en las manuales, precio y si es por día). Las reservas de la
--    web guardan lo que cobró la web (ya con sus descuentos); las coberturas/seguros
--    no van aquí: ya los modelan los campos de seguro de la reserva.
--  · `complementos`: catálogo editable (Empresa) para las reservas manuales. Cada uno
--    tiene precio y se cobra por día o a precio fijo.
-- ============================================================================
alter table public.reservas add column if not exists extras jsonb not null default '[]'::jsonb;

create table if not exists public.complementos (
  id      text primary key,
  nombre  text not null,
  precio  numeric(10,2) not null check (precio >= 0),
  por_dia boolean not null default true,
  activo  boolean not null default true,
  orden   integer not null default 0
);
create unique index if not exists complementos_nombre_unico_idx on public.complementos (lower(btrim(nombre)));

alter table public.complementos enable row level security;
drop policy if exists activos_all on public.complementos;
create policy activos_all on public.complementos for all to authenticated
  using ((select public.es_usuario_activo())) with check ((select public.es_usuario_activo()));

insert into public.complementos (id, nombre, precio, por_dia, orden) values
  ('comp-asiento-elevador',        'Asiento elevador',                    5,  true,  1),
  ('comp-asiento-elevador-alto',   'Asiento elevador de respaldo alto',   8,  true,  2),
  ('comp-sillita-infantil',        'Sillita infantil',                    8,  true,  3),
  ('comp-maxi-cosi',               'Maxi-Cosi',                           8,  true,  4),
  ('comp-baca-coche',              'Baca coche',                          50, false, 5),
  ('comp-portabicicletas',         'Portabicicletas',                     40, false, 6)
on conflict do nothing;

-- Las reservas de la web que ya existen reciben los complementos de su pedido (sin coberturas).
update public.reservas r
   set extras = coalesce((
     select jsonb_agg(jsonb_build_object('nombre', e->>'nombre', 'cantidad', coalesce((e->>'cantidad')::int, 1), 'total', coalesce((e->>'total')::numeric, 0)) order by ord)
       from jsonb_array_elements(s.extras) with ordinality as x(e, ord)
      where e->>'nombre' !~* '^cobertura'), '[]'::jsonb)
  from public.solicitudes_reserva s
 where s.reserva_id = r.id and jsonb_array_length(s.extras) > 0;
