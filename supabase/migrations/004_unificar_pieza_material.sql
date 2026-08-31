-- ============================================================================
-- 7. UNIFICAR 'pieza' Y 'material' EN UN ÚNICO TIPO 'producto'
--
-- Las líneas de las órdenes de trabajo (columna JSONB ordenes_trabajo.lineas)
-- distinguían 'pieza' de 'material' como dos tipos separados. Se unifican en
-- un solo tipo 'producto' (simplificación de interfaz; sin catálogo/stock).
-- Solo toca las filas que realmente tengan líneas con esos tipos antiguos.
-- ============================================================================

update public.ordenes_trabajo
set lineas = (
  select jsonb_agg(
    case when elem->>'tipo' in ('pieza', 'material')
      then jsonb_set(elem, '{tipo}', '"producto"')
      else elem
    end
  )
  from jsonb_array_elements(lineas) as elem
)
where lineas @> '[{"tipo":"pieza"}]'::jsonb
   or lineas @> '[{"tipo":"material"}]'::jsonb;
