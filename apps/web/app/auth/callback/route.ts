import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const response = NextResponse.redirect(new URL("/onboarding", request.url));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!code || !url || !key) return NextResponse.redirect(new URL("/auth/login?error=Enlace%20inválido", request.url));
  const supabase = createServerClient(url, key, { cookies: { getAll: () => request.cookies.getAll(), setAll: (items) => items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) } });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/auth/login?error=Enlace%20de%20verificación%20inválido%20o%20vencido", request.url));
  return response;
}
