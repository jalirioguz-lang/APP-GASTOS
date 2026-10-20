import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { confirmExpense, createExpense, createExpenseReversal, createFinancialAccount, createProject, createProjectBudget, updateDraftExpense } from "./actions";
import { PILOT_CATEGORIES } from "../../lib/pilot";
import { signOut } from "../auth/login/actions";
import { randomUUID } from "crypto";
import Link from "next/link";
import { ExpenseEntryForm } from "./expense-entry-form";

type Organization = { id: string; name: string; base_currency: string; workspace_type: "business" | "household" | "personal" };
type Expense = { id: string; title: string; category: string; vendor: string | null; expense_date: string; project_id: string | null; account_id: string | null; amount_cop: number; original_amount: number; currency: string; status: "draft" | "confirmed" };
type Project = { id: string; name: string };
type Account = { id: string; name: string; account_type: string; opening_balance: number };
type Budget = { id: string; project_id: string; amount_cop: number; effective_from: string };

function formatCop(amount: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(amount);
}

const workspaceCopy = {
  business: { label: "Empresa", description: "Registra, confirma y consulta los gastos de tu operación.", project: "Ej. Operación Norte", account: "Ej. Caja menor", emptyAccounts: "Puedes añadir una cuenta bancaria, caja menor o efectivo cuando quieras." },
  household: { label: "Hogar", description: "Ten a la vista los gastos que hacen parte de tu casa.", project: "Ej. Remodelación", account: "Ej. Cuenta del hogar", emptyAccounts: "Si te ayuda, añade las cuentas o el efectivo del hogar." },
  personal: { label: "Personal", description: "Registra tus gastos y usa categorías para entender tus hábitos.", project: "Ej. Viaje de diciembre", account: "Ej. Cuenta principal", emptyAccounts: "Las cuentas son opcionales: úsalas solo si quieres separar tu dinero." }
} as const;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { error: message, notice } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: memberships } = await supabase.from("organization_members").select("organization:organizations(id, name, base_currency, workspace_type)").eq("user_id", user.id);
  const ownOrganizations = (memberships ?? []).map((membership) => membership.organization as unknown as Organization).filter(Boolean);
  const organization = ownOrganizations[0];
  if (!organization) redirect("/onboarding");
  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, title, category, vendor, expense_date, project_id, account_id, original_amount, currency, amount_cop, status")
    .eq("organization_id", organization.id)
    .order("expense_date", { ascending: false })
    .limit(12);
  const { data: projects } = await supabase.from("projects").select("id, name").eq("organization_id", organization.id).is("archived_at", null).order("name");
  const { data: accounts } = await supabase.from("financial_accounts").select("id, name, account_type, opening_balance").eq("organization_id", organization.id).order("name");
  const { data: budgets } = await supabase.from("project_budgets").select("id, project_id, amount_cop, effective_from").eq("organization_id", organization.id).order("effective_from", { ascending: false });
  const items = (expenses ?? []) as Expense[];
  const projectItems = (projects ?? []) as Project[];
  const accountItems = (accounts ?? []) as Account[];
  const budgetItems = (budgets ?? []) as Budget[];
  const copy = workspaceCopy[organization.workspace_type] ?? workspaceCopy.business;
  const confirmedTotal = items.filter((expense) => expense.status === "confirmed").reduce((sum, expense) => sum + Number(expense.amount_cop), 0);
  const accountBalances = accountItems.map((account) => ({ ...account, balance: Number(account.opening_balance) - items.filter((expense) => expense.status === "confirmed" && expense.account_id === account.id).reduce((sum, expense) => sum + Number(expense.amount_cop), 0) }));

  return <main className="dashboard stack">
    <header className="page-header"><div><p className="overline">{copy.label}</p><h1>{organization.name}</h1><p className="muted">{copy.description}</p></div><div className="header-actions"><div className="total"><span>Confirmados visibles</span><strong>{formatCop(confirmedTotal)}</strong></div><Link className="agent-link" href="/workspace">Abrir agente</Link><form action={signOut}><button className="quiet-button">Salir</button></form></div></header>
    {message && <p className="error" role="alert">{message}</p>}
    {notice && <p className="notice" role="status">{notice}</p>}
    <details className="setup-panel" open={accountItems.length === 0 && projectItems.length === 0}><summary><span><b>Organizar cuentas y proyectos</b><small>Opcional: te ayudará a filtrar, revisar saldos y presupuestos.</small></span><span aria-hidden="true">⌄</span></summary><section className="setup-grid" aria-label="Configuración financiera">
      <section className="card compact"><h2>Proyectos</h2><form action={createProject} className="inline-form"><label className="sr-only" htmlFor="project-name">Nombre del proyecto</label><input id="project-name" name="name" required minLength={1} maxLength={120} placeholder={copy.project} /><button>Crear</button></form><p className="muted">{projectItems.length ? projectItems.map((project) => project.name).join(" · ") : "Aún no hay proyectos."}</p></section>
      <section className="card compact"><h2>Cuentas</h2><form action={createFinancialAccount} className="inline-form"><label className="sr-only" htmlFor="account-name">Nombre de la cuenta</label><input id="account-name" name="name" required minLength={1} maxLength={120} placeholder={copy.account} /><select name="accountType" aria-label="Tipo de cuenta"><option value="petty_cash">Caja menor</option><option value="bank">Banco</option><option value="cash">Efectivo</option><option value="other">Otra</option></select><input name="openingBalance" type="number" inputMode="numeric" step="1" defaultValue="0" aria-label="Saldo inicial en COP" /><button>Crear</button></form><p className="muted">{accountItems.length ? `${accountItems.length} cuenta${accountItems.length === 1 ? "" : "s"} configurada${accountItems.length === 1 ? "" : "s"}.` : copy.emptyAccounts}</p></section>
    </section></details>
    {accountBalances.length > 0 && <section className="card account-balances"><div className="section-heading"><div><h2>Saldo por cuenta</h2><p className="muted">Saldo inicial menos gastos confirmados asociados.</p></div></div><ul>{accountBalances.map((account) => <li key={account.id}><span>{account.name}{account.account_type === "petty_cash" ? " · Caja menor" : ""}</span><strong className={account.balance < 0 ? "negative" : ""}>{formatCop(account.balance)}</strong></li>)}</ul></section>}
    {projectItems.length > 0 && <section className="card budget-panel"><div className="section-heading"><div><h2>Presupuesto por proyecto</h2><p className="muted">Se compara solo contra gastos confirmados.</p></div></div><form action={createProjectBudget} className="inline-form"><select name="projectId" aria-label="Proyecto">{projectItems.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select><input name="amount" type="number" min="1" step="1" required placeholder="Monto COP" /><input name="effectiveFrom" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /><button>Definir</button></form><ul>{budgetItems.map((budget) => { const project = projectItems.find((item) => item.id === budget.project_id); const spent = items.filter((expense) => expense.status === "confirmed" && expense.project_id === budget.project_id && expense.expense_date >= budget.effective_from).reduce((sum, expense) => sum + Number(expense.amount_cop), 0); return <li key={budget.id}><span>{project?.name || "Proyecto"} · consumido {formatCop(spent)} de</span><strong>{formatCop(Number(budget.amount_cop))}</strong></li>; })}</ul></section>}
    <section className="expense-layout" aria-label="Registro de gastos">
      <ExpenseEntryForm action={createExpense} organizationId={organization.id} requestId={randomUUID()} projects={projectItems} accounts={accountItems} />
      <section className="card activity"><div className="section-heading"><div><h2>Gastos recientes</h2><p className="muted">Solo se muestran los registros de este espacio. La exportación admite filtros de proyecto, categoría, período y estado.</p></div></div><form action="/dashboard/export" method="get" className="inline-form report-filters"><select name="status" aria-label="Estado"><option value="">Todos los estados</option><option value="draft">Borradores</option><option value="confirmed">Confirmados</option></select><select name="project" aria-label="Proyecto"><option value="">Todos los proyectos</option>{projectItems.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select><select name="category" aria-label="Categoría"><option value="">Todas las categorías</option>{PILOT_CATEGORIES.map((category) => <option key={category} value={category}>{category.replaceAll("_", " ")}</option>)}</select><input type="date" name="from" aria-label="Desde" /><input type="date" name="to" aria-label="Hasta" /><button className="export-link">Exportar CSV filtrado</button></form>
        {items.length === 0 ? <div className="empty"><h3>Aún no hay gastos</h3><p>Registra el primero para comenzar tu historial.</p></div> : <ul className="expense-list">{items.map((expense) => <li key={expense.id}><div><strong>{expense.title}</strong><span>{expense.category.replaceAll("_", " ")} · {new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(`${expense.expense_date}T12:00:00`))}</span>{expense.status === "draft" && expense.currency === "COP" && <details className="draft-editor"><summary>Editar borrador</summary><form action={updateDraftExpense}><input type="hidden" name="expenseId" value={expense.id} /><label>Descripción<input name="title" required minLength={2} maxLength={200} defaultValue={expense.title} /></label><label>Categoría<select name="category" defaultValue={expense.category}>{PILOT_CATEGORIES.map((category) => <option key={category} value={category}>{category.replaceAll("_", " ")}</option>)}</select></label><label>Proveedor<input name="vendor" maxLength={160} defaultValue={expense.vendor || ""} /></label><label>Fecha<input name="expenseDate" type="date" required defaultValue={expense.expense_date} /></label><label>Valor COP<input name="amount" type="number" min="1" step="1" required defaultValue={expense.original_amount} /></label><button>Guardar cambios</button></form></details>}</div><div className="expense-value"><strong>{formatCop(Number(expense.amount_cop))}</strong><span className={`status ${expense.status}`}>{expense.status === "draft" ? "Borrador" : "Confirmado"}</span>{expense.status === "draft" && <form action={confirmExpense}><input type="hidden" name="organizationId" value={organization.id} /><input type="hidden" name="expenseId" value={expense.id} /><button className="confirm-button">Confirmar</button></form>}{expense.status === "confirmed" && <details className="draft-editor"><summary>Registrar reverso</summary><form action={createExpenseReversal}><input type="hidden" name="expenseId" value={expense.id} /><label>Motivo del reverso<textarea name="reason" required minLength={10} maxLength={500} /></label><button>Crear reverso inmutable</button></form></details>}</div></li>)}</ul>}
      </section>
    </section>
  </main>;
}
