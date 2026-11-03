-- ============================================================================
-- 031. NÚMERO DE TARJETA DEL CLIENTE
--
-- 2M pidió guardar el número completo de la tarjeta (más la caducidad, que ya existe
-- en tarjeta_caducidad). El CVV NO se guarda nunca. El número se guarda solo con
-- dígitos. Las columnas tarjeta_titular, tarjeta_marca y tarjeta_ultimos4 de la
-- migración 030 se quedan sin uso (vacías): no se borran para no romper pantallas
-- que aún las envíen al guardar un cliente.
-- ============================================================================
alter table public.clientes
  add column if not exists tarjeta_numero text;
