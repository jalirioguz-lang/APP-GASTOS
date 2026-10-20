import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { captureDocument, sendAgentMessage } from "./actions";
import { VoiceCapture } from "./voice-capture";

function CaptureIcon({ type }: { type: "mic" | "receipt" | "document" | "message" | "arrow" }) {
  const paths = {
    mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v4M8.5 21h7" /></>,
    receipt: <><path d="M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21V3Z" /><path d="M9.5 8h5M9.5 12h5M9.5 16h3" /></>,
    document: <><path d="M7 3h7l4 4v14H7V3Z" /><path d="M14 3v5h4M9.5 13h5M9.5 17h5" /></>,
    message: <><path d="M5 5h14v11H9l-4 3V5Z" /><path d="M8.5 9.5h7M8.5 12.5h4" /></>,
    arrow: <path d="M5 12h13M13 7l5 5-5 5" />
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[type]}</svg>;
}

export default async function WorkspacePage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string; conversation?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: memberships } = await supabase.from("organization_members")
    .select("organization:organizations(id, name)")
    .eq("user_id", user.id).limit(1);
  const organization = memberships?.[0]?.organization as { id: string; name: string } | undefined;
  if (!organization) redirect("/onboarding");
  const conversationId = params.conversation || "";
  const { data: recentMessages } = conversationId ? await supabase.from("agent_messages").select("id, body")
    .eq("organization_id", organization.id).eq("conversation_id", conversationId).eq("role", "user").order("created_at", { ascending: false }).limit(3) : { data: [] as { id: string; body: string }[] };
  return <main className="capture-shell">
    <header className="capture-topbar"><Link className="wordmark" href="/workspace">al<span>día</span></Link><div className="capture-context"><span>{organization.name}</span><b>Datos aislados</b><Link href="/dashboard">Ver resumen</Link></div></header>
    <section className="capture-stage">
      <div className="capture-intro"><p className="capture-eyebrow">REGISTRO RÁPIDO</p><h1>¿Qué pagaste?</h1><p>Cuéntaselo al agente como por WhatsApp. Escribe, toma una foto o manda una nota de voz; si no dices moneda, usamos pesos colombianos.</p></div>
      {params.error && <p className="error capture-error" role="alert">{params.error}</p>}
      {params.notice && <p className="capture-notice" role="status">{params.notice}</p>}
      <section className="capture-console" aria-label="Chat para registrar gastos">
        <form action={sendAgentMessage} className="capture-form">
          <div className="chat-heading"><CaptureIcon type="message" /><div><strong>Mensaje al agente</strong><span>Describe la compra en tus palabras</span></div></div>
          <div className="chat-history" aria-label="Conversación reciente"><p className="agent-bubble">Hola. Dime qué pagaste, toma una foto del comprobante o manda una nota de voz.</p>{[...(recentMessages || [])].reverse().map((message) => <p className="person-bubble" key={message.id}>{message.body}</p>)}</div>
          <input type="hidden" name="conversationId" value={conversationId} />
          <label className="sr-only" htmlFor="message">Escribe un mensaje al agente</label>
          <textarea id="message" name="message" required maxLength={12000} placeholder="Ej.: Pagué 28 mil de almuerzo" />
          <div className="capture-form-footer"><span>Fecha de hoy y COP por defecto. Podrás revisar el borrador después.</span><button type="submit">Enviar <CaptureIcon type="arrow" /></button></div>
        </form>
        <div className="quick-actions" aria-label="Otras formas rápidas de registrar">
          <form action={captureDocument} className="quick-action upload-channel"><label><CaptureIcon type="receipt" /><span><strong>Foto</strong><small>Tomar o subir comprobante</small></span><input name="document" type="file" accept="image/jpeg,image/png" capture="environment" required /></label><button type="submit">Enviar foto</button></form>
          <VoiceCapture />
        </div>
      </section>
      <section className="capture-guidance" aria-label="Opciones adicionales"><div><strong>Recibir por correo</strong><p>Este espacio tendrá una dirección única para reenviar facturas y comprobantes. La mostraremos aquí con un botón para copiarla cuando el administrador active la recepción.</p></div><div><strong>¿Prefieres hacerlo manual?</strong><p>También puedes completar todos los datos por tu cuenta cuando lo necesites.</p><Link href="/dashboard#registro-manual">Registrar manualmente</Link></div><div><strong>Archivo o PDF</strong><p>Para enviar un PDF, usa el registro manual por ahora. Las fotos y las notas de voz quedan separadas por cada espacio.</p></div></section>
    </section>
  </main>;
}
