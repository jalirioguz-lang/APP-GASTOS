import { redirect } from "next/navigation";
import { updateRecoveredPassword } from "./actions";
import { createClient } from "../../../lib/supabase/server";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/forgot-password?error=El%20enlace%20de%20recuperaci%C3%B3n%20es%20inv%C3%A1lido%20o%20venci%C3%B3.%20Solicita%20uno%20nuevo.");
  return <main className="auth-shell"><section className="auth-panel"><section className="card stack auth-card"><div><p className="overline">RECUPERAR ACCESO</p><h1>Elige una nueva contraseña</h1><p className="muted">Usa al menos 12 caracteres. No compartas esta contraseña con nadie.</p></div>{error && <p className="error" role="alert">{error}</p>}<form action={updateRecoveredPassword}><label>Nueva contraseña<input name="password" type="password" required minLength={12} maxLength={256} autoComplete="new-password" /></label><label>Confirmar nueva contraseña<input name="confirmation" type="password" required minLength={12} maxLength={256} autoComplete="new-password" /></label><button>Guardar nueva contraseña</button></form></section></section></main>;
}
