-- ============================================================================
-- 12. SOLICITUDES HISTÓRICAS
--
-- Pedidos de la web anteriores a la app (o ya cumplidos): no son trabajo
-- pendiente, pero sí historial del cliente. Un nuevo estado de gestión,
-- 'historica', los distingue de 'pendiente' (bandeja) y 'descartada'
-- (rechazada a mano por el equipo), para que no aparezcan en la bandeja pero
-- sí en la ficha del cliente.
-- ============================================================================
alter table public.solicitudes_reserva drop constraint if exists solicitudes_reserva_estado_gestion_check;
alter table public.solicitudes_reserva add constraint solicitudes_reserva_estado_gestion_check
  check (estado_gestion in ('pendiente','convertida','descartada','historica'));
