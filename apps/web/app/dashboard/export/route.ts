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
  const { data: memberships } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id);
  const organizationId = memberships?.[0]?.organization_id;
  if (!organizationId) return NextResponse.redirect(new URL("/onboarding", request.url));
  const status = request.nextUrl.searchParams.get("status");
  const projectId = request.nextUrl.searchParams.get("project");
  const category = request.nextUrl.searchParams.get("category");
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  let query = supabase.from("expenses").select("title, category, vendor, expense_date, original_amount, currency, exchange_rate_to_cop, exchange_rate_date, exchange_rate_source, amount_cop, status, created_at, project:projects(name), subproject:subprojects(name), account:financial_accounts(name)").eq("organization_id", organizationId).order("expense_date", { ascending: false });
  if (status === "draft" || status === "confirmed") query = query.eq("status", status);
  if (projectId && /^[0-9a-f-]{36}$/i.test(projectId)) query = query.eq("project_id", projectId);
  if (category) query = query.eq("category", category);
  if (/^\d{4}-\d{2}-\d{2}$/.test(from || "")) query = query.gte("expense_date", from!);
  if (/^\d{4}-\d{2}-\d{2}$/.test(to || "")) query = query.lte("expense_date", to!);
  const { data, error } = await query;
  if (error) return new NextResponse("No fue posible exportar los gastos", { status: 500 });
  const rows = [
    ["Descripción", "Categoría", "Proveedor", "Proyecto", "Subproyecto", "Cuenta", "Fecha", "Valor original", "Moneda", "Tasa a COP", "Fecha de tasa", "Fuente de tasa", "Valor COP", "Estado", "Registrado"],
    ...(data ?? []).map((expense) => {
      const row = expense as typeof expense & { project: { name: string } | null; subproject: { name: string } | null; account: { name: string } | null };
      return [row.title, row.category, row.vendor, row.project?.name, row.subproject?.name, row.account?.name, row.expense_date, row.original_amount, row.currency, row.exchange_rate_to_cop, row.exchange_rate_date, row.exchange_rate_source, row.amount_cop, row.status === "confirmed" ? "Confirmado" : "Borrador", row.created_at];
    })
  ];
  const body = `\ufeff${rows.map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
  return new NextResponse(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=aldia-gastos-para-sheets.csv", "Cache-Control": "no-store" } });
}
