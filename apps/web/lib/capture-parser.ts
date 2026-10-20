export type CapturedCurrency = "COP" | "USD" | "EUR";

export type ParsedExpenseMessage = {
  amount: number;
  currency: CapturedCurrency;
  title: string;
};

function normalizedText(value: string) {
  return value.toLocaleLowerCase("es-CO").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function detectCurrency(body: string): CapturedCurrency {
  const text = normalizedText(body);
  if (/(?:\b(?:usd|dolares?|dolar)\b|us\$)/.test(text)) return "USD";
  if (/(?:\b(?:eur|euros?|euro)\b|€)/.test(text)) return "EUR";
  return "COP";
}

function parseNumber(raw: string, multiplier = 1) {
  const compact = raw.replace(/\s/g, "");
  let value: number;
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(compact)) {
    value = Number(compact.replace(/[.,]/g, ""));
  } else if (compact.includes(",") && compact.includes(".")) {
    const decimalIndex = Math.max(compact.lastIndexOf(","), compact.lastIndexOf("."));
    value = Number(`${compact.slice(0, decimalIndex).replace(/[.,]/g, "")}.${compact.slice(decimalIndex + 1)}`);
  } else {
    value = Number(compact.replace(",", "."));
  }
  const amount = value * multiplier;
  return Number.isFinite(amount) && amount > 0 && amount <= 9999999999999999 ? amount : null;
}

export function parseExpenseMessage(body: string): ParsedExpenseMessage | null {
  const currency = detectCurrency(body);
  const thousandMatch = body.match(/(?:\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:mil|k)\b/i);
  const amountMatch = thousandMatch ?? body.match(/(?:\$\s*)?(\d{1,3}(?:[.,\s]\d{3})+|\d+(?:[.,]\d{1,2})?)(?!\d)/);
  if (!amountMatch) return null;
  const amount = parseNumber(amountMatch[1], thousandMatch ? 1000 : 1);
  if (amount === null) return null;
  const title = body
    .replace(amountMatch[0], "")
    .replace(/\b(?:en\s+)?caja\s+menor\b/gi, "")
    .replace(/\b(?:cop|pesos?|usd|dolares?|dolar|eur|euros?|euro)\b/gi, "")
    .replace(/[$€]/g, "")
    .replace(/^\s*(?:de|por|pague|pague|compre|compre)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200) || "Gasto registrado por mensaje";
  return { amount, currency, title };
}
