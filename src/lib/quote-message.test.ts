import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteMessage } from "./quote";

const base = {
  business: "H&K Contracting",
  total: 1250,
  quoteNo: "Q-1042",
};

const address = { address: "", city: "", province: "", postalCode: "" };

test("a blank line separates the validity line from the reply call-to-action", () => {
  const message = quoteMessage({
    ...base,
    customer: { ...address, name: "Jane Doe", terms: "50% deposit required", validityDays: 30 },
  });
  assert.ok(
    message.includes(
      "Quote valid for 30 days from the issue date.\n\nReply to this message to book a start date",
    ),
  );
});

test("the blank line is present even when no payment terms are set", () => {
  const message = quoteMessage({
    ...base,
    customer: { ...address, name: "Jane Doe", terms: "", validityDays: 45 },
  });
  assert.ok(
    message.includes(
      "Quote valid for 45 days from the issue date.\n\nReply to this message to book a start date",
    ),
  );
});
