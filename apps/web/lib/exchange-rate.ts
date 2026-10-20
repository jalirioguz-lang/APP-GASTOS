export type ExchangeRateQuote = {
  rate: number;
  quotedOn: string;
  source: "open.er-api.com";
};

export async function currentCopRate(currency: "USD" | "EUR", request = fetch): Promise<ExchangeRateQuote | null> {
  try {
    const response = await request(`https://open.er-api.com/v6/latest/${currency}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return null;
    const payload = await response.json() as { rates?: { COP?: unknown } };
    const rate = Number(payload.rates?.COP);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    return { rate, quotedOn: new Date().toISOString().slice(0, 10), source: "open.er-api.com" };
  } catch {
    return null;
  }
}
