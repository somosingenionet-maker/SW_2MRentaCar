-- ============================================================================
-- 043. AMPLIACIÓN DE UN ALQUILER: LO INICIAL Y LOS EXTRAS, POR SEPARADO
--
-- `reservas.ampliacion` guarda, cuando un alquiler se amplía, lo que valía al principio (días y total) y cada ampliación
-- (días adicionales, su importe y la nueva fecha de devolución). La ficha y el contrato lo enseñan como «Reserva inicial» y
-- «Extras: N días adicionales», y el total es la suma. Vacío = el alquiler nunca se amplió.
-- ============================================================================
alter table public.reservas add column if not exists ampliacion jsonb;
