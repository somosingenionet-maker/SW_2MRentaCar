-- ============================================================================
-- 31. PRECIOS DE LISTA Y CUPONES DE LOS PEDIDOS DE LA WEB
--
-- WooCommerce reparte el descuento de un cupón entre las líneas del pedido (un cupón de 10 €
-- resta 2,50 € a cada una de 4 líneas), así que «portabicicletas 37,50 €» era en realidad un
-- portabicicletas de 40 € con su parte del cupón. Para mostrarlo claro (cada línea a su precio
-- y el cupón aparte) se guarda el precio de LISTA de cada línea y los cupones del pedido.
-- El total cobrado no cambia: suma de precios de lista − cupones = total del pedido.
--
--  · solicitudes_reserva.vehiculo_subtotal: precio de lista del alquiler del vehículo.
--  · solicitudes_reserva.extras[].subtotal: precio de lista de cada complemento.
--  · solicitudes_reserva.cupones: [{codigo, importe}] con lo que descontó cada cupón.
--  · reservas.descuento y reservas.cupon: lo mismo, copiado a la reserva al asignarla.
-- Los pedidos ya recibidos se completan desde su pedido original (`payload`).
-- ============================================================================
alter table public.solicitudes_reserva
  add column if not exists vehiculo_subtotal numeric(10,2),
  add column if not exists cupones jsonb not null default '[]'::jsonb;

alter table public.reservas
  add column if not exists descuento numeric(10,2) not null default 0,
  add column if not exists cupon text;

update public.solicitudes_reserva s set
  vehiculo_subtotal = coalesce(
    (select (li->>'subtotal')::numeric from jsonb_array_elements(s.payload->'line_items') li where li->>'product_id' = s.vehiculo_web_id limit 1),
    (select (li->>'subtotal')::numeric from jsonb_array_elements(s.payload->'line_items') li where li->>'name' = s.vehiculo_nombre limit 1),
    s.vehiculo_total),
  extras = coalesce((
    select jsonb_agg(
      e || jsonb_build_object('subtotal', coalesce(
        (select (li->>'subtotal')::numeric from jsonb_array_elements(s.payload->'line_items') li where li->>'name' = e->>'nombre' limit 1),
        (e->>'total')::numeric)) order by ord)
    from jsonb_array_elements(s.extras) with ordinality as x(e, ord)), '[]'::jsonb),
  cupones = coalesce((
    select jsonb_agg(jsonb_build_object('codigo', c->>'code', 'importe', (c->>'discount')::numeric))
    from jsonb_array_elements(coalesce(s.payload->'coupon_lines', '[]'::jsonb)) c), '[]'::jsonb)
 where s.payload is not null;

-- Las reservas que ya vienen de un pedido de la web reciben su descuento y sus complementos a precio de lista.
update public.reservas r set
  descuento = coalesce(s.descuento, 0),
  cupon = nullif((select string_agg(c->>'codigo', ', ') from jsonb_array_elements(s.cupones) c), ''),
  extras = coalesce((
    select jsonb_agg(jsonb_build_object('nombre', e->>'nombre', 'cantidad', coalesce((e->>'cantidad')::int, 1), 'total', coalesce((e->>'subtotal')::numeric, (e->>'total')::numeric)) order by ord)
    from jsonb_array_elements(s.extras) with ordinality as x(e, ord)
    where e->>'nombre' !~* '^cobertura'), '[]'::jsonb)
  from public.solicitudes_reserva s
 where s.reserva_id = r.id;
