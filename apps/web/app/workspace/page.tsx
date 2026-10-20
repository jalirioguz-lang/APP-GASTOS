import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { sendAgentMessage } from "./actions";

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

export default async function WorkspacePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: memberships } = await supabase.from("organization_members")
    .select("organization:organizations(id, name)")
    .eq("user_id", user.id).limit(1);
  const organization = memberships?.[0]?.organization as { id: string; name: string } | undefined;
  if (!organization) redirect("/onboarding");
  return <main className="capture-shell">
    <header className="capture-topbar"><Link className="wordmark" href="/dashboard">al<span>día</span></Link><div className="capture-context"><span>{organization.name}</span><b>Datos aislados</b><Link href="/dashboard">Ver gastos</Link></div></header>
    <section className="capture-stage">
      <div className="capture-intro"><h1>Registra un gasto<br />como te sea más fácil.</h1><p>Una sola entrada para mantener tu caja menor al día. Tú controlas cada borrador antes de confirmarlo.</p></div>
      {params.error && <p className="error capture-error" role="alert">{params.error}</p>}
      <section className="capture-console" aria-label="Centro de captura de gastos">
        <div className="capture-tabs" aria-label="Canales de entrada">
          <button className="channel active" type="button"><CaptureIcon type="message" />Texto <small>Disponible</small></button>
          <button className="channel" type="button" disabled><CaptureIcon type="receipt" />Foto <small>Próximamente</small></button>
          <button className="channel" type="button" disabled><CaptureIcon type="document" />PDF <small>Próximamente</small></button>
          <button className="channel" type="button" disabled><CaptureIcon type="mic" />Voz <small>Próximamente</small></button>
        </div>
        <form action={sendAgentMessage} className="capture-form">
          <label className="sr-only" htmlFor="message">Describe el gasto</label>
          <textarea id="message" name="message" required maxLength={12000} placeholder="Ejemplo: 55.000 de almuerzo en caja menor" />
          <div className="capture-form-footer"><span>Incluye valor y concepto. Lo guardaremos como borrador para que lo revises.</span><button type="submit">Registrar <CaptureIcon type="arrow" /></button></div>
        </form>
      </section>
      <section className="capture-guidance" aria-label="Cómo registrar"><div><strong>Texto listo ahora</strong><p>Escribe el valor y el concepto; se crea un borrador en tu panel.</p></div><div><strong>Documentos, foto y voz</strong><p>La interfaz ya prevé estos canales. Se activarán cuando conectemos OCR y transcripción.</p></div></section>
    </section>
  </main>;
}
