/** A small raster is sufficient for the 42pt logo printed on a Letter quote. */
export const PDF_LOGO_MAX_EDGE = 256;
export const PDF_LOGO_QUALITY = 0.75;
export const PDF_BASE64_SAFE_LIMIT = 7_000_000;

export function pdfLogoDimensions(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Your business logo has invalid dimensions. Please re-upload it.");
  }
  const scale = Math.min(1, PDF_LOGO_MAX_EDGE / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function validatePdfAttachment(base64: string): string {
  if (!base64 || base64.length >= PDF_BASE64_SAFE_LIMIT) {
    throw new Error("This PDF is too large to email safely. Shorten the quote and try again.");
  }
  return base64;
}