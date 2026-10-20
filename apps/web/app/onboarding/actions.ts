"use server";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

export async function createOrganization(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const name = String(formData.get("organizationName") || "").trim();
  if (name.length < 2 || name.length > 120) redirect("/onboarding?error=Nombre%20de%20empresa%20inválido");
  const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const { error } = await supabase.from("organizations").insert({ name, slug, created_by: user.id, base_currency: "COP" });
  if (error) redirect("/onboarding?error=No%20fue%20posible%20crear%20la%20empresa");
  redirect("/dashboard");
}
