-- Bandeja de captura para comprobantes recibidos antes de su extracción a gasto.
create table public.capture_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  source text not null check (source in ('photo', 'pdf', 'voice', 'email')),
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'application/pdf', 'audio/mpeg', 'audio/mp4', 'audio/webm')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 5000000),
  storage_path text,
  status text not null default 'pending_extraction' check (status in ('pending_extraction', 'extracted', 'failed')),
  extraction_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index capture_submissions_organization_created_idx on public.capture_submissions(organization_id, created_at desc);
create trigger capture_submissions_updated_at before update on public.capture_submissions for each row execute function public.set_updated_at();
alter table public.capture_submissions enable row level security;
create policy "responsible reads capture submissions" on public.capture_submissions for select using (public.is_organization_member(organization_id));
create policy "responsible creates capture submissions" on public.capture_submissions for insert with check (public.is_organization_member(organization_id) and created_by = auth.uid());
create policy "responsible updates own capture submissions" on public.capture_submissions for update using (public.is_organization_member(organization_id) and created_by = auth.uid()) with check (public.is_organization_member(organization_id) and created_by = auth.uid());
