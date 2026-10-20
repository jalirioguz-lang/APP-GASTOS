import Link from "next/link";
import { signIn, signUp } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="stack"><h1>AlDía APP</h1><p className="muted">Tu empresa, tus gastos, tus datos aislados.</p>{error && <p className="error">{error}</p>}
    <section className="card stack"><h2>Ingresar</h2><form action={signIn}><label>Correo<input name="email" type="email" required autoComplete="email" /></label><label>Contraseña<input name="password" type="password" required autoComplete="current-password" /></label><button>Entrar</button></form></section>
    <section className="card stack"><h2>Crear cuenta</h2><form action={signUp}><label>Nombre completo<input name="fullName" required maxLength={120} autoComplete="name" /></label><label>Celular<input name="phone" type="tel" maxLength={30} autoComplete="tel" /></label><label>Correo<input name="email" type="email" required autoComplete="email" /></label><label>Contraseña<input name="password" type="password" required minLength={12} autoComplete="new-password" /></label><button>Crear cuenta y verificar correo</button></form></section>
    <Link href="/auth/verify-email">Ya verifiqué mi correo</Link>
  </main>;
}
