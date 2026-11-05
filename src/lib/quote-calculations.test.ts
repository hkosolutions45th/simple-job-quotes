import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPostalCode, formatJobAddress, formatAddressLines, rateFromAmount, lineTotal, generateLineItems, quoteValidityDays, quoteValidUntil, parseValidityInput } from "./quote";

test("validity can remain blank during editing and falls back to 30 at normalization", () => {
  assert.equal(parseValidityInput(""), undefined);
  assert.equal(quoteValidityDays(parseValidityInput("")), 30);
  assert.equal(parseValidityInput("45"), 45);
});

test("quote validity defaults to 30 days for existing quotes", () => {
  assert.equal(quoteValidityDays(undefined), 30);
  assert.equal(quoteValidUntil(new Date(2026, 10, 4)).getDate(), 4);
  assert.equal(quoteValidUntil(new Date(2026, 10, 4)).getMonth(), 11);
});
test("each quote's selected validity determines its expiration date", () => {
  assert.equal(quoteValidityDays(45), 45);
  assert.equal(quoteValidUntil(new Date(2026, 10, 4), 45).getDate(), 19);
  assert.equal(quoteValidUntil(new Date(2026, 10, 4), 45).getMonth(), 11);
});

test("Canadian postal codes insert the required space without changing ZIP codes", () => {
  assert.equal(formatPostalCode("l9j0y6"), "L9J 0Y6");
  assert.equal(formatPostalCode("90210"), "90210");
});
test("job address includes street, city, province and formatted postal code", () => {
  assert.equal(formatJobAddress({ address: "75 McBride Trail", city: "Barrie", province: "ON", postalCode: "L9J0Y6" }), "75 McBride Trail, Barrie, ON, L9J 0Y6");
});
test("document addresses stack street, comma-separated city/province, and postal code", () => {
  assert.deepEqual(formatAddressLines({ address: "75 McBride Trail", city: "Barrie", province: "Ontario", postalCode: "L9J0Y6" }), ["75 McBride Trail", "Barrie, Ontario", "L9J 0Y6"]);
});
test("document addresses omit missing fields without blank lines or stray commas", () => {
  assert.deepEqual(formatAddressLines({ address: "100 Main St", province: "ON" }), ["100 Main St", "ON"]);
  assert.deepEqual(formatAddressLines({ address: "", city: "Barrie", postalCode: "90210" }), ["Barrie", "90210"]);
});
test("editing amount back-calculates unit rate", () => {
  assert.equal(rateFromAmount(250, 5), 50);
  assert.equal(rateFromAmount(250, 0), 0);
});
test("quantity and rate edits recalculate amount", () => {
  assert.equal(lineTotal({ id: "a", description: "Painting", quantity: 5, rate: 50 }), 250);
  assert.equal(lineTotal({ id: "a", description: "Painting", quantity: 6, rate: 50 }), 300);
});

test("street numbers never become line-item quantities", () => {
  const items = generateLineItems("Replace deck railing at 124 Mapleview Dr with 40 linear feet of railing");
  const deck = items.find((i) => /deck|fence/i.test(i.description));
  assert.ok(deck, "deck item generated from notes");
  assert.equal(deck.quantity, 40);
});