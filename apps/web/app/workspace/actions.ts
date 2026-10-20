"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { type PilotCategory } from "../../lib/pilot";

function text(formData: FormData, name: string) {
  return String(formData.get(name) || "").trim();
}

function extractExpense(body: string) {
  const amountMatch = body.match(/(?:\$|cop\s*)?(\d{1,3}(?:[.\s,]\d{3})+|\d{3,})/i);
  if (!amountMatch) return null;
  const amount = Number(amountMatch[1].replace(/[^0-9]/g, ""));
  if (!Number.isSafeInteger(amount) || amount < 1) return null;
  const title = body
    .replace(amountMatch[0], "")
    .replace(/\b(?:en\s+)?caja\s+menor\b/gi, "")
    .replace(/^\s*(?:de|por|pagu[eé])\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200) || "Gasto registrado por mensaje";
  return { amount, title };
}

async function currentMember() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1);
  const organizationId = memberships?.[0]?.organization_id;
  if (!organizationId) redirect("/onboarding");
  return { supabase, user, organizationId };
}

export async function startConversation() {
  const { supabase, user, organizationId } = await currentMember();
  const { data: conversation, error } = await supabase.from("agent_conversations").insert({
    organization_id: organizationId,
    created_by: user.id,
    title: "Nueva conversación"
  }).select("id").single();
  if (error || !conversation) redirect("/workspace?error=No%20pudimos%20crear%20la%20conversación");
  redirect(`/workspace?conversation=${conversation.id}`);
}

export async function sendAgentMessage(formData: FormData) {
  const { supabase, user, organizationId } = await currentMember();
  let conversationId = text(formData, "conversationId");
  const body = text(formData, "message");
  if (body.length < 1 || body.length > 12000) {
    redirect("/workspace?error=Escribe%20un%20mensaje%20de%20hasta%2012.000%20caracteres");
  }

  if (conversationId) {
    const { data: conversation } = await supabase.from("agent_conversations")
      .select("id").eq("id", conversationId).eq("organization_id", organizationId).eq("status", "active").single();
    if (!conversation) redirect("/workspace?error=No%20encontramos%20la%20conversación");
  } else {
    const { data: conversation, error: conversationError } = await supabase.from("agent_conversations").insert({
      organization_id: organizationId, created_by: user.id, title: "Registro rápido"
    }).select("id").single();
    if (conversationError || !conversation) redirect("/workspace?error=No%20pudimos%20preparar%20el%20registro");
    conversationId = conversation.id;
  }
  const { data: message, error: messageError } = await supabase.from("agent_messages").insert({
    conversation_id: conversationId,
    organization_id: organizationId,
    role: "user",
    body,
    created_by: user.id
  }).select("id").single();
  if (messageError || !message) redirect(`/workspace?conversation=${conversationId}&error=No%20pudimos%20enviar%20tu%20mensaje`);

  const expense = extractExpense(body);
  if (!expense) redirect(`/workspace?conversation=${conversationId}&error=Escribe%20el%20valor%20del%20gasto%20para%20registrarlo%20como%20borrador`);
  const { error: expenseError } = await supabase.from("expenses").insert({
    organization_id: organizationId,
    client_request_id: crypto.randomUUID(),
    title: expense.title,
    category: "gastos_administrativos" as PilotCategory,
    expense_date: new Date().toISOString().slice(0, 10),
    original_amount: expense.amount,
    currency: "COP",
    exchange_rate_to_cop: 1,
    created_by: user.id,
    source: "message",
    status: "draft"
  });
  if (expenseError) redirect(`/workspace?conversation=${conversationId}&error=No%20pudimos%20registrar%20el%20gasto`);
  await supabase.from("agent_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  revalidatePath("/dashboard");
  redirect("/dashboard?notice=Gasto%20registrado%20como%20borrador%20para%20revisi%C3%B3n");
}

export async function captureDocument(formData: FormData) {
  const { supabase, user, organizationId } = await currentMember();
  const document = formData.get("document");
  const acceptedTypes = ["image/jpeg", "image/png", "application/pdf"];
  if (!(document instanceof File) || document.size < 1 || document.size > 5_000_000 || !acceptedTypes.includes(document.type)) redirect("/workspace?error=Selecciona%20una%20foto%20JPG%2FPNG%20o%20un%20PDF%20de%20hasta%205%20MB");
  const source = document.type === "application/pdf" ? "pdf" : "photo";
  const { data: submission, error: submissionError } = await supabase.from("capture_submissions").insert({ organization_id: organizationId, created_by: user.id, source, original_filename: document.name.slice(0, 255), mime_type: document.type, byte_size: document.size, status: "pending_extraction" }).select("id").single();
  if (submissionError || !submission) redirect("/workspace?error=No%20pudimos%20recibir%20el%20comprobante");
  const filename = document.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "comprobante";
  const path = `${organizationId}/captures/${submission.id}/${filename}`;
  const { error: uploadError } = await supabase.storage.from("expense-receipts").upload(path, document, { contentType: document.type, upsert: false });
  if (uploadError) {
    await supabase.from("capture_submissions").delete().eq("id", submission.id);
    redirect("/workspace?error=No%20pudimos%20guardar%20el%20archivo");
  }
  const { error: updateError } = await supabase.from("capture_submissions").update({ storage_path: path }).eq("id", submission.id);
  if (updateError) redirect("/workspace?error=El%20archivo%20se%20guard%C3%B3%2C%20pero%20no%20qued%C3%B3%20listo%20para%20extracci%C3%B3n");
  revalidatePath("/workspace");
  redirect("/workspace?notice=Comprobante%20recibido.%20Qued%C3%B3%20listo%20para%20extraer%20sus%20datos");
}
