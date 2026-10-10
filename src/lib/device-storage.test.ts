import { test, expect, beforeEach } from "bun:test";
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
  expect(nextQuoteNumber()).toBe("IQ-1001");
  expect(nextQuoteNumber()).toBe("IQ-1002");
  expect(readDeviceText("instaquote:currentQuoteNo")).toBe("CUSTOM");
});
test("duplication skips existing sequential quote numbers", () => {
  expect(nextQuoteNumber(["IQ-1003"])).toBe("IQ-1004");
});
test("invalid counters and corrupt data restore safely", () => {
  writeDeviceText("nextQuoteNumber", "Infinity");
  expect(nextQuoteNumber()).toBe("IQ-1001");
  writeDeviceText("corrupt", "{");
  expect(readDeviceJSON("corrupt", [], Array.isArray)).toEqual([]);
});
const source = { id: "original", status: "accepted", currency: "CAD", total_amount: 320.04,
  line_items: { quoteNo: "IQ-1001", notes: "Private client information", items: [{ id: "item", quantity: 2, basePriceUSD: 100, rate: 142.56 }],
    rateFactor: 1.4256, taxRate: 13, taxEnabled: true,
    customer: { name: "Sarah", email: "sarah@example.com", phone: "4165550192", address: "100 Yonge St", city: "Toronto", postalCode: "M5C 2C7", terms: "50% deposit required" } } };
test("duplicates receive new identity, draft status, and blank client fields", () => {
  const copy = duplicateQuoteRecord(source, "IQ-1004", "user");
  expect(copy.line_items.quoteNo).toBe("IQ-1004");
  expect(copy).not.toHaveProperty("id");
  expect(copy.status).toBe("draft");
  for (const key of ["name", "email", "phone", "address", "city", "postalCode"]) expect(copy.line_items.customer[key]).toBe("");
  expect(copy.client_name).toBeNull();
  expect(copy.client_email).toBeNull();
  expect(copy.line_items.notes).toBe("");
});
test("duplicates preserve item quantities, base prices and display prices", () => {
  const copy = duplicateQuoteRecord(source, "IQ-1004", "user");
  expect(copy.line_items.items).toEqual(source.line_items.items);
  copy.line_items.items[0].quantity = 5;
  expect(source.line_items.items[0].quantity).toBe(2);
});
test("duplicates preserve currency, tax and deposit terms", () => {
  const copy = duplicateQuoteRecord(source, "IQ-1004", "user");
  expect(copy.currency).toBe("CAD");
  expect(copy.line_items.rateFactor).toBe(1.4256);
  expect(copy.line_items.taxRate).toBe(13);
  expect(copy.line_items.taxEnabled).toBe(true);
  expect(copy.line_items.customer.terms).toBe("50% deposit required");
  expect(copy.total_amount).toBe(320.04);
});