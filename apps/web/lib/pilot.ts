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
