-- ============================================================================
-- 25. LUGAR DE ENTREGA Y DE DEVOLUCIÓN DE LA RESERVA
--
-- El contrato debe decir dónde se entrega y dónde se devuelve el coche. Las
-- reservas de la web ya lo traen en su pedido; las manuales no tenían dónde
-- guardarlo. Texto libre y opcional. Las reservas que vienen de la web se
-- rellenan con el lugar de su pedido.
-- ============================================================================
alter table public.reservas
  add column if not exists lugar_recogida text,
  add column if not exists lugar_devolucion text;

update public.reservas r
   set lugar_recogida = coalesce(r.lugar_recogida, s.lugar_recogida),
       lugar_devolucion = coalesce(r.lugar_devolucion, s.lugar_devolucion)
  from public.solicitudes_reserva s
 where s.reserva_id = r.id;
