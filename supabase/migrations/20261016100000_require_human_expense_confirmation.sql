-- Un gasto solo puede confirmar una persona autenticada y queda ligada a su identidad.
-- El worker usa service_role pero nunca puede crear ni confirmar un gasto confirmado.
alter table public.expenses add column confirmed_by uuid references auth.users(id);

alter table public.expenses drop constraint expenses_check;
alter table public.expenses add constraint expenses_confirmation_identity_check check (
  (status = 'draft' and confirmed_at is null and confirmed_by is null) or
  (status = 'confirmed' and confirmed_at is not null and confirmed_by is not null)
);

create or replace function public.assert_human_expense_confirmation() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and new.status <> 'draft' then
    raise exception 'expenses must be created as drafts';
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'confirmed' and new.status <> 'confirmed' then
      raise exception 'confirmed expenses cannot return to draft';
    end if;
    if old.status = 'draft' and new.status = 'confirmed' then
      if auth.role() <> 'authenticated' or auth.uid() is null or new.confirmed_by <> auth.uid() then
        raise exception 'a signed-in human must confirm the expense';
      end if;
    elsif new.confirmed_by is distinct from old.confirmed_by or new.confirmed_at is distinct from old.confirmed_at then
      raise exception 'confirmation metadata is immutable outside confirmation';
    end if;
  end if;
  return new;
end; $$;

create trigger expenses_human_confirmation_before_write
before insert or update on public.expenses
for each row execute function public.assert_human_expense_confirmation();
