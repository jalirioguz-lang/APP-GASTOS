import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AlDía APP",
  description: "Control de gastos para pequeñas empresas"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
