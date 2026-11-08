-- ============================================================================
-- 033. SEGUNDO CONDUCTOR DEL CLIENTE
--
-- Un cliente de alquiler puede añadir un segundo conductor: nombre, documento
-- (DNI/NIE/pasaporte) y número del permiso de conducir. Se guarda como un objeto
-- {nombre, dni, permiso}; vacío (null) = sin segundo conductor.
-- ============================================================================
alter table public.clientes
  add column if not exists segundo_conductor jsonb;
