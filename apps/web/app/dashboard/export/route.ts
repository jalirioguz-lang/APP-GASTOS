import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

function cell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/auth/login", request.url));
  const requestedOrganizationId = request.nextUrl.searchParams.get("organization");
  const { data: memberships } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id);
  const organizationId = requestedOrganizationId && /^[0-9a-f-]{36}$/i.test(requestedOrganizationId) ? requestedOrganizationId : memberships?.[0]?.organization_id;
  if (!organizationId) return NextResponse.redirect(new URL("/onboarding", request.url));
  const { data: readableOrganization } = await supabase.from("organizations").select("id").eq("id", organizationId).maybeSingle();
  if (!readableOrganization) return new NextResponse("No autorizado para exportar esta empresa", { status: 403 });
  const isDirectMember = (memberships ?? []).some((membership) => membership.organization_id === organizationId);
  if (!isDirectMember) return new NextResponse("La revisión cruzada no permite exportar", { status: 403 });
  const status = request.nextUrl.searchParams.get("status");
  const projectId = request.nextUrl.searchParams.get("project");
  const category = request.nextUrl.searchParams.get("category");
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  let query = supabase.from("expenses").select("title, category, vendor, expense_date, original_amount, currency, exchange_rate_to_cop, amount_cop, status, created_at").eq("organization_id", organizationId).order("expense_date", { ascending: false });
  if (status === "draft" || status === "confirmed") query = query.eq("status", status);
  if (projectId && /^[0-9a-f-]{36}$/i.test(projectId)) query = query.eq("project_id", projectId);
  if (category) query = query.eq("category", category);
  if (/^\d{4}-\d{2}-\d{2}$/.test(from || "")) query = query.gte("expense_date", from!);
  if (/^\d{4}-\d{2}-\d{2}$/.test(to || "")) query = query.lte("expense_date", to!);
  const { data, error } = await query;
  if (error) return new NextResponse("No fue posible exportar los gastos", { status: 500 });
  const rows = [
    ["Descripción", "Categoría", "Proveedor", "Fecha", "Valor original", "Moneda", "Tasa a COP", "Valor COP", "Estado", "Registrado"],
    ...(data ?? []).map((expense) => [expense.title, expense.category, expense.vendor, expense.expense_date, expense.original_amount, expense.currency, expense.exchange_rate_to_cop, expense.amount_cop, expense.status === "confirmed" ? "Confirmado" : "Borrador", expense.created_at])
  ];
  const body = `\ufeff${rows.map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
  return new NextResponse(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=aldia-gastos.csv", "Cache-Control": "no-store" } });
}
