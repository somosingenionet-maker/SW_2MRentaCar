-- ============================================================================
-- 030. TARJETA DEL CLIENTE (solo referencia)
--
-- Para saber con qué tarjeta se dejó la fianza: titular, marca, ÚLTIMOS 4 dígitos
-- y caducidad (MM/AA). Nunca se guarda el número completo ni el CVV: guardarlos
-- en esta base de datos expondría al cliente y a la empresa. Todo es opcional.
-- ============================================================================
alter table public.clientes
  add column if not exists tarjeta_titular text,
  add column if not exists tarjeta_marca text,
  add column if not exists tarjeta_ultimos4 text,
  add column if not exists tarjeta_caducidad text;
