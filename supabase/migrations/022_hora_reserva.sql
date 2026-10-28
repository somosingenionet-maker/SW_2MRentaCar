-- ============================================================================
-- 24. HORA DE ENTREGA Y DE DEVOLUCIÓN DE LA RESERVA
--
-- La reserva solo guardaba fechas. El equipo necesita saber a qué hora entrega
-- el coche al cliente y a qué hora lo recibe de vuelta (y el contrato habla de
-- «más de 59 minutos de retraso»). Hora local de la oficina, formato HH:mm.
-- Opcionales en la base de datos: las reservas anteriores no la tienen; la
-- aplicación la exige en las reservas nuevas.
-- ============================================================================
alter table public.reservas
  add column if not exists hora_inicio text,
  add column if not exists hora_fin text;
