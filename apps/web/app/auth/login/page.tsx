import Link from "next/link";
import { signIn, signUp } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { error, notice } = await searchParams;
  return <main className="auth-shell"><section className="auth-intro"><p className="overline">Control de gastos, sin complejidad</p><h1>Al<span>día</span></h1><p>Un lugar claro para entender lo que gastas, tomar decisiones y mantener cada espacio separado.</p><ul><li>Empresa, hogar, proyectos o viajes</li><li>Monedas y tasas siempre trazables</li><li>Datos aislados por espacio de trabajo</li></ul></section><section className="auth-panel">{error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
    <section className="card stack auth-card"><div><p className="overline">Bienvenido</p><h2>Ingresa a tu espacio</h2><p className="muted">Continúa donde dejaste tus finanzas.</p></div><form action={signIn}><label>Correo<input name="email" type="email" required autoComplete="email" /></label><label>Contraseña<input name="password" type="password" required autoComplete="current-password" /></label><button>Entrar</button></form><Link className="auth-verify" href="/auth/forgot-password">Olvidé mi contraseña</Link></section>
    <details className="auth-signup"><summary>¿Primera vez? Crea tu cuenta</summary><section className="card stack"><p className="muted">Empieza con un espacio y adáptalo a tu manera de manejar el dinero.</p><form action={signUp}><label>Nombre completo<input name="fullName" required maxLength={120} autoComplete="name" /></label><label>Celular<input name="phone" type="tel" maxLength={30} autoComplete="tel" /></label><label>Correo<input name="email" type="email" required autoComplete="email" /></label><label>Contraseña<input name="password" type="password" required minLength={12} autoComplete="new-password" /></label><button>Crear cuenta y verificar correo</button></form></section></details>
    <Link className="auth-verify" href="/auth/verify-email">Ya verifiqué mi correo</Link></section>
  </main>;
}
