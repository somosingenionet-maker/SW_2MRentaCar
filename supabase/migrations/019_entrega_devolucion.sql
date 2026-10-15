-- ============================================================================
-- 21. ENTREGA Y DEVOLUCIÓN DEL VEHÍCULO ALQUILADO
--
-- Registro de cada movimiento del coche: fecha y hora, kilometraje, nivel de
-- combustible, daños anotados y quién lo hizo. Es la prueba en caso de
-- disputa. Forma de cada columna (JSON):
--   { fechaHora, km, combustible, danos, responsable }
-- La reserva pasa a "en curso" al entregar y a "finalizada" al devolver.
-- ============================================================================
alter table public.reservas
  add column if not exists entrega jsonb,
  add column if not exists devolucion jsonb;
