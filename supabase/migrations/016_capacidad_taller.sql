-- ============================================================================
-- 18. CAPACIDAD DEL TALLER
--
-- Número máximo de vehículos que caben a la vez en el taller. La Agenda lo usa
-- para mostrar cuántos hay dentro y avisar al acercarse al límite o al pasarlo.
-- 0 = sin límite definido (la Agenda solo muestra el recuento).
-- ============================================================================
alter table public.empresa_config
  add column if not exists capacidad_taller integer not null default 0 check (capacidad_taller >= 0);
