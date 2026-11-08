-- ============================================================================
-- 034. MÉTODO DE PAGO DE LA RESERVA
--
-- Cómo paga el cliente el alquiler: efectivo, tarjeta o transferencia. Es opcional
-- (vacío = sin indicar): las reservas que ya existen no lo tienen.
-- ============================================================================
alter table public.reservas
  add column if not exists metodo_pago text;

alter table public.reservas
  drop constraint if exists reservas_metodo_pago_check;
alter table public.reservas
  add constraint reservas_metodo_pago_check check (metodo_pago is null or metodo_pago in ('efectivo', 'tarjeta', 'transferencia'));
