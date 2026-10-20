-- Base multiempresa. Todas las tablas de negocio exigen organization_id y RLS.
create extension if not exists pgcrypto;

create type public.member_role as enum ('owner', 'admin', 'member', 'viewer');
create type public.expense_status as enum ('draft', 'confirmed');
create type public.expense_source as enum ('manual', 'receipt_image', 'receipt_pdf', 'audio', 'email', 'message');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 120),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  base_currency text not null default 'COP' check (base_currency in ('COP', 'USD', 'EUR')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  account_type text not null check (account_type in ('bank', 'petty_cash', 'cash', 'other')),
  currency text not null check (currency in ('COP', 'USD', 'EUR')),
  opening_balance numeric(18,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id),
  account_id uuid references public.financial_accounts(id),
  title text not null check (char_length(title) between 1 and 200),
  vendor text,
  category text not null check (char_length(category) between 1 and 80),
  expense_date date not null,
  original_amount numeric(18,2) not null check (original_amount > 0),
  currency text not null check (currency in ('COP', 'USD', 'EUR')),
  exchange_rate_to_cop numeric(18,6) not null default 1 check (exchange_rate_to_cop > 0),
  amount_cop numeric(18,2) generated always as (round(original_amount * exchange_rate_to_cop, 2)) stored,
  exchange_rate_reason text,
  status public.expense_status not null default 'draft',
  source public.expense_source not null default 'manual',
  extraction_data jsonb,
  created_by uuid not null references auth.users(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((currency = 'COP' and exchange_rate_to_cop = 1) or (currency <> 'COP' and exchange_rate_reason is not null)),
  check ((status = 'confirmed' and confirmed_at is not null) or status = 'draft')
);

create table public.expense_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  expense_id uuid not null references public.expenses(id) on delete cascade,
  bucket_path text not null unique,
  original_filename text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  byte_size integer not null check (byte_size > 0 and byte_size <= 5000000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index expenses_organization_date_idx on public.expenses(organization_id, expense_date desc);
create index audit_events_organization_created_idx on public.audit_events(organization_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger expenses_updated_at before update on public.expenses for each row execute function public.set_updated_at();

create or replace function public.create_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), new.raw_user_meta_data ->> 'phone');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile();

create or replace function public.add_organization_owner() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.organization_members (organization_id, user_id, role) values (new.id, new.created_by, 'owner');
  return new;
end; $$;
create trigger organization_owner_after_insert after insert on public.organizations for each row execute function public.add_organization_owner();

create or replace function public.assert_expense_scope() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and (new.organization_id <> old.organization_id or new.created_by <> old.created_by) then
    raise exception 'organization_id and created_by cannot be reassigned';
  end if;
  if new.project_id is not null and not exists (
    select 1 from public.projects where id = new.project_id and organization_id = new.organization_id
  ) then raise exception 'project must belong to the expense organization'; end if;
  if new.account_id is not null and not exists (
    select 1 from public.financial_accounts where id = new.account_id and organization_id = new.organization_id
  ) then raise exception 'account must belong to the expense organization'; end if;
  return new;
end; $$;
create trigger expenses_scope_before_write before insert or update on public.expenses for each row execute function public.assert_expense_scope();

create or replace function public.audit_expense_change() returns trigger language plpgsql security definer set search_path = public as $$
declare
  changed record;
begin
  if tg_op = 'DELETE' then changed := old; else changed := new; end if;
  insert into public.audit_events (organization_id, actor_id, entity_type, entity_id, action, before_data, after_data)
  values (
    changed.organization_id, auth.uid(), 'expense', changed.id, lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return changed;
end; $$;
create trigger expenses_audit_after_write after insert or update or delete on public.expenses for each row execute function public.audit_expense_change();

create or replace function public.is_organization_member(target_organization uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members where organization_id = target_organization and user_id = auth.uid());
$$;
create or replace function public.is_organization_admin(target_organization uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members where organization_id = target_organization and user_id = auth.uid() and role in ('owner', 'admin'));
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.financial_accounts enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_attachments enable row level security;
alter table public.audit_events enable row level security;

create policy "profile is private to owner" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "members read their organizations" on public.organizations for select using (public.is_organization_member(id));
create policy "users create organizations for themselves" on public.organizations for insert with check (created_by = auth.uid());
create policy "admins update organizations" on public.organizations for update using (public.is_organization_admin(id)) with check (public.is_organization_admin(id));
create policy "members see their membership" on public.organization_members for select using (user_id = auth.uid() or public.is_organization_admin(organization_id));
create policy "admins manage memberships" on public.organization_members for all using (public.is_organization_admin(organization_id)) with check (public.is_organization_admin(organization_id));
create policy "members read projects" on public.projects for select using (public.is_organization_member(organization_id));
create policy "members create projects" on public.projects for insert with check (public.is_organization_member(organization_id));
create policy "admins update projects" on public.projects for update using (public.is_organization_admin(organization_id)) with check (public.is_organization_admin(organization_id));
create policy "members read accounts" on public.financial_accounts for select using (public.is_organization_member(organization_id));
create policy "members create accounts" on public.financial_accounts for insert with check (public.is_organization_member(organization_id));
create policy "admins update accounts" on public.financial_accounts for update using (public.is_organization_admin(organization_id)) with check (public.is_organization_admin(organization_id));
create policy "members read expenses" on public.expenses for select using (public.is_organization_member(organization_id));
create policy "members create own expenses" on public.expenses for insert with check (public.is_organization_member(organization_id) and created_by = auth.uid());
create policy "members update expenses" on public.expenses for update using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy "admins delete expenses" on public.expenses for delete using (public.is_organization_admin(organization_id));
create policy "members read attachment metadata" on public.expense_attachments for select using (public.is_organization_member(organization_id));
create policy "members create attachment metadata" on public.expense_attachments for insert with check (public.is_organization_member(organization_id) and created_by = auth.uid());
create policy "members read audit events" on public.audit_events for select using (public.is_organization_member(organization_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('expense-receipts', 'expense-receipts', false, 5000000, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
create policy "members access only their receipt folder" on storage.objects for all using (
  bucket_id = 'expense-receipts' and public.is_organization_member(((storage.foldername(name))[1])::uuid)
) with check (
  bucket_id = 'expense-receipts' and public.is_organization_member(((storage.foldername(name))[1])::uuid)
);
