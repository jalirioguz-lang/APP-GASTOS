-- Los subproyectos permiten clasificar un gasto dentro de un proyecto sin
-- duplicar proyectos ni perder el histórico de cada frente, etapa o destino.
create table public.subprojects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create index subprojects_organization_project_idx on public.subprojects(organization_id, project_id);

alter table public.expenses
  add column if not exists subproject_id uuid references public.subprojects(id) on delete restrict;

create index expenses_organization_project_subproject_idx
  on public.expenses(organization_id, project_id, subproject_id);

alter table public.subprojects enable row level security;

create policy "responsible reads subprojects" on public.subprojects
for select using (public.is_organization_member(organization_id));
create policy "responsible creates subprojects" on public.subprojects
for insert with check (public.is_organization_member(organization_id));
create policy "responsible updates subprojects" on public.subprojects
for update using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

create or replace function public.assert_subproject_scope() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and (new.organization_id <> old.organization_id or new.project_id <> old.project_id) then
    raise exception 'organization_id and project_id cannot be reassigned';
  end if;
  if not exists (
    select 1 from public.projects
    where id = new.project_id and organization_id = new.organization_id
  ) then
    raise exception 'project must belong to the subproject organization';
  end if;
  return new;
end; $$;

create trigger subprojects_scope_before_write
before insert or update on public.subprojects
for each row execute function public.assert_subproject_scope();

-- La pareja proyecto/subproyecto se valida en la base: una petición manipulada
-- no puede enlazar gastos de organizaciones o proyectos distintos.
create or replace function public.assert_expense_scope() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and (new.organization_id <> old.organization_id or new.created_by <> old.created_by) then
    raise exception 'organization_id and created_by cannot be reassigned';
  end if;
  if new.project_id is not null and not exists (
    select 1 from public.projects where id = new.project_id and organization_id = new.organization_id
  ) then raise exception 'project must belong to the expense organization'; end if;
  if new.subproject_id is not null and (
    new.project_id is null or not exists (
      select 1 from public.subprojects
      where id = new.subproject_id and project_id = new.project_id and organization_id = new.organization_id
    )
  ) then raise exception 'subproject must belong to the selected project and organization'; end if;
  if new.account_id is not null and not exists (
    select 1 from public.financial_accounts where id = new.account_id and organization_id = new.organization_id
  ) then raise exception 'account must belong to the expense organization'; end if;
  return new;
end; $$;

-- La confirmación no es una oportunidad para cambiar la clasificación del
-- gasto: esta debe revisarse mientras sigue como borrador.
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
      or new.subproject_id is distinct from old.subproject_id
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
