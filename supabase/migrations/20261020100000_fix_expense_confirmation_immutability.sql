-- Corrección compensatoria: una confirmación solo cambia su estado y evidencia humana.
-- La comparación explícita evita que columnas mantenidas por triggers impidan confirmar.
create or replace function public.assert_expense_immutable_after_confirmation() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.status = 'confirmed' then
    raise exception 'confirmed expenses are immutable; create a reversal instead';
  end if;

  if tg_op = 'UPDATE' and old.status = 'draft' and new.status = 'confirmed' then
    if not public.is_organization_reviewer(new.organization_id) then
      raise exception 'only an administrator or reviewer can confirm';
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
