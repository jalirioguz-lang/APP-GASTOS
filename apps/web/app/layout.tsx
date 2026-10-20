import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AlDía | Gastos claros",
  description: "Control de gastos para empresas, hogares, proyectos y viajes"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
