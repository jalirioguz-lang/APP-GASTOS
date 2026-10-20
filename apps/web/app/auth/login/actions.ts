"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";

function value(formData: FormData, name: string) { return String(formData.get(name) || "").trim(); }

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: value(formData, "email"), password: value(formData, "password") });
  if (error) redirect(`/auth/login?error=${encodeURIComponent("No fue posible iniciar sesión.")}`);
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) redirect(`/dashboard?error=${encodeURIComponent("No fue posible cerrar la sesión. Inténtalo de nuevo.")}`);
  redirect("/auth/login");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) redirect(`/auth/login?error=${encodeURIComponent("Falta configurar la URL de la aplicación.")}`);
  let emailRedirectTo: string;
  try {
    emailRedirectTo = new URL("/auth/callback", appUrl).toString();
  } catch {
    redirect(`/auth/login?error=${encodeURIComponent("La URL de la aplicación no es válida.")}`);
  }
  const { data, error } = await supabase.auth.signUp({
    email: value(formData, "email"), password: value(formData, "password"),
    options: { emailRedirectTo, data: { full_name: value(formData, "fullName"), phone: value(formData, "phone") } }
  });
  if (error) redirect(`/auth/login?error=${encodeURIComponent("No fue posible crear la cuenta.")}`);
  if (data.session) redirect("/onboarding");
  redirect("/auth/verify-email");
}
