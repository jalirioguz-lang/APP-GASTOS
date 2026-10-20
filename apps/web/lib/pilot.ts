export const PILOT_CATEGORIES = [
  "caja_menor",
  "papeleria_oficina",
  "transporte",
  "materiales_insumos",
  "materiales_obra",
  "mano_obra",
  "maquinaria_equipo",
  "subcontratos",
  "seguridad_obra",
  "servicios",
  "honorarios_contratistas_simulados",
  "reembolsos",
  "gastos_administrativos",
  "alimentacion_hogar",
  "vivienda_servicios",
  "salud_educacion",
  "otros"
] as const;

export type PilotCategory = typeof PILOT_CATEGORIES[number];

const CATEGORY_LABELS: Record<PilotCategory, string> = {
  caja_menor: "Caja menor",
  papeleria_oficina: "Papelería y oficina",
  transporte: "Transporte",
  materiales_insumos: "Materiales e insumos",
  materiales_obra: "Materiales de obra",
  mano_obra: "Mano de obra",
  maquinaria_equipo: "Maquinaria y equipo",
  subcontratos: "Subcontratos",
  seguridad_obra: "Seguridad de obra",
  servicios: "Servicios",
  honorarios_contratistas_simulados: "Honorarios y contratistas",
  reembolsos: "Reembolsos",
  gastos_administrativos: "Gastos administrativos",
  alimentacion_hogar: "Alimentación y mercado",
  vivienda_servicios: "Vivienda y servicios",
  salud_educacion: "Salud y educación",
  otros: "Otros gastos"
};

export function categoryLabel(category: string) {
  return CATEGORY_LABELS[category as PilotCategory] ?? category.replaceAll("_", " ");
}

const CATEGORY_KEYWORDS: Array<{ category: PilotCategory; keywords: string[] }> = [
  { category: "materiales_obra", keywords: ["cemento", "varilla", "ladrillo", "arena", "grava", "concreto", "tuberia", "pintura", "obra"] },
  { category: "mano_obra", keywords: ["albanil", "maestro", "jornal", "nomina", "ayudante", "mano de obra"] },
  { category: "maquinaria_equipo", keywords: ["retroexcavadora", "andamio", "mezcladora", "taladro", "equipo", "maquinaria"] },
  { category: "subcontratos", keywords: ["subcontrato", "contratista", "electricista", "plomero"] },
  { category: "seguridad_obra", keywords: ["casco", "guante", "arnes", "epp", "seguridad"] },
  { category: "alimentacion_hogar", keywords: ["mercado", "supermercado", "comida", "restaurante"] },
  { category: "vivienda_servicios", keywords: ["arriendo", "luz", "agua", "gas", "internet", "vivienda"] },
  { category: "transporte", keywords: ["taxi", "bus", "gasolina", "peaje", "transporte"] }
];

export function suggestCategory(description: string): PilotCategory | null {
  const normalized = description.toLocaleLowerCase("es-CO").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return CATEGORY_KEYWORDS.find(({ keywords }) => keywords.some((keyword) => normalized.includes(keyword)))?.category ?? null;
}
