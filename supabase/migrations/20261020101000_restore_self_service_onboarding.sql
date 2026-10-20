-- El piloto valida el recorrido real: cada usuario crea su propia empresa aislada.
create policy "users create organizations for themselves" on public.organizations
for insert with check (created_by = auth.uid());
