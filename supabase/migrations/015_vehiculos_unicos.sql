-- ============================================================================
-- 17. MATRÍCULA Y BASTIDOR ÚNICOS
--
-- La base de datos aceptaba dos vehículos con la misma matrícula y el mismo
-- bastidor. Se compara ignorando mayúsculas, espacios y guiones, igual que lo
-- hace la app (src/utils/vehiculoDuplicado.ts), que además avisa antes de
-- guardar con un mensaje claro. El bastidor vacío no cuenta.
-- ============================================================================
create unique index if not exists vehiculos_matricula_unica
  on public.vehiculos ((regexp_replace(upper(matricula), '[^A-Z0-9]', '', 'g')));

create unique index if not exists vehiculos_bastidor_unico
  on public.vehiculos ((regexp_replace(upper(bastidor), '[^A-Z0-9]', '', 'g')))
  where regexp_replace(upper(bastidor), '[^A-Z0-9]', '', 'g') <> '';
