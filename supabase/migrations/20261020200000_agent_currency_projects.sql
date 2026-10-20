-- Mantiene la validación del servidor alineada con las categorías disponibles
-- y conserva el origen/fecha de toda tasa propuesta por el agente.
alter table public.expenses
  add column if not exists exchange_rate_date date,
  add column if not exists exchange_rate_source text check (char_length(exchange_rate_source) between 1 and 120);

-- Los gastos confirmados son inmutables por trigger. El relleno de estas dos
-- columnas nuevas es técnico y se ejecuta dentro de esta misma transacción;
-- los triggers de usuario se reactivan antes de que la migración termine.
alter table public.expenses disable trigger user;

update public.expenses
set exchange_rate_date = expense_date,
    exchange_rate_source = case when currency = 'COP' then 'fixed_cop' else 'manual_legacy' end
where exchange_rate_date is null or exchange_rate_source is null;

alter table public.expenses enable trigger user;

alter table public.expenses
  alter column exchange_rate_date set not null,
  alter column exchange_rate_source set not null;

create or replace function public.assert_expense_immutable_after_confirmation() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.status = 'confirmed' then
    raise exception 'confirmed expenses are immutable; create a reversal instead';
  end if;

  if tg_op = 'UPDATE' and old.status = 'draft' and new.status = 'confirmed' then
    if not public.is_organization_member(new.organization_id) then
      raise exception 'only the company responsible can confirm';
    end if;
    if new.organization_id is distinct from old.organization_id
      or new.project_id is distinct from old.project_id
      or new.account_id is distinct from old.account_id
      or new.title is distinct from old.title
      or new.vendor is distinct from old.vendor
      or new.category is distinct from old.category
      or new.expense_date is distinct from old.expense_date
      or new.original_amount is distinct from old.original_amount
      or new.currency is distinct from old.currency
      or new.exchange_rate_to_cop is distinct from old.exchange_rate_to_cop
      or new.exchange_rate_date is distinct from old.exchange_rate_date
      or new.exchange_rate_source is distinct from old.exchange_rate_source
      or new.exchange_rate_reason is distinct from old.exchange_rate_reason
      or new.source is distinct from old.source
      or new.extraction_data is distinct from old.extraction_data
      or new.created_by is distinct from old.created_by
      or new.client_request_id is distinct from old.client_request_id then
      raise exception 'confirmation cannot edit draft fields';
    end if;
  end if;

  if new.category not in (
    'caja_menor','papeleria_oficina','transporte','materiales_insumos',
    'materiales_obra','mano_obra','maquinaria_equipo','subcontratos','seguridad_obra',
    'servicios','honorarios_contratistas_simulados','reembolsos','gastos_administrativos',
    'alimentacion_hogar','vivienda_servicios','salud_educacion','otros'
  ) then
    raise exception 'unsupported expense category';
  end if;
  return new;
end; $$;

-- Un proyecto con historia financiera se cierra, no se borra. Esta función se
-- ejecuta en la política RLS para que tampoco pueda eliminarse desde un cliente.
create or replace function public.project_is_empty(target_project uuid, target_organization uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.expenses
    where project_id = target_project and organization_id = target_organization
  ) and not exists (
    select 1 from public.project_budgets
    where project_id = target_project and organization_id = target_organization
  );
$$;

create policy "responsible deletes empty projects" on public.projects
for delete using (
  public.is_organization_member(organization_id)
  and public.project_is_empty(id, organization_id)
);

-- El navegador puede subir una captura, pero no puede afirmar que un archivo
-- fue extraído ni inyectar resultados. Esa transición queda reservada al worker.
create or replace function public.assert_capture_submission_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' then
    if new.organization_id is distinct from old.organization_id
      or new.created_by is distinct from old.created_by
      or new.source is distinct from old.source
      or new.original_filename is distinct from old.original_filename
      or new.mime_type is distinct from old.mime_type
      or new.byte_size is distinct from old.byte_size
      or new.extraction_data is distinct from old.extraction_data then
      raise exception 'capture identity and extraction data are immutable from client';
    end if;
    if new.status is distinct from old.status and new.status <> 'failed' then
      raise exception 'only the extraction worker can mark a capture as extracted';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists capture_submissions_client_guard on public.capture_submissions;
create trigger capture_submissions_client_guard
before update on public.capture_submissions
for each row execute function public.assert_capture_submission_update();
