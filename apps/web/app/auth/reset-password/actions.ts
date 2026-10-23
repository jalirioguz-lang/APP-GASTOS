"use server";

import { redirect } from "next/navigation";
import { isValidNewPassword } from "../../../lib/password-recovery";
import { createClient } from "../../../lib/supabase/server";

function value(formData: FormData, name: string) {
  return String(formData.get(name) || "");
}

export async function updateRecoveredPassword(formData: FormData) {
  const password = value(formData, "password");
  const confirmation = value(formData, "confirmation");
  if (password !== confirmation || !isValidNewPassword(password)) {
    redirect("/auth/reset-password?error=La%20contrase%C3%B1a%20debe%20coincidir%20y%20tener%20entre%2012%20y%20256%20caracteres.");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/forgot-password?error=El%20enlace%20de%20recuperaci%C3%B3n%20es%20inv%C3%A1lido%20o%20venci%C3%B3.%20Solicita%20uno%20nuevo.");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/auth/reset-password?error=No%20pudimos%20actualizar%20la%20contrase%C3%B1a.%20Solicita%20un%20enlace%20nuevo.");

  await supabase.auth.signOut();
  redirect("/auth/login?notice=Tu%20contrase%C3%B1a%20se%20actualiz%C3%B3.%20Inicia%20sesi%C3%B3n%20con%20la%20nueva.");
}
