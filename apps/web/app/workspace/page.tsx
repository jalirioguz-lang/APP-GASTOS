import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { sendAgentMessage, startConversation } from "./actions";

type Conversation = { id: string; title: string; updated_at: string };
type Message = { id: string; role: "user" | "assistant" | "system"; body: string; created_at: string };

export default async function WorkspacePage({ searchParams }: { searchParams: Promise<{ conversation?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: memberships } = await supabase.from("organization_members")
    .select("organization:organizations(id, name)")
    .eq("user_id", user.id).limit(1);
  const organization = memberships?.[0]?.organization as { id: string; name: string } | undefined;
  if (!organization) redirect("/onboarding");
  const { data: conversationRows } = await supabase.from("agent_conversations")
    .select("id, title, updated_at").eq("organization_id", organization.id).eq("status", "active")
    .order("updated_at", { ascending: false }).limit(30);
  const conversations = (conversationRows ?? []) as Conversation[];
  const activeId = params.conversation && conversations.some((item) => item.id === params.conversation) ? params.conversation : conversations[0]?.id;
  const { data: messageRows } = activeId ? await supabase.from("agent_messages")
    .select("id, role, body, created_at").eq("conversation_id", activeId).order("created_at", { ascending: true }).limit(200) : { data: [] };
  const messages = (messageRows ?? []) as Message[];

  return <main className="agent-shell">
    <aside className="conversation-rail">
      <Link className="wordmark" href="/dashboard">al<span>día</span></Link>
      <form action={startConversation}><button className="new-thread" type="submit">Nueva conversación</button></form>
      <nav aria-label="Conversaciones"><p>Este espacio</p>{conversations.length ? conversations.map((conversation) => <Link key={conversation.id} className={conversation.id === activeId ? "thread active" : "thread"} href={`/workspace?conversation=${conversation.id}`}>{conversation.title}</Link>) : <span className="rail-empty">Crea una conversación para empezar.</span>}</nav>
      <div className="rail-footer"><span>{organization.name}</span><Link href="/dashboard">Volver a gastos</Link></div>
    </aside>
    <section className="agent-main">
      <header className="agent-header"><div><h1>Registro por mensaje</h1><p>Escribe un gasto con su valor; lo registraremos como borrador para que lo revises en el panel.</p></div><span className="privacy-note">Datos aislados por empresa</span></header>
      {params.error && <p className="error" role="alert">{params.error}</p>}
      {!activeId ? <section className="agent-welcome"><div className="welcome-illustration" aria-hidden="true"><i /><i /><i /><b /></div><h2>Una conversación para cada frente de trabajo.</h2><p>Cuéntale al agente un gasto, adjunta un comprobante o pide revisar tu caja. Cada hilo conserva el contexto de tu empresa.</p><form action={startConversation}><button>Crear primera conversación</button></form></section> : <>
        <section className="message-stream" aria-live="polite">
          {messages.length === 0 && <div className="agent-intro"><strong>¿Qué quieres registrar hoy?</strong><p>Por ejemplo: “Pagué $86.500 de combustible para el proyecto Norte”.</p></div>}
          {messages.map((message) => <article className={`message ${message.role}`} key={message.id}><span>{message.role === "user" ? "Tú" : "AlDía"}</span><p>{message.body}</p></article>)}
        </section>
        <form action={sendAgentMessage} className="composer"><input type="hidden" name="conversationId" value={activeId} /><label className="sr-only" htmlFor="message">Gasto por mensaje</label><textarea id="message" name="message" required maxLength={12000} placeholder="Ejemplo: 55.000 de almuerzo en caja menor" /><div><span>Incluye el valor del gasto. Se guardará como borrador, sin confirmarlo automáticamente.</span><button type="submit">Registrar gasto</button></div></form>
      </>}
    </section>
  </main>;
}
