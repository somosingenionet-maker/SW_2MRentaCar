-- ============================================================================
-- 14. LIMPIEZA DE RESTOS SIN USO
--
-- · `intervenciones`: tabla heredada del primer modelo del taller. La app solo
--   la escribía (nunca la mostraba) y el único registro que creaba era una
--   intervención inventada de 190 € al renovar un mantenimiento. El taller
--   trabaja con ordenes_trabajo.
-- · `albaran_id` en facturas y ordenes_trabajo: el concepto de albarán no
--   existe en la app.
-- Se comprobó que estaban vacías antes de eliminarlas.
-- ============================================================================
drop table if exists public.intervenciones;
alter table public.facturas drop column if exists albaran_id;
alter table public.ordenes_trabajo drop column if exists albaran_id;
