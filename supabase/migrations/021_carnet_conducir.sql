-- ============================================================================
-- 23. CARNET DE CONDUCIR DEL CLIENTE
--
-- En un alquiler hay que identificar al conductor y comprobar que su permiso
-- está en vigor: número, fecha de expedición y fecha de vencimiento. Las fechas
-- se guardan como texto AAAA-MM-DD, igual que el resto de fechas de la app.
-- Todo es opcional: los clientes que ya existen no lo tienen todavía.
-- ============================================================================
alter table public.clientes
  add column if not exists carnet_numero text,
  add column if not exists carnet_expedicion text,
  add column if not exists carnet_vencimiento text;
