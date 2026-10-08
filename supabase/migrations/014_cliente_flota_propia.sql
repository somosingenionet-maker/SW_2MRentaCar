-- ============================================================================
-- 16. CLIENTE INTERNO "FLOTA PROPIA"
--
-- Las órdenes de trabajo de los coches de la propia flota de alquiler no tienen
-- un cliente al que cobrar: la app les asigna el cliente virtual 'flota-propia'.
-- Ese cliente no existía en la tabla, así que la restricción
-- ordenes_trabajo_cliente_id_fkey rechazaba cada una de esas órdenes y NO se
-- guardaban (la pantalla las mostraba, pero desaparecían al recargar).
--
-- Se crea la fila. La app la oculta del CRM, de los contadores y de los
-- selectores (ver sinClienteFlota en src/utils/flota.ts).
-- ============================================================================
insert into public.clientes (id, nombre, apellidos, pais, es_cliente_alquiler, fecha_registro)
values ('flota-propia', 'Flota propia', '(interno)', 'España', false, current_date)
on conflict (id) do nothing;
