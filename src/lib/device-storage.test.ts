import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { nextQuoteNumber, readDeviceJSON, readDeviceText, writeDeviceText } from "./device-storage";
import { duplicateQuoteRecord } from "./duplicate-quote";

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  writeDeviceText("nextQuoteNumber", "1001");
});
test("numbering starts at 1001 and increments without changing current quote", () => {
  writeDeviceText("instaquote:currentQuoteNo", "CUSTOM");
  assert.equal(nextQuoteNumber(), "IQ-1001");
  assert.equal(nextQuoteNumber(), "IQ-1002");
  assert.equal(readDeviceText("instaquote:currentQuoteNo"), "CUSTOM");
});
test("duplication skips existing sequential quote numbers", () => {
  assert.equal(nextQuoteNumber(["IQ-1003"]), "IQ-1004");
});
test("invalid counters and corrupt data restore safely", () => {
  writeDeviceText("nextQuoteNumber", "Infinity");
  assert.equal(nextQuoteNumber(), "IQ-1001");
  writeDeviceText("corrupt", "{");
  assert.deepEqual(readDeviceJSON("corrupt", [], Array.isArray), []);
});
const source = { id: "original", status: "accepted", currency: "CAD", total_amount: 320.04,
  line_items: { quoteNo: "IQ-1001", notes: "Private client information", items: [{ id: "item", quantity: 2, basePriceUSD: 100, rate: 142.56 }],
    rateFactor: 1.4256, taxRate: 13, taxEnabled: true,
    customer: { name: "Sarah", email: "sarah@example.com", phone: "4165550192", address: "100 Yonge St", city: "Toronto", postalCode: "M5C 2C7", terms: "50% deposit required" } } };
test("duplicates receive new identity, draft status, and blank client fields", () => {
  const copy = duplicateQuoteRecord(source, "IQ-1004", "user");
  assert.equal(copy.line_items.quoteNo, "IQ-1004");
  assert.equal("id" in copy, false);
  assert.equal(copy.status, "draft");
  for (const key of ["name", "email", "phone", "address", "city", "postalCode"]) assert.equal(copy.line_items.customer[key], "");
  assert.equal(copy.client_name, null);
  assert.equal(copy.client_email, null);
  assert.equal(copy.line_items.notes, "");
});
test("duplicates preserve item quantities, base prices and display prices", () => {
  const copy = duplicateQuoteRecord(source, "IQ-1004", "user");
  assert.deepEqual(copy.line_items.items, source.line_items.items);
  copy.line_items.items[0].quantity = 5;
  assert.equal(source.line_items.items[0]?.quantity, 2);
});
test("duplicates preserve currency, tax and deposit terms", () => {
  const copy = duplicateQuoteRecord(source, "IQ-1004", "user");
  assert.equal(copy.currency, "CAD");
  assert.equal(copy.line_items.rateFactor, 1.4256);
  assert.equal(copy.line_items.taxRate, 13);
  assert.equal(copy.line_items.taxEnabled, true);
  assert.equal(copy.line_items.customer.terms, "50% deposit required");
  assert.equal(copy.total_amount, 320.04);
});