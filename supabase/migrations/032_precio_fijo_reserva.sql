-- ============================================================================
-- 032. PRECIO CERRADO DE UNA RESERVA
--
-- Algunos alquileres se pactan a un precio total fijo (no días × tarifa). Es el precio
-- del ALQUILER; el seguro y los complementos se suman aparte como siempre. Vacío = la
-- reserva se calcula por días × tarifa, como hasta ahora.
-- ============================================================================
alter table public.reservas
  add column if not exists precio_fijo numeric;
