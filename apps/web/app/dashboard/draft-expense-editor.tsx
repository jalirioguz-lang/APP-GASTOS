"use client";

import { useState } from "react";
import { categoryLabel, PILOT_CATEGORIES } from "../../lib/pilot";

type DraftExpense = {
  id: string;
  title: string;
  category: string;
  vendor: string | null;
  project_id: string | null;
  subproject_id: string | null;
  expense_date: string;
  original_amount: number;
  currency: string;
  exchange_rate_to_cop: number;
  exchange_rate_reason: string | null;
};

type Project = { id: string; name: string };
type Subproject = { id: string; project_id: string; name: string };

export function DraftExpenseEditor({ action, expense, projects, subprojects }: { action: (formData: FormData) => void | Promise<void>; expense: DraftExpense; projects: Project[]; subprojects: Subproject[] }) {
  const [currency, setCurrency] = useState(expense.currency);
  const [projectId, setProjectId] = useState(expense.project_id || "");
  const [subprojectId, setSubprojectId] = useState(expense.subproject_id || "");
  const needsRate = currency !== "COP";
  const availableSubprojects = subprojects.filter((subproject) => subproject.project_id === projectId);
  return <details className="draft-editor"><summary>Revisar borrador</summary><form action={action}>
    <input type="hidden" name="expenseId" value={expense.id} />
    <label>Descripción<input name="title" required minLength={2} maxLength={200} defaultValue={expense.title} /></label>
    <label>Categoría<select name="category" defaultValue={expense.category}>{PILOT_CATEGORIES.map((category) => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></label>
    <label>Proveedor<input name="vendor" maxLength={160} defaultValue={expense.vendor || ""} /></label>
    <label>Proyecto<select name="projectId" value={projectId} onChange={(event) => { setProjectId(event.target.value); setSubprojectId(""); }}><option value="">Sin proyecto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
    <label>Subproyecto<select name="subprojectId" value={subprojectId} onChange={(event) => setSubprojectId(event.target.value)} disabled={!projectId || availableSubprojects.length === 0}><option value="">{projectId ? availableSubprojects.length ? "Sin subproyecto" : "Este proyecto no tiene subproyectos" : "Primero elige un proyecto"}</option>{availableSubprojects.map((subproject) => <option key={subproject.id} value={subproject.id}>{subproject.name}</option>)}</select></label>
    <label>Fecha<input name="expenseDate" type="date" required defaultValue={expense.expense_date} /></label>
    <label>Moneda<select name="currency" value={currency} onChange={(event) => setCurrency(event.target.value)}><option value="COP">COP · peso colombiano</option><option value="USD">USD · dólar estadounidense</option><option value="EUR">EUR · euro</option></select></label>
    <label>Valor original<input name="amount" type="number" inputMode="decimal" min={needsRate ? "0.01" : "1"} step={needsRate ? "0.01" : "1"} required defaultValue={expense.original_amount} /></label>
    {needsRate && <><label>Tasa a COP<input name="exchangeRate" type="number" inputMode="decimal" min="0.000001" step="0.000001" required defaultValue={expense.exchange_rate_to_cop} /></label><label>Origen de la tasa<input name="exchangeRateReason" required minLength={3} maxLength={240} defaultValue={expense.exchange_rate_reason || "Tasa revisada manualmente"} /></label></>}
    <button>Guardar cambios</button>
  </form></details>;
}
