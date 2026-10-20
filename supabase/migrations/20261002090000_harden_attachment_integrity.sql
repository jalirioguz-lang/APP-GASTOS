-- Evita que un comprobante se vincule a un gasto de otra empresa y exige la ruta privada acordada.
create or replace function public.assert_attachment_scope() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (new.organization_id <> old.organization_id or new.expense_id <> old.expense_id or new.created_by <> old.created_by) then
    raise exception 'organization_id, expense_id and created_by cannot be reassigned';
  end if;
  if not exists (
    select 1 from public.expenses
    where id = new.expense_id and organization_id = new.organization_id
  ) then
    raise exception 'expense must belong to the attachment organization';
  end if;
  if new.bucket_path !~ ('^' || new.organization_id::text || '/' || new.expense_id::text || '/[^/]+$') then
    raise exception 'attachment path must be organization_id/expense_id/filename';
  end if;
  return new;
end; $$;

create trigger expense_attachments_scope_before_write
before insert or update on public.expense_attachments
for each row execute function public.assert_attachment_scope();

-- La ruta privada se limita a empresa/gasto/archivo (dos carpetas). El vínculo gasto-empresa
-- se verifica en la tabla de metadatos mediante el trigger anterior.
create or replace function public.receipt_organization_id(object_name text) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare folder text;
begin
  folder := (storage.foldername(object_name))[1];
  return folder::uuid;
exception when invalid_text_representation then
  return null;
end; $$;

drop policy if exists "members access only their receipt folder" on storage.objects;
create policy "members read receipt objects in their organization" on storage.objects
for select using (
  bucket_id = 'expense-receipts'
  and array_length(storage.foldername(name), 1) = 2
  and public.is_organization_member(public.receipt_organization_id(name))
);
create policy "members create receipt objects in their organization" on storage.objects
for insert with check (
  bucket_id = 'expense-receipts'
  and array_length(storage.foldername(name), 1) = 2
  and public.is_organization_member(public.receipt_organization_id(name))
);
create policy "admins manage receipt objects in their organization" on storage.objects
for update using (
  bucket_id = 'expense-receipts'
  and array_length(storage.foldername(name), 1) = 2
  and public.is_organization_admin(public.receipt_organization_id(name))
) with check (
  bucket_id = 'expense-receipts'
  and array_length(storage.foldername(name), 1) = 2
  and public.is_organization_admin(public.receipt_organization_id(name))
);
create policy "admins delete receipt objects in their organization" on storage.objects
for delete using (
  bucket_id = 'expense-receipts'
  and array_length(storage.foldername(name), 1) = 2
  and public.is_organization_admin(public.receipt_organization_id(name))
);
