-- ============================================================================
-- 22. ASEGURADORA DEL VEHÍCULO
--
-- 2M indica la compañía de cada póliza (Mutua, FIATC…). Es texto libre: sirve
-- para saber a quién llamar en un siniestro y se imprime en el contrato.
-- No lleva restricción: algunos coches figuran como "Mutua (actualmente de
-- baja)" y esa nota se conserva tal cual la dio el cliente.
-- ============================================================================
alter table public.vehiculos
  add column if not exists aseguradora text;
