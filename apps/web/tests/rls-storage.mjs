import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2).replace(/[^a-z0-9]/g, "")}`;
const password = "PruebaSegura123!";
const client = () => createClient(url, key, { auth: { persistSession: false } });

async function user(label) {
  const signupClient = client();
  const { data, error } = await signupClient.auth.signUp({ email: `${label}-${suffix}@example.test`, password, options: { data: { full_name: `Prueba ${label}` } } });
  assert.ifError(error); assert.ok(data.session, "El entorno local debe permitir sesión de prueba");
  return { id: data.user.id, supabase: createClient(url, key, { global: { headers: { Authorization: `Bearer ${data.session.access_token}` } }, auth: { persistSession: false } }) };
}
async function organization(actor, name) {
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${suffix}`;
  const { error: insertError } = await actor.supabase.from("organizations").insert({ name, slug, created_by: actor.id });
  assert.ifError(insertError);
  const { data, error } = await actor.supabase.from("organizations").select().eq("slug", slug).single();
  assert.ifError(error); return data;
}
async function expense(actor, organizationId, title) {
  const { data, error } = await actor.supabase.from("expenses").insert({ organization_id: organizationId, title, category: "caja_menor", expense_date: "2026-10-02", original_amount: 1000, currency: "COP", exchange_rate_to_cop: 1, created_by: actor.id, source: "manual", status: "draft" }).select().single();
  assert.ifError(error); return data;
}

const a = await user("empresa-a"); const b = await user("empresa-b");
const orgA = await organization(a, "Empresa A"); const orgB = await organization(b, "Empresa B");
const { data: projectA, error: projectAError } = await a.supabase.from("projects").insert({ organization_id: orgA.id, name: "Proyecto A" }).select().single();
assert.ifError(projectAError);
const expenseA = await expense(a, orgA.id, "Gasto A"); const expenseB = await expense(b, orgB.id, "Gasto B");
const requestId = randomUUID();
const duplicatePayload = { organization_id: orgA.id, client_request_id: requestId, title: "Idempotente", category: "caja_menor", expense_date: "2026-10-02", original_amount: 1000, currency: "COP", exchange_rate_to_cop: 1, created_by: a.id };
assert.ifError((await a.supabase.from("expenses").insert(duplicatePayload)).error);
assert.ok((await a.supabase.from("expenses").insert(duplicatePayload)).error, "El mismo request ID no duplica el gasto");
assert.ok((await a.supabase.from("expenses").insert({ ...duplicatePayload, client_request_id: randomUUID(), original_amount: 0 })).error, "COP cero se rechaza en base de datos");
assert.ok((await a.supabase.from("expenses").insert({ ...duplicatePayload, client_request_id: randomUUID(), original_amount: 1.5 })).error, "COP fraccionario se rechaza en base de datos");

const readCross = await b.supabase.from("expenses").select("id").eq("id", expenseA.id);
assert.ifError(readCross.error); assert.equal(readCross.data.length, 0, "B no puede leer gasto de A");
const exportCross = await b.supabase.from("expenses").select("title, amount_cop, status").eq("organization_id", orgA.id);
assert.ifError(exportCross.error); assert.equal(exportCross.data.length, 0, "B no puede obtener filas de A para exportación");
const createCross = await b.supabase.from("expenses").insert({ organization_id: orgA.id, title: "Intrusión", category: "caja_menor", expense_date: "2026-10-02", original_amount: 1000, currency: "COP", exchange_rate_to_cop: 1, created_by: b.id });
assert.ok(createCross.error, "B no puede crear gasto en empresa A");
const updateCross = await b.supabase.from("expenses").update({ title: "Alterado" }).eq("id", expenseA.id).select();
assert.ifError(updateCross.error); assert.equal(updateCross.data.length, 0, "B no puede editar gasto de A");
const deleteCross = await b.supabase.from("expenses").delete().eq("id", expenseA.id).select();
assert.ifError(deleteCross.error); assert.equal(deleteCross.data.length, 0, "B no puede borrar gasto de A");
assert.ok((await a.supabase.from("expenses").insert({ organization_id: orgA.id, title: "Confirmación indebida", category: "caja_menor", expense_date: "2026-10-02", original_amount: 1000, currency: "COP", exchange_rate_to_cop: 1, created_by: a.id, source: "manual", status: "confirmed", confirmed_at: new Date().toISOString(), confirmed_by: a.id })).error, "Ningún gasto puede crearse confirmado");
const confirmedAt = new Date().toISOString();
const { data: confirmedExpense, error: confirmedExpenseError } = await a.supabase.from("expenses").update({ status: "confirmed", confirmed_at: confirmedAt, confirmed_by: a.id }).eq("id", expenseA.id).select("status, confirmed_at, confirmed_by").single();
assert.ifError(confirmedExpenseError); assert.equal(confirmedExpense.status, "confirmed", "La confirmación humana cambia el estado"); assert.equal(confirmedExpense.confirmed_by, a.id, "La confirmación conserva la identidad humana"); assert.ok(confirmedExpense.confirmed_at, "La confirmación conserva fecha y hora");
const { data: confirmationAudit, error: confirmationAuditError } = await a.supabase.from("audit_events").select("actor_id, action, after_data").eq("entity_id", expenseA.id).eq("action", "update").order("id", { ascending: false }).limit(1).single();
assert.ifError(confirmationAuditError); assert.equal(confirmationAudit.actor_id, a.id, "La auditoría conserva al aprobador humano"); assert.equal(confirmationAudit.after_data.status, "confirmed", "La auditoría conserva el cambio de estado"); assert.equal(confirmationAudit.after_data.confirmed_by, a.id, "La auditoría conserva el aprobador del gasto");

const pathA = `${orgA.id}/${expenseA.id}/recibo.jpg`;
const file = new Blob(["imagen de prueba"], { type: "image/jpeg" });
assert.ifError((await a.supabase.storage.from("expense-receipts").upload(pathA, file, { contentType: "image/jpeg" })).error);
const metadata = await a.supabase.from("expense_attachments").insert({ organization_id: orgA.id, expense_id: expenseA.id, bucket_path: pathA, original_filename: "recibo.jpg", mime_type: "image/jpeg", byte_size: file.size, created_by: a.id });
assert.ifError(metadata.error);
const signed = await a.supabase.storage.from("expense-receipts").createSignedUrl(pathA, 60);
assert.ifError(signed.error); assert.ok(signed.data.signedUrl, "A obtiene URL temporal");
assert.ok((await b.supabase.storage.from("expense-receipts").download(pathA)).error, "B no puede descargar comprobante de A");
assert.ok((await b.supabase.storage.from("expense-receipts").upload(`${orgA.id}/${expenseA.id}/intrusion.jpg`, file, { contentType: "image/jpeg" })).error, "B no puede subir en carpeta de A");
const crossMetadata = await a.supabase.from("expense_attachments").insert({ organization_id: orgA.id, expense_id: expenseB.id, bucket_path: `${orgA.id}/${expenseB.id}/cruzado.jpg`, original_filename: "cruzado.jpg", mime_type: "image/jpeg", byte_size: file.size, created_by: a.id });
assert.ok(crossMetadata.error, "Trigger rechaza gasto de otra empresa");
const badPath = await a.supabase.from("expense_attachments").insert({ organization_id: orgA.id, expense_id: expenseA.id, bucket_path: `${orgA.id}/extra/${expenseA.id}/mal.jpg`, original_filename: "mal.jpg", mime_type: "image/jpeg", byte_size: file.size, created_by: a.id });
assert.ok(badPath.error, "Trigger rechaza ruta inválida");

const { data: conversationA, error: conversationAError } = await a.supabase.from("agent_conversations").insert({ organization_id: orgA.id, created_by: a.id, title: "Gastos octubre" }).select().single();
assert.ifError(conversationAError);
const readConversationCross = await b.supabase.from("agent_conversations").select("id").eq("id", conversationA.id);
assert.ifError(readConversationCross.error); assert.equal(readConversationCross.data.length, 0, "B no puede leer conversación privada de A");
const crossMessage = await b.supabase.from("agent_messages").insert({ conversation_id: conversationA.id, organization_id: orgA.id, role: "user", body: "Intrusión", created_by: b.id });
assert.ok(crossMessage.error, "B no puede escribir en conversación de A");
const { data: messageA, error: messageAError } = await a.supabase.from("agent_messages").insert({ conversation_id: conversationA.id, organization_id: orgA.id, role: "user", body: "Pagué 1000 COP", created_by: a.id }).select().single();
assert.ifError(messageAError);
const crossRun = await b.supabase.from("agent_runs").insert({ conversation_id: conversationA.id, organization_id: orgA.id, requested_by: b.id, input_message_id: messageA.id });
assert.ok(crossRun.error, "B no puede encolar ejecución en conversación de A");
assert.ifError((await a.supabase.from("agent_runs").insert({ conversation_id: conversationA.id, organization_id: orgA.id, requested_by: a.id, input_message_id: messageA.id })).error);
assert.ok((await a.supabase.from("agent_runs").insert({ conversation_id: conversationA.id, organization_id: orgA.id, requested_by: a.id, input_message_id: messageA.id })).error, "Solo existe una ejecución activa por conversación");
const budgetCross = await b.supabase.from("project_budgets").insert({ organization_id: orgA.id, project_id: projectA.id, amount_cop: 100000, effective_from: "2026-10-01", created_by: b.id });
assert.ok(budgetCross.error, "B no puede crear presupuesto en empresa A");
const { error: budgetAError } = await a.supabase.from("project_budgets").insert({ organization_id: orgA.id, project_id: projectA.id, amount_cop: 100000, effective_from: "2026-10-01", created_by: a.id });
assert.ifError(budgetAError);
const budgetReadCross = await b.supabase.from("project_budgets").select("id").eq("organization_id", orgA.id);
assert.ifError(budgetReadCross.error); assert.equal(budgetReadCross.data.length, 0, "B no puede leer presupuesto de A");
console.log("PASS RLS/Storage: alta autoservicio, CRUD cruzado, exportación aislada, privacidad, URL temporal, integridad, idempotencia, COP, confirmación humana, conversaciones y presupuestos privados");
