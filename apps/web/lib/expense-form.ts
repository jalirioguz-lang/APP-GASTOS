export const ALLOWED_RECEIPT_TYPES = ["image/jpeg", "image/png", "application/pdf"] as const;
export const MAX_RECEIPT_BYTES = 5_000_000;

/**
 * The browser represents an untouched optional file input as an empty File,
 * rather than omitting it from FormData. Treat only that browser placeholder
 * as absent; a named empty upload remains invalid instead of being ignored.
 */
export function optionalReceipt(value: FormDataEntryValue | null): File | null | undefined {
  if (value === null) return null;
  if (!(value instanceof File)) return undefined;
  if (value.size === 0 && value.name === "") return null;
  return value;
}

export function hasAcceptedReceipt(value: File | null | undefined): boolean {
  return value !== undefined && (value === null || (
    value.size > 0
    && value.size <= MAX_RECEIPT_BYTES
    && ALLOWED_RECEIPT_TYPES.includes(value.type as (typeof ALLOWED_RECEIPT_TYPES)[number])
  ));
}

export function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}
