-- ============================================================================
-- 038. CAMBIO DE ACEITE EN LA FICHA DEL VEHÍCULO
--
-- Tres datos opcionales en «Fechas de control»: cuándo se hizo el último cambio de aceite, con cuántos
-- kilómetros y cuándo toca el próximo. Fechas como texto AAAA-MM-DD (igual que ITV, seguro e impuesto).
-- ============================================================================
alter table public.vehiculos
  add column if not exists aceite_fecha text,
  add column if not exists aceite_km integer check (aceite_km is null or aceite_km >= 0),
  add column if not exists aceite_proxima_fecha text;
