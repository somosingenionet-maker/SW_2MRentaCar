-- ============================================================================
-- 26. CONTRATOS FIRMADOS EN PANTALLA
--
-- El cliente firma con el dedo en el móvil o la tablet de la empresa. Se guarda
-- una COPIA CONGELADA de lo que firmó (datos del contrato + idioma), la imagen de
-- la firma y una huella SHA-256 de todo ello, para que el contrato firmado no
-- cambie aunque después se edite el cliente, el coche o la reserva.
--
--  · Una sola firma vigente por reserva. Para corregir un error se ANULA la firma
--    (solo admin) y se firma de nuevo; la anulada se conserva como prueba.
--  · Lo firmado no se puede modificar ni borrar: solo se puede anular. Lo impone
--    un disparador, no solo la aplicación.
--  · Quién registró la firma y la fecha de anulación las pone la base de datos.
--  · La fecha de firma la manda el navegador (entra en la huella) pero no puede
--    desviarse más de 10 minutos de la hora del servidor.
--  · Sin borrado en cascada: una reserva con contrato firmado no se puede borrar.
-- ============================================================================
create table if not exists public.contratos_firmados (
  id             text primary key,
  reserva_id     text not null references public.reservas(id) on delete restrict,
  idioma         text not null check (idioma in ('es', 'en')),
  contrato       jsonb not null,
  firma_png      text not null,
  huella         text not null check (huella ~ '^[0-9A-F]{64}$'),
  firmado_en     timestamptz not null,
  firmado_por    text,
  dispositivo    text,
  anulado_en     timestamptz,
  anulado_por    text,
  anulado_motivo text
);

create unique index if not exists contratos_firmados_vigente_idx
  on public.contratos_firmados (reserva_id) where anulado_en is null;
create index if not exists contratos_firmados_reserva_idx
  on public.contratos_firmados (reserva_id);

create or replace function public.contratos_firmados_guardia()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare quien text;
begin
  select nombre into quien from public.usuarios where id = auth.uid();
  if tg_op = 'INSERT' then
    if new.anulado_en is not null then
      raise exception 'Un contrato firmado no puede crearse ya anulado';
    end if;
    if abs(extract(epoch from (now() - new.firmado_en))) > 600 then
      raise exception 'La fecha de firma no coincide con la hora del servidor';
    end if;
    new.firmado_por := coalesce(quien, 'desconocido');
    return new;
  end if;

  -- UPDATE: lo firmado es inmutable; solo se puede anular, una vez.
  if old.anulado_en is not null then
    raise exception 'Este contrato ya está anulado';
  end if;
  if new.id is distinct from old.id or new.reserva_id is distinct from old.reserva_id
     or new.idioma is distinct from old.idioma or new.contrato is distinct from old.contrato
     or new.firma_png is distinct from old.firma_png or new.huella is distinct from old.huella
     or new.firmado_en is distinct from old.firmado_en or new.firmado_por is distinct from old.firmado_por
     or new.dispositivo is distinct from old.dispositivo then
    raise exception 'Un contrato firmado no se puede modificar, solo anular';
  end if;
  if new.anulado_en is null then
    return new;
  end if;
  new.anulado_en := now();
  new.anulado_por := coalesce(quien, 'desconocido');
  return new;
end;
$$;

drop trigger if exists contratos_firmados_guardia on public.contratos_firmados;
create trigger contratos_firmados_guardia
  before insert or update on public.contratos_firmados
  for each row execute function public.contratos_firmados_guardia();
revoke execute on function public.contratos_firmados_guardia() from public, anon, authenticated;

alter table public.contratos_firmados enable row level security;
drop policy if exists contratos_firmados_read on public.contratos_firmados;
drop policy if exists contratos_firmados_insert on public.contratos_firmados;
drop policy if exists contratos_firmados_anular on public.contratos_firmados;
create policy contratos_firmados_read on public.contratos_firmados
  for select to authenticated using ((select public.es_usuario_activo()));
create policy contratos_firmados_insert on public.contratos_firmados
  for insert to authenticated with check ((select public.es_usuario_activo()));
create policy contratos_firmados_anular on public.contratos_firmados
  for update to authenticated
  using ((select public.current_rol()) in ('admin', 'super_admin'))
  with check ((select public.current_rol()) in ('admin', 'super_admin'));
-- Sin política de borrado: nadie puede borrar un contrato firmado.
