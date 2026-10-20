"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

function text(formData: FormData, name: string) {
  return String(formData.get(name) || "").trim();
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
  const { data: pendingRun } = await supabase.from("agent_runs")
    .select("id").eq("conversation_id", conversationId).in("status", ["queued", "running"]).limit(1);
  if (pendingRun?.length) {
    redirect(`/workspace?conversation=${conversationId}&error=El%20agente%20aún%20está%20atendiendo%20tu%20mensaje%20anterior`);
  }

  const { data: message, error: messageError } = await supabase.from("agent_messages").insert({
    conversation_id: conversationId,
    organization_id: organizationId,
    role: "user",
    body,
    created_by: user.id
  }).select("id").single();
  if (messageError || !message) redirect(`/workspace?conversation=${conversationId}&error=No%20pudimos%20enviar%20tu%20mensaje`);

  const { error: runError } = await supabase.from("agent_runs").insert({
    conversation_id: conversationId,
    organization_id: organizationId,
    requested_by: user.id,
    input_message_id: message.id
  });
  if (runError) redirect(`/workspace?conversation=${conversationId}&error=No%20pudimos%20poner%20tu%20solicitud%20en%20cola`);
  await supabase.from("agent_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  revalidatePath("/workspace");
  redirect(`/workspace?conversation=${conversationId}`);
}
