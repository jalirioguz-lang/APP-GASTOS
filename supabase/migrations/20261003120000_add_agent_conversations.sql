-- Conversaciones y ejecuciones del agente. El cliente solamente puede crear y leer
-- sus propios recursos; el worker de confianza reclama trabajos mediante RPC.
create type public.conversation_status as enum ('active', 'archived');
create type public.agent_run_status as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');
create type public.agent_message_role as enum ('user', 'assistant', 'system');

create table public.agent_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null default 'Nueva conversación' check (char_length(title) between 1 and 160),
  codex_session_id text unique,
  status public.conversation_status not null default 'active',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.agent_conversations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role public.agent_message_role not null,
  body text not null check (char_length(body) between 1 and 12000),
  attachment_path text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.agent_conversations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  status public.agent_run_status not null default 'queued',
  attempt_count integer not null default 0 check (attempt_count >= 0 and attempt_count <= 3),
  input_message_id uuid not null references public.agent_messages(id) on delete cascade,
  result_message_id uuid references public.agent_messages(id),
  error_code text,
  claimed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('expense_registered', 'agent_complete', 'agent_failed')),
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 500),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index agent_conversations_organization_updated_idx on public.agent_conversations(organization_id, updated_at desc);
create index agent_messages_conversation_created_idx on public.agent_messages(conversation_id, created_at);
create index agent_runs_queue_idx on public.agent_runs(status, created_at) where status = 'queued';
create index user_notifications_user_created_idx on public.user_notifications(user_id, created_at desc);

create trigger agent_conversations_updated_at before update on public.agent_conversations for each row execute function public.set_updated_at();
create trigger agent_runs_updated_at before update on public.agent_runs for each row execute function public.set_updated_at();

create or replace function public.assert_agent_conversation_scope() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and (new.organization_id <> old.organization_id or new.created_by <> old.created_by) then
    raise exception 'organization_id and created_by cannot be reassigned';
  end if;
  return new;
end; $$;
create trigger agent_conversations_scope_before_write before insert or update on public.agent_conversations for each row execute function public.assert_agent_conversation_scope();

create or replace function public.assert_agent_message_scope() returns trigger language plpgsql as $$
declare conversation_org uuid;
begin
  select organization_id into conversation_org from public.agent_conversations where id = new.conversation_id;
  if conversation_org is null or conversation_org <> new.organization_id then
    raise exception 'message must belong to the conversation organization';
  end if;
  return new;
end; $$;
create trigger agent_messages_scope_before_write before insert or update on public.agent_messages for each row execute function public.assert_agent_message_scope();

create or replace function public.assert_agent_run_scope() returns trigger language plpgsql as $$
declare conversation_org uuid;
declare message_conversation uuid;
begin
  select organization_id into conversation_org from public.agent_conversations where id = new.conversation_id;
  select conversation_id into message_conversation from public.agent_messages where id = new.input_message_id;
  if conversation_org is null or conversation_org <> new.organization_id or message_conversation <> new.conversation_id then
    raise exception 'run must match its conversation and input message';
  end if;
  return new;
end; $$;
create trigger agent_runs_scope_before_write before insert or update on public.agent_runs for each row execute function public.assert_agent_run_scope();

alter table public.agent_conversations enable row level security;
alter table public.agent_messages enable row level security;
alter table public.agent_runs enable row level security;
alter table public.user_notifications enable row level security;

create policy "members read agent conversations" on public.agent_conversations for select using (public.is_organization_member(organization_id));
create policy "members create own agent conversations" on public.agent_conversations for insert with check (public.is_organization_member(organization_id) and created_by = auth.uid());
create policy "owners archive agent conversations" on public.agent_conversations for update using (created_by = auth.uid()) with check (public.is_organization_member(organization_id));
create policy "members read agent messages" on public.agent_messages for select using (public.is_organization_member(organization_id));
create policy "members create own user messages" on public.agent_messages for insert with check (public.is_organization_member(organization_id) and role = 'user' and created_by = auth.uid());
create policy "members read agent runs" on public.agent_runs for select using (public.is_organization_member(organization_id));
create policy "members queue own agent runs" on public.agent_runs for insert with check (public.is_organization_member(organization_id) and requested_by = auth.uid() and status = 'queued');
create policy "users read their notifications" on public.user_notifications for select using (user_id = auth.uid());
create policy "users mark their notifications read" on public.user_notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Los hilos son privados por defecto. Un espacio colaborativo requerirá una tabla
-- explícita de participantes; pertenecer a la empresa no concede acceso al hilo.
drop policy "members read agent conversations" on public.agent_conversations;
drop policy "members create own agent conversations" on public.agent_conversations;
drop policy "owners archive agent conversations" on public.agent_conversations;
drop policy "members read agent messages" on public.agent_messages;
drop policy "members create own user messages" on public.agent_messages;
drop policy "members read agent runs" on public.agent_runs;
drop policy "members queue own agent runs" on public.agent_runs;
create policy "owners read private agent conversations" on public.agent_conversations for select using (created_by = auth.uid());
create policy "users create own private agent conversations" on public.agent_conversations for insert with check (created_by = auth.uid() and public.is_organization_member(organization_id));
create policy "owners update private agent conversations" on public.agent_conversations for update using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "owners read private agent messages" on public.agent_messages for select using (exists (select 1 from public.agent_conversations c where c.id = conversation_id and c.created_by = auth.uid()));
create policy "owners create private user messages" on public.agent_messages for insert with check (role = 'user' and created_by = auth.uid() and exists (select 1 from public.agent_conversations c where c.id = conversation_id and c.created_by = auth.uid() and c.organization_id = agent_messages.organization_id));
create policy "owners read private agent runs" on public.agent_runs for select using (requested_by = auth.uid());
create policy "owners queue private agent runs" on public.agent_runs for insert with check (requested_by = auth.uid() and exists (select 1 from public.agent_conversations c where c.id = conversation_id and c.created_by = auth.uid() and c.organization_id = agent_runs.organization_id));

create or replace function public.assert_agent_conversation_scope() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and (new.organization_id <> old.organization_id or new.created_by <> old.created_by) then
    raise exception 'organization_id and created_by cannot be reassigned';
  end if;
  if auth.role() <> 'service_role' and (
    new.codex_session_id is not null or
    (tg_op = 'UPDATE' and new.codex_session_id is distinct from old.codex_session_id)
  ) then raise exception 'codex session may only be assigned by the worker'; end if;
  return new;
end; $$;

create or replace function public.assert_agent_message_scope() returns trigger language plpgsql as $$
declare conversation_org uuid;
declare conversation_owner uuid;
begin
  select organization_id, created_by into conversation_org, conversation_owner from public.agent_conversations where id = new.conversation_id;
  if conversation_org is null or conversation_org <> new.organization_id then raise exception 'message must belong to the conversation organization'; end if;
  if auth.role() <> 'service_role' and (conversation_owner <> auth.uid() or new.role <> 'user' or new.created_by <> auth.uid()) then
    raise exception 'only the conversation owner may add a user message';
  end if;
  return new;
end; $$;

create or replace function public.assert_agent_run_scope() returns trigger language plpgsql as $$
declare conversation_org uuid;
declare conversation_owner uuid;
declare message_conversation uuid;
declare message_owner uuid;
declare message_role public.agent_message_role;
begin
  select organization_id, created_by into conversation_org, conversation_owner from public.agent_conversations where id = new.conversation_id;
  select conversation_id, created_by, role into message_conversation, message_owner, message_role from public.agent_messages where id = new.input_message_id;
  if conversation_org is null or conversation_org <> new.organization_id or message_conversation <> new.conversation_id then raise exception 'run must match its conversation and input message'; end if;
  if auth.role() <> 'service_role' and (conversation_owner <> auth.uid() or message_owner <> auth.uid() or message_role <> 'user' or new.requested_by <> auth.uid()) then
    raise exception 'only the owner may queue their own user message';
  end if;
  return new;
end; $$;

create or replace function public.assert_notification_update() returns trigger language plpgsql as $$
begin
  if auth.role() <> 'service_role' and (
    new.organization_id <> old.organization_id or new.user_id <> old.user_id or new.kind <> old.kind or new.title <> old.title or new.body <> old.body
  ) then raise exception 'only read_at may be changed'; end if;
  return new;
end; $$;
create trigger user_notifications_integrity_before_update before update on public.user_notifications for each row execute function public.assert_notification_update();

create unique index agent_runs_one_active_per_conversation_idx on public.agent_runs(conversation_id) where status in ('queued', 'running');

-- Solo el service role puede ejecutar esta función. Evita que sesiones de usuario
-- reclamen, completen o inspeccionen trabajos de otras empresas.
create or replace function public.claim_agent_run()
returns public.agent_runs
language plpgsql security definer set search_path = public as $$
declare next_run public.agent_runs;
begin
  select * into next_run from public.agent_runs
  where status = 'queued'
  order by created_at
  for update skip locked
  limit 1;
  if next_run.id is null then return null; end if;
  update public.agent_runs set status = 'running', claimed_at = now(), attempt_count = attempt_count + 1 where id = next_run.id returning * into next_run;
  return next_run;
end; $$;
revoke all on function public.claim_agent_run() from public;
grant execute on function public.claim_agent_run() to service_role;
