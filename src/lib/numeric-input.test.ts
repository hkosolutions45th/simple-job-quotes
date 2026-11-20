import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeNumericDraft, numericDraftValue } from "./numeric-input";
import { lineTotal, subtotalOf, rateFromAmount } from "./quote";

test("numeric edits can stay completely blank until blur", () => {
  assert.equal(normalizeNumericDraft(""), "");
  assert.equal(String(numericDraftValue("")), "0");
});

test("integer edits remove leading zeros including 010 and 01000", () => {
  assert.equal(normalizeNumericDraft("01"), "1");
  assert.equal(normalizeNumericDraft("010"), "10");
  assert.equal(normalizeNumericDraft("01000"), "1000");
  assert.equal(normalizeNumericDraft("000"), "0");
});

test("decimal edits preserve 0. and 0.50", () => {
  assert.equal(normalizeNumericDraft("0."), "0.");
  assert.equal(normalizeNumericDraft("0.50"), "0.50");
  assert.equal(normalizeNumericDraft("00.50"), "0.50");
  assert.equal(normalizeNumericDraft(".5"), "0.5");
  assert.equal(numericDraftValue("0.50"), 0.5);
});

test("blank quantity, unit rate, amount and tax calculate as zero", () => {
  const zero = numericDraftValue("");
  const item = { id: "a", description: "Painting", quantity: 2, rate: 50 };
  assert.equal(lineTotal({ ...item, quantity: zero }), 0);
  assert.equal(lineTotal({ ...item, rate: zero }), 0);
  assert.equal(lineTotal({ ...item, rate: rateFromAmount(zero, 2) }), 0);
  const subtotal = subtotalOf([item]);
  const tax = subtotal * zero / 100;
  assert.equal(tax, 0);
  assert.equal(subtotal + tax, 100);
});

test("invalid input cannot introduce nonfinite or negative quote values", () => {
  assert.equal(normalizeNumericDraft("1.2.3"), null);
  assert.equal(normalizeNumericDraft("-1"), null);
  assert.equal(normalizeNumericDraft("1e3"), null);
  assert.equal(numericDraftValue("Infinity"), 0);
});