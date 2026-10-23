"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { isValidEmailAddress, passwordRecoveryRedirectUrl } from "../../../lib/password-recovery";

function value(formData: FormData, name: string) {
  return String(formData.get(name) || "").trim();
}

export async function requestPasswordRecovery(formData: FormData) {
  const email = value(formData, "email");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!isValidEmailAddress(email) || !appUrl) {
    redirect("/auth/forgot-password?error=Revisa%20el%20correo%20e%20int%C3%A9ntalo%20de%20nuevo.");
  }

  let redirectTo: string;
  try {
    redirectTo = passwordRecoveryRedirectUrl(appUrl);
  } catch {
    redirect("/auth/forgot-password?error=No%20pudimos%20preparar%20la%20recuperaci%C3%B3n.");
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  // Supabase deliberately does not reveal whether this email belongs to an
  // account. Keep the response identical if email delivery is rate-limited or
  // temporarily unavailable so the page cannot be used to enumerate users.
  redirect("/auth/forgot-password?notice=Si%20existe%20una%20cuenta%20para%20ese%20correo%2C%20recibir%C3%A1s%20un%20enlace%20para%20elegir%20una%20nueva%20contrase%C3%B1a.");
}
