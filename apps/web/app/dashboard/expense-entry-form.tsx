"use client";

import { useState } from "react";
import { categoryLabel, PILOT_CATEGORIES, suggestCategory } from "../../lib/pilot";

type Project = { id: string; name: string };
type Account = { id: string; name: string };

type ExpenseEntryFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  organizationId: string;
  requestId: string;
  projects: Project[];
  accounts: Account[];
};

export function ExpenseEntryForm({ action, organizationId, requestId, projects, accounts }: ExpenseEntryFormProps) {
  const [currency, setCurrency] = useState("COP");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const needsExchangeRate = currency !== "COP";
  const suggestedCategory = suggestCategory(description);

  return <section id="registro-manual" className="card expense-form"><div className="section-heading"><div><p className="overline">Nuevo movimiento</p><h2>Registra un gasto</h2><p className="muted">Guárdalo como borrador. Después podrás revisarlo y confirmarlo.</p></div><span className="step-chip">1 de 1</span></div><form action={action}>
    <input type="hidden" name="organizationId" value={organizationId} />
    <input type="hidden" name="requestId" value={requestId} />
    <label>Descripción<input name="title" required minLength={2} maxLength={200} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ej. Cemento para obra, mercado o transporte" /></label>
    <div className="form-row"><label>Categoría<select name="category" required value={category} onChange={(event) => setCategory(event.target.value)}><option value="" disabled>Selecciona una categoría</option>{PILOT_CATEGORIES.map((item) => <option key={item} value={item}>{categoryLabel(item)}</option>)}</select>{suggestedCategory && suggestedCategory !== category && <button className="suggestion" type="button" onClick={() => setCategory(suggestedCategory)}>Usar sugerencia: {categoryLabel(suggestedCategory)}</button>}</label><label>Fecha<input name="expenseDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label></div>
    <div className="form-row"><label>Moneda<select name="currency" value={currency} onChange={(event) => setCurrency(event.target.value)}><option value="COP">COP · peso colombiano</option><option value="USD">USD · dólar estadounidense</option><option value="EUR">EUR · euro</option></select></label><label>Valor<input name="amount" type="number" inputMode="decimal" min={needsExchangeRate ? "0.01" : "1"} step={needsExchangeRate ? "0.01" : "1"} required placeholder="0" /></label></div>
    {needsExchangeRate && <div className="form-row exchange-fields"><label>Tasa a COP<input name="exchangeRate" type="number" inputMode="decimal" min="0.000001" step="0.000001" required placeholder="Ej. 4050" /></label><label>Motivo de la tasa<input name="exchangeRateReason" required minLength={3} maxLength={240} placeholder="Ej. Tasa pactada con el banco" /></label></div>}
    <label>Proveedor <span className="optional">opcional</span><input name="vendor" maxLength={160} placeholder="Nombre del comercio" /></label>
    <div className="form-row"><label>Proyecto <span className="optional">opcional</span><select name="projectId" defaultValue=""><option value="">Sin proyecto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><label>Cuenta <span className="optional">opcional</span><select name="accountId" defaultValue=""><option value="">Sin cuenta</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label></div>
    <label>Comprobante <span className="optional">opcional · JPG, PNG o PDF hasta 5 MB</span><input name="receipt" type="file" accept="image/jpeg,image/png,application/pdf" /></label>
    <button>Guardar borrador</button>
  </form></section>;
}
