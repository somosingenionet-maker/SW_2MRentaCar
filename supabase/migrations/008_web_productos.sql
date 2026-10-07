-- ============================================================================
-- 10. CATÁLOGO DE PRODUCTOS DE LA WEB (vehículo vs extra)
--
-- Un pedido de la web mezcla el vehículo y sus extras (sillita, cobertura...) y
-- el aviso del webhook no dice cuál es cuál: el vehículo NO siempre va primero.
-- Esta tabla guía a la función `woo-webhook`. Solo la lee la función
-- (service_role); sin políticas, el personal no tiene acceso directo.
--
-- Si la web añade un vehículo nuevo y no está aquí, la función lo trata como
-- vehículo solo si su nombre contiene "o similar"; si no, como extra (se ve
-- en la bandeja y basta añadir una fila aquí).
-- ============================================================================
create table if not exists public.web_productos (
  id      text primary key,            -- id del producto en WooCommerce
  tipo    text not null check (tipo in ('vehiculo','extra')),
  nombre  text not null default ''
);
alter table public.web_productos enable row level security;

insert into public.web_productos (id, tipo, nombre) values
  ('1774','vehiculo','Citroen Jumpy o similar'),
  ('1290','vehiculo','Opel Mokka o similar'),
  ('1288','vehiculo','Ford S-MAX o similar (Automático)'),
  ('1286','vehiculo','Fiat Doblo o similar'),
  ('1283','vehiculo','Renault Trafic o similar'),
  ('1118','vehiculo','Toyota Yaris o similar'),
  ('1122','vehiculo','Seat Ibiza o similar'),
  ('1124','vehiculo','Renault Megane o similar'),
  ('1126','vehiculo','Opel Zafira o similar'),
  ('1128','vehiculo','Renault Clio o similar'),
  ('1130','vehiculo','Fiat Panda o similar'),
  ('1132','vehiculo','Fiat 500 - Híbrido Manual'),
  ('1133','vehiculo','Dacia Lodgy o similar'),
  ('1135','extra','Cobertura Plus Relax - 15€/día'),
  ('1142','extra','Cobertura Básica - 500€'),
  ('1444','extra','Cobertura para Furgoneta - 600€'),
  ('1136','extra','Asiento elevador - 5€/día'),
  ('1138','extra','Asiento elevador de respaldo alto - 8€/día'),
  ('1139','extra','Sillita infantil - 8€/día'),
  ('1140','extra','Maxi-Cosi - 8€/día'),
  ('1969','extra','Baca Coche'),
  ('1967','extra','Portabicicletas')
on conflict (id) do update set tipo = excluded.tipo, nombre = excluded.nombre;
