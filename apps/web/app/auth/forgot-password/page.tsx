import Link from "next/link";
import { requestPasswordRecovery } from "./actions";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { error, notice } = await searchParams;
  return <main className="auth-shell"><section className="auth-panel"><section className="card stack auth-card"><div><p className="overline">RECUPERAR ACCESO</p><h1>Olvidé mi contraseña</h1><p className="muted">Escribe tu correo. Si tiene una cuenta, recibirás un enlace de uso limitado para elegir una nueva contraseña.</p></div>{error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}<form action={requestPasswordRecovery}><label>Correo<input name="email" type="email" required autoComplete="email" maxLength={320} /></label><button>Enviar enlace de recuperación</button></form><Link className="auth-verify" href="/auth/login">Volver a iniciar sesión</Link></section></section></main>;
}
