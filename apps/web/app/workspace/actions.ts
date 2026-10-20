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
  const conversationId = text(formData, "conversationId");
  const body = text(formData, "message");
  if (!conversationId || body.length < 1 || body.length > 12000) {
    redirect(`/workspace?conversation=${encodeURIComponent(conversationId)}&error=Escribe%20un%20mensaje%20de%20hasta%2012.000%20caracteres`);
  }

  const { data: conversation } = await supabase.from("agent_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .single();
  if (!conversation) redirect("/workspace?error=No%20encontramos%20esa%20conversación");
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
