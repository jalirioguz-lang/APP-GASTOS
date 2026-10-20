-- El piloto tiene una única persona responsable por empresa. Los roles históricos
-- se conservan solo como dato de compatibilidad, pero no habilitan capacidades distintas.

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
      or new.exchange_rate_reason is distinct from old.exchange_rate_reason
      or new.source is distinct from old.source
      or new.extraction_data is distinct from old.extraction_data
      or new.created_by is distinct from old.created_by
      or new.client_request_id is distinct from old.client_request_id then
      raise exception 'confirmation cannot edit draft fields';
    end if;
  end if;

  if new.category not in ('caja_menor','papeleria_oficina','transporte','materiales_insumos','servicios','honorarios_contratistas_simulados','reembolsos','gastos_administrativos') then
    raise exception 'unsupported pilot category';
  end if;
  return new;
end; $$;

create or replace function public.assert_reversal_scope() returns trigger language plpgsql security definer set search_path = public as $$
declare original public.expenses;
begin
  select * into original from public.expenses where id = new.original_expense_id;
  if original.id is null or original.organization_id <> new.organization_id or original.status <> 'confirmed' then
    raise exception 'reversal requires a confirmed expense in the same organization';
  end if;
  if not public.is_organization_member(new.organization_id) then
    raise exception 'only the company responsible can create a reversal';
  end if;
  return new;
end; $$;

drop policy if exists "authorized users read organizations" on public.organizations;
create policy "responsible reads own organization" on public.organizations for select using (public.is_organization_member(id));

drop policy if exists "authorized users read projects" on public.projects;
drop policy if exists "admins create projects" on public.projects;
drop policy if exists "admins update projects" on public.projects;
create policy "responsible reads projects" on public.projects for select using (public.is_organization_member(organization_id));
create policy "responsible creates projects" on public.projects for insert with check (public.is_organization_member(organization_id));
create policy "responsible updates projects" on public.projects for update using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));

drop policy if exists "authorized users read accounts" on public.financial_accounts;
drop policy if exists "admins create accounts" on public.financial_accounts;
drop policy if exists "admins update accounts" on public.financial_accounts;
create policy "responsible reads accounts" on public.financial_accounts for select using (public.is_organization_member(organization_id));
create policy "responsible creates accounts" on public.financial_accounts for insert with check (public.is_organization_member(organization_id));
create policy "responsible updates accounts" on public.financial_accounts for update using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));

drop policy if exists "authorized users read expenses" on public.expenses;
drop policy if exists "registrars create drafts" on public.expenses;
drop policy if exists "registrars update drafts" on public.expenses;
drop policy if exists "reviewers confirm drafts" on public.expenses;
create policy "responsible reads expenses" on public.expenses for select using (public.is_organization_member(organization_id));
create policy "responsible creates drafts" on public.expenses for insert with check (public.is_organization_member(organization_id) and created_by = auth.uid() and status = 'draft');
create policy "responsible updates own expenses" on public.expenses for update using (public.is_organization_member(organization_id) and created_by = auth.uid()) with check (public.is_organization_member(organization_id) and created_by = auth.uid());

drop policy if exists "registrars create attachment metadata" on public.expense_attachments;
create policy "responsible creates attachment metadata" on public.expense_attachments for insert with check (public.is_organization_member(organization_id) and created_by = auth.uid());
drop policy if exists "authorized users read audit events" on public.audit_events;
create policy "responsible reads audit events" on public.audit_events for select using (public.is_organization_member(organization_id));

drop policy if exists "admins create project budgets" on public.project_budgets;
drop policy if exists "admins update project budgets" on public.project_budgets;
drop policy if exists "admins delete project budgets" on public.project_budgets;
create policy "responsible creates project budgets" on public.project_budgets for insert with check (public.is_organization_member(organization_id) and created_by = auth.uid());
create policy "responsible updates project budgets" on public.project_budgets for update using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy "responsible deletes project budgets" on public.project_budgets for delete using (public.is_organization_member(organization_id));

drop policy if exists "central authorizer manages review grants" on public.organization_review_grants;
drop policy if exists "reviewers read own grants" on public.organization_review_grants;
drop policy if exists "central authorizer reads review grants" on public.organization_review_grants;
drop policy if exists "cross reviewers log access" on public.review_access_events;
drop policy if exists "central authorizer reads access log" on public.review_access_events;
drop policy if exists "reviewers create reversals" on public.expense_reversals;
drop policy if exists "authorized users read reversals" on public.expense_reversals;
create policy "responsible creates reversals" on public.expense_reversals for insert with check (created_by = auth.uid() and public.is_organization_member(organization_id));
create policy "responsible reads reversals" on public.expense_reversals for select using (public.is_organization_member(organization_id));

drop policy if exists "registrars create receipts" on storage.objects;
create policy "responsible creates receipts" on storage.objects for insert with check (bucket_id = 'expense-receipts' and public.is_organization_member(public.receipt_organization_id(name)));
