-- Presupuestos por proyecto: se comparan contra gastos confirmados, nunca contra borradores.
create table public.project_budgets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  amount_cop numeric(18,2) not null check (amount_cop > 0 and trunc(amount_cop) = amount_cop),
  effective_from date not null,
  effective_to date,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from),
  unique (project_id, effective_from)
);

create index project_budgets_organization_period_idx on public.project_budgets(organization_id, effective_from desc);
create trigger project_budgets_updated_at before update on public.project_budgets for each row execute function public.set_updated_at();

create or replace function public.assert_project_budget_scope() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and (new.organization_id <> old.organization_id or new.project_id <> old.project_id or new.created_by <> old.created_by) then
    raise exception 'organization_id, project_id and created_by cannot be reassigned';
  end if;
  if not exists (select 1 from public.projects where id = new.project_id and organization_id = new.organization_id) then
    raise exception 'project must belong to the budget organization';
  end if;
  return new;
end; $$;
create trigger project_budgets_scope_before_write before insert or update on public.project_budgets for each row execute function public.assert_project_budget_scope();

alter table public.project_budgets enable row level security;
create policy "members read project budgets" on public.project_budgets for select using (public.is_organization_member(organization_id));
create policy "admins create project budgets" on public.project_budgets for insert with check (public.is_organization_admin(organization_id) and created_by = auth.uid());
create policy "admins update project budgets" on public.project_budgets for update using (public.is_organization_admin(organization_id)) with check (public.is_organization_admin(organization_id));
create policy "admins delete project budgets" on public.project_budgets for delete using (public.is_organization_admin(organization_id));
