import { test } from "node:test";
import assert from "node:assert/strict";
import { pdfLogoDimensions, validatePdfAttachment } from "./pdf-logo";

test("large logos are resized with their aspect ratio preserved", () => {
  assert.deepEqual(pdfLogoDimensions(6000, 4000), { width: 256, height: 171 });
  assert.deepEqual(pdfLogoDimensions(4000, 6000), { width: 171, height: 256 });
  assert.deepEqual(pdfLogoDimensions(80, 40), { width: 80, height: 40 });
});

test("PDF attachments retain headroom below the 8,000,000-character email limit", () => {
  assert.equal(validatePdfAttachment("A".repeat(6_999_999)).length, 6_999_999);
  assert.throws(() => validatePdfAttachment("A".repeat(7_000_000)), /too large/);
  assert.throws(() => validatePdfAttachment("A".repeat(8_000_000)), /too large/);
});