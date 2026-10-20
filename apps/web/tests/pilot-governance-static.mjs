import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const migration = readFileSync(resolve(root, "supabase/migrations/20261020110000_single_responsible_pilot.sql"), "utf8");
const login = readFileSync(resolve(root, "apps/web/app/auth/login/page.tsx"), "utf8");
const loginActions = readFileSync(resolve(root, "apps/web/app/auth/login/actions.ts"), "utf8");
const onboarding = readFileSync(resolve(root, "apps/web/app/onboarding/page.tsx"), "utf8");
const actions = readFileSync(resolve(root, "apps/web/app/dashboard/actions.ts"), "utf8");
const exportRoute = readFileSync(resolve(root, "apps/web/app/dashboard/export/route.ts"), "utf8");
const dashboard = readFileSync(resolve(root, "apps/web/app/dashboard/page.tsx"), "utf8");
const createExpenseSource = actions.slice(actions.indexOf("export async function createExpense"), actions.indexOf("export async function confirmExpense"));

for (const fragment of ["única persona responsable", "responsible reads own organization", "responsible creates drafts", "responsible updates own expenses", "responsible creates reversals", "responsible creates receipts"]) assert.ok(migration.includes(fragment), `Falta garantía: ${fragment}`);
for (const category of ["caja_menor", "papeleria_oficina", "transporte", "materiales_insumos", "servicios", "honorarios_contratistas_simulados", "reembolsos", "gastos_administrativos"]) assert.ok(migration.includes(category), `Falta categoría: ${category}`);
assert.ok(login.includes("signUp"), "El acceso del piloto debe ofrecer registro autoservicio");
assert.ok(loginActions.includes("signUp"), "El servidor debe permitir crear una cuenta de piloto");
assert.ok(onboarding.includes("createOrganization"), "El onboarding debe permitir crear la empresa propia");
assert.ok(actions.includes("createExpenseReversal"), "Debe existir acción de reverso inmutable");
assert.ok(migration.includes("public.is_organization_member(new.organization_id)"), "La confirmación debe depender de membresía directa");
assert.ok(migration.includes("confirmation cannot edit draft fields"), "La confirmación no puede alterar campos de gasto");
assert.ok(!createExpenseSource.includes('field(formData, "organizationId")'), "La empresa de alta no puede provenir del cliente");
assert.ok(!dashboard.includes("Rol activo:"), "La interfaz no debe mostrar roles");
assert.ok(!dashboard.includes("revisión cruzada"), "La interfaz no debe exponer revisión cruzada");
assert.ok(!actions.includes("openReviewOrganization"), "La aplicación no debe abrir empresas ajenas");
for (const filter of ["projectId", "category", "from", "to", "status"]) assert.ok(exportRoute.includes(filter), `Falta filtro de exportación: ${filter}`);
console.log("PASS pilot governance static: responsable único, aislamiento directo y registros inmutables");
