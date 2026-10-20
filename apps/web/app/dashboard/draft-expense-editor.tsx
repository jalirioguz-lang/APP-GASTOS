"use client";

import { useState } from "react";
import { categoryLabel, PILOT_CATEGORIES } from "../../lib/pilot";

type DraftExpense = {
  id: string;
  title: string;
  category: string;
  vendor: string | null;
  expense_date: string;
  original_amount: number;
  currency: string;
  exchange_rate_to_cop: number;
  exchange_rate_reason: string | null;
};

export function DraftExpenseEditor({ action, expense }: { action: (formData: FormData) => void | Promise<void>; expense: DraftExpense }) {
  const [currency, setCurrency] = useState(expense.currency);
  const needsRate = currency !== "COP";
  return <details className="draft-editor"><summary>Revisar borrador</summary><form action={action}>
    <input type="hidden" name="expenseId" value={expense.id} />
    <label>Descripción<input name="title" required minLength={2} maxLength={200} defaultValue={expense.title} /></label>
    <label>Categoría<select name="category" defaultValue={expense.category}>{PILOT_CATEGORIES.map((category) => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></label>
    <label>Proveedor<input name="vendor" maxLength={160} defaultValue={expense.vendor || ""} /></label>
    <label>Fecha<input name="expenseDate" type="date" required defaultValue={expense.expense_date} /></label>
    <label>Moneda<select name="currency" value={currency} onChange={(event) => setCurrency(event.target.value)}><option value="COP">COP · peso colombiano</option><option value="USD">USD · dólar estadounidense</option><option value="EUR">EUR · euro</option></select></label>
    <label>Valor original<input name="amount" type="number" inputMode="decimal" min={needsRate ? "0.01" : "1"} step={needsRate ? "0.01" : "1"} required defaultValue={expense.original_amount} /></label>
    {needsRate && <><label>Tasa a COP<input name="exchangeRate" type="number" inputMode="decimal" min="0.000001" step="0.000001" required defaultValue={expense.exchange_rate_to_cop} /></label><label>Origen de la tasa<input name="exchangeRateReason" required minLength={3} maxLength={240} defaultValue={expense.exchange_rate_reason || "Tasa revisada manualmente"} /></label></>}
    <button>Guardar cambios</button>
  </form></details>;
}
