"use server";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

export async function createOrganization(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const name = String(formData.get("organizationName") || "").trim();
  const workspaceType = String(formData.get("workspaceType") || "").trim();
  if (name.length < 2 || name.length > 120 || !["business", "household", "personal"].includes(workspaceType)) redirect("/onboarding?error=Revisa%20el%20nombre%20y%20el%20tipo%20de%20espacio");
  const { data: existingOrganization } = await supabase.from("organizations").select("id").eq("created_by", user.id).eq("name", name).maybeSingle();
  if (existingOrganization) redirect("/workspace");
  const slugBase = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "empresa";
  const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;
  const { error } = await supabase.from("organizations").insert({ name, slug, created_by: user.id, base_currency: "COP", workspace_type: workspaceType });
  if (error) {
    const { data: recoveredOrganization } = await supabase.from("organizations").select("id").eq("created_by", user.id).eq("name", name).maybeSingle();
    if (recoveredOrganization) redirect("/workspace");
    redirect("/onboarding?error=El%20nombre%20de%20empresa%20no%20est%C3%A1%20disponible");
  }
  redirect("/workspace");
}
