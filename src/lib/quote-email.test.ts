import { test } from "node:test";
import assert from "node:assert/strict";
import { buildQuoteMailto, buildResendPayload, emailErrorMessage, payloadSchema, readResendResult } from "./quote-email";

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
test("empty or malformed provider failures always have a clear fallback", async () => {
  for (const body of ["", "{}", "null", '{"message":"  "}', '{"error":{}}']) {
    assert.deepEqual(await readResendResult(new Response(body, { status: 403 })), {
      sent: false, status: 403, error: "Email service not configured",
    });
  }
  assert.equal(emailErrorMessage(new Error("")), "Email service not configured");
  assert.equal(emailErrorMessage({ message: "Domain is not verified" }), "Domain is not verified");
});
test("a blank confirmation ID cannot count as a successful send", async () => {
  assert.equal((await readResendResult(Response.json({ id: " " }))).sent, false);
});
test("Mail fallback encodes the recipient, subject and full quote without an attachment", () => {
  const data = payloadSchema.parse({ ...quote, message: "Paint & repair?\nThanks!", business: "A & B", clientName: "Sam", jobAddress: "10 Main St", city: "Toronto", postalCode: "M5V 1A1", terms: "50% deposit required" });
  const href = buildQuoteMailto(data);
  const url = new URL(href);
  assert.equal(decodeURIComponent(url.pathname), "client@example.com");
  assert.equal(url.searchParams.get("subject"), "Quote IQ-2045 from A & B");
  const body = url.searchParams.get("body") ?? "";
  assert.ok(body.includes("Paint & repair?\nThanks!"));
  assert.ok(body.includes("Painting — 2 × $100.00 = $200.00"));
  assert.ok(body.includes("Total: $226.00"));
  assert.ok(body.includes("10 Main St, Toronto, M5V 1A1"));
  assert.ok(body.includes("Payment terms: 50% deposit required"));
  assert.equal(url.searchParams.has("attachment"), false);
});