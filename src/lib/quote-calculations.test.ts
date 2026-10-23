import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPostalCode, formatJobAddress, rateFromAmount, lineTotal } from "./quote";

test("Canadian postal codes insert the required space without changing ZIP codes", () => {
  assert.equal(formatPostalCode("l9j0y6"), "L9J 0Y6");
  assert.equal(formatPostalCode("90210"), "90210");
});
test("job address includes street, city, province and formatted postal code", () => {
  assert.equal(formatJobAddress({ address: "75 McBride Trail", city: "Barrie", province: "ON", postalCode: "L9J0Y6" }), "75 McBride Trail, Barrie, ON, L9J 0Y6");
});
test("editing amount back-calculates unit rate", () => {
  assert.equal(rateFromAmount(250, 5), 50);
  assert.equal(rateFromAmount(250, 0), 0);
});
test("quantity and rate edits recalculate amount", () => {
  assert.equal(lineTotal({ id: "a", description: "Painting", quantity: 5, rate: 50 }), 250);
  assert.equal(lineTotal({ id: "a", description: "Painting", quantity: 6, rate: 50 }), 300);
});