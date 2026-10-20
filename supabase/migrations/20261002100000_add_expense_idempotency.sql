-- Cada reintento del mismo formulario conserva el mismo identificador y no duplica el gasto.
alter table public.expenses add column client_request_id uuid not null default gen_random_uuid();
alter table public.expenses add constraint expenses_organization_request_unique unique (organization_id, client_request_id);
alter table public.expenses add constraint expenses_cop_integer_minimum check (currency <> 'COP' or (original_amount >= 1 and trunc(original_amount) = original_amount));
