"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { PILOT_CATEGORIES, type PilotCategory } from "../../lib/pilot";

function field(formData: FormData, name: string) {
  return String(formData.get(name) || "").trim();
}

async function currentOrganization() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: memberships } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1);
  const organizationId = memberships?.[0]?.organization_id;
  if (!organizationId) redirect("/onboarding");
  return { supabase, user, organizationId };
}

export async function createExpense(formData: FormData) {
  const { supabase, user, organizationId } = await currentOrganization();
  const requestId = field(formData, "requestId");
  const title = field(formData, "title");
  const category = field(formData, "category");
  const vendor = field(formData, "vendor");
  const projectId = field(formData, "projectId");
  const accountId = field(formData, "accountId");
  const expenseDate = field(formData, "expenseDate");
  const rawAmount = field(formData, "amount");
  const amount = Number(rawAmount);
  const currency = field(formData, "currency");
  const rawRate = field(formData, "exchangeRate");
  const exchangeRate = currency === "COP" ? 1 : Number(rawRate);
  const exchangeRateReason = field(formData, "exchangeRateReason");
  const receipt = formData.get("receipt");
  const dateParts = expenseDate.split("-").map(Number);
  const parsedDate = dateParts.length === 3 ? new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2])) : null;
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(expenseDate)
    && parsedDate !== null
    && parsedDate.getUTCFullYear() === dateParts[0]
    && parsedDate.getUTCMonth() === dateParts[1] - 1
    && parsedDate.getUTCDate() === dateParts[2];

  const validRequestId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId);
  const validReceipt = receipt === null || (receipt instanceof File && receipt.size > 0 && receipt.size <= 5_000_000 && ["image/jpeg", "image/png", "application/pdf"].includes(receipt.type));
  const validAmount = currency === "COP" ? Number.isSafeInteger(amount) : Number.isFinite(amount) && amount > 0 && Math.round(amount * 100) === amount * 100;
  if (!validRequestId || title.length < 2 || title.length > 200 || !PILOT_CATEGORIES.includes(category as PilotCategory) || vendor.length > 160 || !validDate || !["COP", "USD", "EUR"].includes(currency) || !validAmount || amount < 1 || amount > 9999999999999999 || !Number.isFinite(exchangeRate) || exchangeRate <= 0 || (currency !== "COP" && (exchangeRateReason.length < 3 || exchangeRateReason.length > 240)) || !validReceipt) {
    redirect("/dashboard?error=Revisa%20los%20datos%20del%20gasto");
  }

  const { data: expense, error } = await supabase.from("expenses").insert({
    organization_id: organizationId,
    client_request_id: requestId,
    title,
    category,
    vendor: vendor || null,
    project_id: projectId || null,
    account_id: accountId || null,
    expense_date: expenseDate,
    original_amount: amount,
    currency,
    exchange_rate_to_cop: exchangeRate,
    exchange_rate_reason: currency === "COP" ? null : exchangeRateReason,
    created_by: user.id,
    source: "manual",
    status: "draft"
  }).select("id").single();

  if (error || !expense) redirect("/dashboard?error=No%20fue%20posible%20guardar%20el%20gasto");
  if (receipt instanceof File && receipt.size > 0) {
    const filename = receipt.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "comprobante";
    const path = `${organizationId}/${expense.id}/${filename}`;
    const { error: uploadError } = await supabase.storage.from("expense-receipts").upload(path, receipt, { contentType: receipt.type, upsert: false });
    if (uploadError) redirect("/dashboard?error=El%20gasto%20se%20guardó%2C%20pero%20no%20el%20comprobante");
    const { error: attachmentError } = await supabase.from("expense_attachments").insert({ organization_id: organizationId, expense_id: expense.id, bucket_path: path, original_filename: receipt.name.slice(0, 255), mime_type: receipt.type, byte_size: receipt.size, created_by: user.id });
    if (attachmentError) {
      await supabase.storage.from("expense-receipts").remove([path]);
      redirect("/dashboard?error=El%20comprobante%20no%20pasó%20la%20validación");
    }
  }
  redirect("/dashboard");
}

export async function confirmExpense(formData: FormData) {
  const { supabase, user, organizationId } = await currentOrganization();
  const expenseId = field(formData, "expenseId");
  if (!/^[0-9a-f-]{36}$/i.test(expenseId)) redirect("/dashboard?error=Gasto%20inválido");
  const { error } = await supabase.from("expenses")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString(), confirmed_by: user.id })
    .eq("id", expenseId)
    .eq("organization_id", organizationId)
    .eq("status", "draft");
  if (error) redirect("/dashboard?error=No%20fue%20posible%20confirmar%20el%20gasto");
  redirect("/dashboard");
}

export async function updateDraftExpense(formData: FormData) {
  const { supabase, organizationId } = await currentOrganization();
  const expenseId = field(formData, "expenseId");
  const title = field(formData, "title");
  const category = field(formData, "category");
  const vendor = field(formData, "vendor");
  const expenseDate = field(formData, "expenseDate");
  const amount = Number(field(formData, "amount"));
  if (!/^[0-9a-f-]{36}$/i.test(expenseId) || title.length < 2 || title.length > 200 || !PILOT_CATEGORIES.includes(category as PilotCategory) || vendor.length > 160 || !/^\d{4}-\d{2}-\d{2}$/.test(expenseDate) || !Number.isSafeInteger(amount) || amount < 1) {
    redirect("/dashboard?error=Revisa%20los%20datos%20del%20borrador");
  }
  const { error } = await supabase.from("expenses").update({ title, category, vendor: vendor || null, expense_date: expenseDate, original_amount: amount }).eq("id", expenseId).eq("organization_id", organizationId).eq("status", "draft");
  if (error) redirect("/dashboard?error=No%20fue%20posible%20actualizar%20el%20borrador");
  redirect("/dashboard");
}

export async function createExpenseReversal(formData: FormData) {
  const { supabase, user, organizationId } = await currentOrganization();
  const expenseId = field(formData, "expenseId");
  const reason = field(formData, "reason");
  if (!/^[0-9a-f-]{36}$/i.test(expenseId) || reason.length < 10 || reason.length > 500) redirect("/dashboard?error=El%20motivo%20del%20reverso%20debe%20tener%20entre%2010%20y%20500%20caracteres");
  const { error } = await supabase.from("expense_reversals").insert({ organization_id: organizationId, original_expense_id: expenseId, reason, created_by: user.id });
  if (error) redirect("/dashboard?error=No%20fue%20posible%20registrar%20el%20reverso");
  redirect("/dashboard");
}

export async function createProject(formData: FormData) {
  const { supabase, organizationId } = await currentOrganization();
  const name = field(formData, "name");
  if (name.length < 1 || name.length > 120) redirect("/dashboard?error=Nombre%20de%20proyecto%20inválido");
  const { error } = await supabase.from("projects").insert({ organization_id: organizationId, name });
  if (error) redirect("/dashboard?error=No%20fue%20posible%20crear%20el%20proyecto");
  redirect("/dashboard");
}

export async function createFinancialAccount(formData: FormData) {
  const { supabase, organizationId } = await currentOrganization();
  const name = field(formData, "name");
  const accountType = field(formData, "accountType");
  const openingBalance = Number(field(formData, "openingBalance") || "0");
  if (name.length < 1 || name.length > 120 || !["bank", "petty_cash", "cash", "other"].includes(accountType) || !Number.isSafeInteger(openingBalance) || Math.abs(openingBalance) > 9999999999999999) redirect("/dashboard?error=Datos%20de%20cuenta%20inválidos");
  const { error } = await supabase.from("financial_accounts").insert({ organization_id: organizationId, name, account_type: accountType, currency: "COP", opening_balance: openingBalance });
  if (error) redirect("/dashboard?error=No%20fue%20posible%20crear%20la%20cuenta");
  redirect("/dashboard");
}

export async function createProjectBudget(formData: FormData) {
  const { supabase, user, organizationId } = await currentOrganization();
  const projectId = field(formData, "projectId");
  const amount = Number(field(formData, "amount"));
  const effectiveFrom = field(formData, "effectiveFrom");
  if (!/^[0-9a-f-]{36}$/i.test(projectId) || !Number.isSafeInteger(amount) || amount < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) redirect("/dashboard?error=Revisa%20los%20datos%20del%20presupuesto");
  const { error } = await supabase.from("project_budgets").insert({ organization_id: organizationId, project_id: projectId, amount_cop: amount, effective_from: effectiveFrom, created_by: user.id });
  if (error) redirect("/dashboard?error=No%20fue%20posible%20crear%20el%20presupuesto");
  redirect("/dashboard");
}
