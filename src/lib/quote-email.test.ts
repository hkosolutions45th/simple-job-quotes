import { test } from "node:test";
import assert from "node:assert/strict";
import { buildResendPayload, payloadSchema, readResendResult } from "./quote-email";

const quote = payloadSchema.parse({ to: "client@example.com", business: "Contractor Business", quoteNo: "IQ-2045", message: "Your requested painting quote", items: [{ description: "Painting", quantity: 2, rate: 100 }], pdfBase64: "JVBERi0=" });

test("quotes always use the branded verified-domain sender", () => {
  assert.equal(buildResendPayload(quote, "contractor@example.com").from, "InstaQuote <instaquote@hkosolutions.ca>");
});
test("replies go to the logged-in contractor", () => {
  assert.equal(buildResendPayload(quote, "contractor@example.com").reply_to, "contractor@example.com");
});
test("missing contractor email uses the required fallback", () => {
  assert.equal(buildResendPayload(quote, undefined).reply_to, "nventures303@gmail.com");
});
test("recipient, subject, HTML message and PDF come from the current quote", () => {
  const payload = buildResendPayload(quote, "contractor@example.com");
  assert.deepEqual(payload.to, ["client@example.com"]);
  assert.equal(payload.subject, "Quote IQ-2045 from Contractor Business");
  assert.ok(payload.html.includes(quote.message));
  assert.ok(payload.html.includes("Painting"));
  assert.deepEqual(payload.attachments, [{ filename: "Quote_IQ-2045.pdf", content: "JVBERi0=" }]);
});
test("only a confirmed 200 response counts as email success", async () => {
  assert.deepEqual(await readResendResult(Response.json({ id: "resend-email-id" })), { sent: true, status: 200, id: "resend-email-id" });
  assert.equal((await readResendResult(Response.json({ id: "id" }, { status: 202 }))).sent, false);
  assert.equal((await readResendResult(Response.json({}))).sent, false);
});
test("provider setup failures retain their exact message", async () => {
  const message = "The hkosolutions.ca domain is not verified.";
  assert.deepEqual(await readResendResult(Response.json({ message }, { status: 403 })), { sent: false, status: 403, error: message });
});