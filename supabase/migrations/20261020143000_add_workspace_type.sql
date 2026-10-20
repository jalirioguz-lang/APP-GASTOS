-- El mismo producto sirve para empresa, hogar o uso personal. El tipo solo
-- adapta el lenguaje y la guía inicial; no altera el aislamiento por organización.
alter table public.organizations
  add column workspace_type text not null default 'business'
  check (workspace_type in ('business', 'household', 'personal'));
