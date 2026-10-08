-- ============================================================================
-- 19. NÚMEROS DE FACTURA Y DE OT ÚNICOS
--
-- La app numeraba con "cantidad + 1", lo que repetía un número ya usado al
-- borrar un registro (una factura duplicada es un problema legal). Ahora la app
-- usa "mayor + 1" y la base de datos rechaza cualquier número repetido.
-- ============================================================================
create unique index if not exists facturas_numero_unico on public.facturas (numero);
create unique index if not exists ordenes_trabajo_numero_unico on public.ordenes_trabajo (numero);
