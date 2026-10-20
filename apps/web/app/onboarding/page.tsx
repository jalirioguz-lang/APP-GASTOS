import { createOrganization } from "./actions";

export default function OnboardingPage() {
  return <main><section className="card stack"><h1>Crea tu empresa</h1><p className="muted">Durante el piloto, cada persona crea su propio espacio de trabajo aislado y queda como responsable de sus gastos.</p><form action={createOrganization}><label>Nombre de empresa<input name="organizationName" required minLength={2} maxLength={120} /></label><button>Crear espacio de trabajo</button></form></section></main>;
}
