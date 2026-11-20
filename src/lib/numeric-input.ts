/** Preserve blank and unfinished decimal edits while removing redundant integer zeros. */
export function normalizeNumericDraft(value: string): string | null {
  if (!/^\d*(?:\.\d*)?$/.test(value)) return null;
  const normalized = value.replace(/^0+(?=\d)/, "");
  return normalized.startsWith(".") ? `0${normalized}` : normalized;
}

/** Quote calculations always receive finite numbers, including when the editor is blank. */
export function numericDraftValue(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}