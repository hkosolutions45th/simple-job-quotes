/** Browser storage is accessed only by effects/events; memory keeps the app usable if blocked. */
const fallback = new Map<string, string>();
export function readDeviceText(key: string): string | null {
  try {
    const value = localStorage.getItem(key);
    if (value !== null) fallback.set(key, value);
    return value ?? fallback.get(key) ?? null;
  } catch {
    return fallback.get(key) ?? null;
  }
}
export function writeDeviceText(key: string, value: string): boolean {
  fallback.set(key, value);
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
export function clearDeviceText(key: string): boolean {
  fallback.set(key, "");
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
export function readDeviceJSON<T>(key: string, initial: T, validate: (value: unknown) => value is T): T {
  try {
    const raw = readDeviceText(key);
    if (raw === null) return initial;
    const value: unknown = JSON.parse(raw);
    return validate(value) ? value : initial;
  } catch {
    return initial;
  }
}
export function nextQuoteNumber(existingNumbers: string[] = []): string {
  const raw = Number(readDeviceText("nextQuoteNumber"));
  const stored = Number.isSafeInteger(raw) && raw >= 1001 ? raw : 1001;
  const maximum = existingNumbers.reduce((max, value) => {
    const match = /^IQ-(\d+)$/.exec(value);
    const n = match ? Number(match[1]) : 0;
    return Number.isSafeInteger(n) ? Math.max(max, n) : max;
  }, 1000);
  const number = Math.max(stored, maximum + 1);
  writeDeviceText("nextQuoteNumber", String(number + 1));
  return `IQ-${number}`;
}