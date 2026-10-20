-- Piloto controlado: se aplica únicamente tras autorización expresa y gate de Storage saludable.
-- No crea identidades ni empresas; el alta se realiza administrativamente fuera de la app.
alter type public.member_role add value if not exists 'registrar';
alter type public.member_role add value if not exists 'reviewer';

create table public.organization_review_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  authorized_by uuid not null references auth.users(id),
  authorized_at timestamptz not null default now(),
  reason text not null check (char_length(reason) between 10 and 500),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (expires_at > starts_at),
  unique (organization_id, reviewer_id, expires_at)
);

-- Singleton provisioned only through a separately approved administrative process.
-- It deliberately starts without an identity: until populated, no cross-review grant can exist.
create table public.pilot_central_authorization (
  singleton boolean primary key default true check (singleton),
  central_authorizer_id uuid references auth.users(id),
  configured_at timestamptz,
  configured_by text,
  check ((central_authorizer_id is null and configured_at is null) or (central_authorizer_id is not null and configured_at is not null))
);
insert into public.pilot_central_authorization (singleton) values (true);

create table public.review_access_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  event_type text not null check (event_type in ('dashboard_view', 'report_view', 'csv_export', 'attachment_download')),
  created_at timestamptz not null default now()
);

create table public.expense_reversals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  original_expense_id uuid not null unique references public.expenses(id),
  reason text not null check (char_length(reason) between 10 and 500),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.pilot_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  reported_by uuid not null references auth.users(id),
  flow text not null check (char_length(flow) between 2 and 120),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  evidence_redacted text not null check (char_length(evidence_redacted) between 10 and 2000),
  status text not null default 'open' check (status in ('open', 'contained', 'resolved')),
  decision text,
  responsible text not null check (char_length(responsible) between 2 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger pilot_incidents_updated_at before update on public.pilot_incidents for each row execute function public.set_updated_at();

create or replace function public.is_organization_registrar(target_organization uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members where organization_id = target_organization and user_id = auth.uid() and role::text in ('member', 'registrar', 'admin', 'owner'));
$$;
create or replace function public.is_organization_reviewer(target_organization uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members where organization_id = target_organization and user_id = auth.uid() and role::text in ('viewer', 'reviewer', 'admin', 'owner'));
$$;
create or replace function public.has_active_review_grant(target_organization uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_review_grants where organization_id = target_organization and reviewer_id = auth.uid() and reviewer_id <> authorized_by and revoked_at is null and starts_at <= now() and expires_at > now());
$$;
create or replace function public.is_central_pilot_authorizer() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pilot_central_authorization where singleton and central_authorizer_id = auth.uid());
$$;
create or replace function public.can_read_organization(target_organization uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_organization_member(target_organization) or public.has_active_review_grant(target_organization);
$$;

create or replace function public.assert_reversal_scope() returns trigger language plpgsql security definer set search_path = public as $$
declare original public.expenses;
begin
  select * into original from public.expenses where id = new.original_expense_id;
  if original.id is null or original.organization_id <> new.organization_id or original.status <> 'confirmed' then raise exception 'reversal requires a confirmed expense in the same organization'; end if;
  if not public.is_organization_reviewer(new.organization_id) then raise exception 'only an administrator or reviewer can create a reversal'; end if;
  return new;
end; $$;
create trigger expense_reversals_scope_before_insert before insert on public.expense_reversals for each row execute function public.assert_reversal_scope();

create or replace function public.assert_review_grant_governance() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_central_pilot_authorizer() then raise exception 'cross-review grants require central authorization'; end if;
  if tg_op = 'INSERT' then
    if new.authorized_by <> auth.uid() or new.reviewer_id = auth.uid() then raise exception 'self-grants are forbidden'; end if;
    return new;
  end if;
  if new.organization_id <> old.organization_id or new.reviewer_id <> old.reviewer_id or new.authorized_by <> old.authorized_by or new.authorized_at <> old.authorized_at or new.reason <> old.reason or new.starts_at <> old.starts_at or new.expires_at <> old.expires_at then raise exception 'a grant cannot be renewed or expanded; create a new centrally authorized grant'; end if;
  if old.revoked_at is not null or new.revoked_at is null or new.revoked_by is distinct from auth.uid() then raise exception 'only central revocation is allowed'; end if;
  return new;
end; $$;
create trigger organization_review_grants_governance_before_write before insert or update on public.organization_review_grants for each row execute function public.assert_review_grant_governance();

create or replace function public.assert_expense_immutable_after_confirmation() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.status = 'confirmed' then raise exception 'confirmed expenses are immutable; create a reversal instead'; end if;
  if tg_op = 'UPDATE' and old.status = 'draft' and new.status = 'confirmed' then
    if not public.is_organization_reviewer(new.organization_id) then raise exception 'only an administrator or reviewer can confirm'; end if;
    if (to_jsonb(new) - 'status' - 'confirmed_at' - 'confirmed_by' - 'updated_at') <> (to_jsonb(old) - 'status' - 'confirmed_at' - 'confirmed_by' - 'updated_at') then raise exception 'confirmation cannot edit draft fields'; end if;
  end if;
  if new.category not in ('caja_menor','papeleria_oficina','transporte','materiales_insumos','servicios','honorarios_contratistas_simulados','reembolsos','gastos_administrativos') then raise exception 'unsupported pilot category'; end if;
  return new;
end; $$;
create trigger expenses_pilot_governance_before_write before insert or update on public.expenses for each row execute function public.assert_expense_immutable_after_confirmation();

alter table public.organization_review_grants enable row level security;
alter table public.pilot_central_authorization enable row level security;
alter table public.review_access_events enable row level security;
alter table public.expense_reversals enable row level security;
alter table public.pilot_incidents enable row level security;

drop policy if exists "users create organizations for themselves" on public.organizations;
drop policy if exists "members read their organizations" on public.organizations;
create policy "authorized users read organizations" on public.organizations for select using (public.can_read_organization(id));
drop policy if exists "members read projects" on public.projects;
create policy "authorized users read projects" on public.projects for select using (public.can_read_organization(organization_id));
drop policy if exists "members create projects" on public.projects;
create policy "admins create projects" on public.projects for insert with check (public.is_organization_admin(organization_id));
drop policy if exists "members read accounts" on public.financial_accounts;
create policy "authorized users read accounts" on public.financial_accounts for select using (public.can_read_organization(organization_id));
drop policy if exists "members create accounts" on public.financial_accounts;
create policy "admins create accounts" on public.financial_accounts for insert with check (public.is_organization_admin(organization_id));
drop policy if exists "members read expenses" on public.expenses;
create policy "authorized users read expenses" on public.expenses for select using (public.can_read_organization(organization_id));
drop policy if exists "members create own expenses" on public.expenses;
create policy "registrars create drafts" on public.expenses for insert with check (public.is_organization_registrar(organization_id) and created_by = auth.uid() and status = 'draft');
drop policy if exists "members update expenses" on public.expenses;
create policy "registrars update drafts" on public.expenses for update using (public.is_organization_registrar(organization_id) and status = 'draft') with check (public.is_organization_registrar(organization_id));
create policy "reviewers confirm drafts" on public.expenses for update using (public.is_organization_reviewer(organization_id) and status = 'draft') with check (public.is_organization_reviewer(organization_id));
drop policy if exists "admins delete expenses" on public.expenses;
drop policy if exists "members read attachment metadata" on public.expense_attachments;
create policy "members read attachment metadata" on public.expense_attachments for select using (public.is_organization_member(organization_id));
drop policy if exists "members create attachment metadata" on public.expense_attachments;
create policy "registrars create attachment metadata" on public.expense_attachments for insert with check (public.is_organization_registrar(organization_id) and created_by = auth.uid());
drop policy if exists "members read audit events" on public.audit_events;
create policy "authorized users read audit events" on public.audit_events for select using (public.can_read_organization(organization_id));

create policy "central authorizer manages review grants" on public.organization_review_grants for all using (public.is_central_pilot_authorizer()) with check (public.is_central_pilot_authorizer());
create policy "reviewers read own grants" on public.organization_review_grants for select using (reviewer_id = auth.uid());
create policy "central authorizer reads review grants" on public.organization_review_grants for select using (public.is_central_pilot_authorizer());
create policy "cross reviewers log access" on public.review_access_events for insert with check (actor_id = auth.uid() and public.has_active_review_grant(organization_id));
create policy "central authorizer reads access log" on public.review_access_events for select using (public.is_central_pilot_authorizer());
create policy "reviewers create reversals" on public.expense_reversals for insert with check (created_by = auth.uid() and public.is_organization_reviewer(organization_id));
create policy "authorized users read reversals" on public.expense_reversals for select using (public.can_read_organization(organization_id));
create policy "members report incidents" on public.pilot_incidents for insert with check (reported_by = auth.uid() and (organization_id is null or public.is_organization_member(organization_id)));
create policy "direct reviewers read incidents" on public.pilot_incidents for select using (organization_id is null or public.is_organization_reviewer(organization_id));
create policy "admins update incidents" on public.pilot_incidents for update using (organization_id is null or public.is_organization_admin(organization_id)) with check (organization_id is null or public.is_organization_admin(organization_id));

drop policy if exists "members read receipt objects in their organization" on storage.objects;
drop policy if exists "members create receipt objects in their organization" on storage.objects;
drop policy if exists "admins manage receipt objects in their organization" on storage.objects;
drop policy if exists "admins delete receipt objects in their organization" on storage.objects;
create policy "members read receipts" on storage.objects for select using (bucket_id = 'expense-receipts' and public.is_organization_member(public.receipt_organization_id(name)));
create policy "registrars create receipts" on storage.objects for insert with check (bucket_id = 'expense-receipts' and public.is_organization_registrar(public.receipt_organization_id(name)));
