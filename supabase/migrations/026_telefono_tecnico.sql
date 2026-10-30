-- ============================================================================
-- 28. TELÉFONO DEL TÉCNICO
--
-- Opcional. Sirve para abrir WhatsApp directamente con el mecánico al avisarle de
-- un coche asignado y al mandarle su enlace del taller.
-- ============================================================================
alter table public.tecnicos add column if not exists telefono text;
