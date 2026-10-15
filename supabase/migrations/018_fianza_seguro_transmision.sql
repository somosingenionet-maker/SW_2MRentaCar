-- ============================================================================
-- 20. FIANZA, SEGURO AMPLIADO Y TRANSMISIÓN DEL VEHÍCULO
--
-- Datos que 2M gestiona por vehículo y que la app tenía fijos o no guardaba:
--  · transmision: 'manual' | 'automatico' (null = sin indicar).
--  · fianza: depósito que se deja al recoger el coche (€). 500 en turismos y
--    600 en comerciales. El contrato decía 150 € para todos.
--  · seguro_ampliado_dia: precio por día del seguro a todo riesgo. NULL = ese
--    vehículo no lo ofrece (las furgonetas no lo tienen).
-- La reserva guarda una copia de la fianza y del precio del seguro del día en
-- que se creó, para que el contrato firmado no cambie si luego se editan.
-- ============================================================================
alter table public.vehiculos
  add column if not exists transmision text check (transmision in ('manual','automatico')),
  add column if not exists fianza numeric(10,2) not null default 0 check (fianza >= 0),
  add column if not exists seguro_ampliado_dia numeric(10,2) check (seguro_ampliado_dia >= 0);

alter table public.reservas
  add column if not exists fianza numeric(10,2) check (fianza >= 0),
  add column if not exists seguro_dia numeric(10,2) check (seguro_dia >= 0);
