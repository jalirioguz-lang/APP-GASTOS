export const PILOT_CATEGORIES = [
  "caja_menor",
  "papeleria_oficina",
  "transporte",
  "materiales_insumos",
  "servicios",
  "honorarios_contratistas_simulados",
  "reembolsos",
  "gastos_administrativos"
] as const;

export type PilotCategory = typeof PILOT_CATEGORIES[number];

const CATEGORY_LABELS: Record<PilotCategory, string> = {
  caja_menor: "Caja menor",
  papeleria_oficina: "Papelería y oficina",
  transporte: "Transporte",
  materiales_insumos: "Materiales e insumos",
  servicios: "Servicios",
  honorarios_contratistas_simulados: "Honorarios y contratistas",
  reembolsos: "Reembolsos",
  gastos_administrativos: "Gastos administrativos"
};

export function categoryLabel(category: string) {
  return CATEGORY_LABELS[category as PilotCategory] ?? category.replaceAll("_", " ");
}
