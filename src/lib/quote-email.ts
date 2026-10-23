import { z } from "zod";
import { cleanLineItemDescription, formatMoney, formatJobAddress } from "./quote";

const itemSchema = z.object({
  description: z.string().default(""),
  quantity: z.number().default(1),
  rate: z.number().default(0),
});

export const payloadSchema = z.object({
  to: z.string().email(),
  message: z.string().max(4000).default(""),
  business: z.string().min(1).max(120),
  businessPhone: z.string().max(40).default(""),
  businessEmail: z.string().max(160).default(""),
  businessAddress: z.string().max(300).default(""),
  quoteNo: z.string().min(1).max(60),
  clientName: z.string().max(120).default(""),
  jobAddress: z.string().max(240).default(""),
  city: z.string().max(120).default(""),
  province: z.string().max(120).default(""),
  postalCode: z.string().max(24).default(""),
  terms: z.string().max(240).default(""),
  taxRate: z.number().default(13),
  currency: z.string().max(3).default("USD"),
  taxEnabled: z.boolean().default(true),
  items: z.array(itemSchema).max(200).default([]),
  pdfBase64: z.string().max(8_000_000).regex(/^[A-Za-z0-9+/=]*$/).optional(),
});

export type Payload = z.infer<typeof payloadSchema>;

export function emailErrorMessage(error: unknown): string {
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error && typeof error === "object" && "message" in error &&
      typeof error.message === "string" && error.message.trim()) return error.message.trim();
  return "No error details were returned";
}

export function buildQuoteMailto(p: { province?: string } & Pick<Payload, "to" | "business" | "quoteNo" | "message" | "clientName" | "jobAddress" | "city" | "postalCode" | "items" | "currency" | "taxRate" | "taxEnabled" | "terms">) {
  const money = (value: number) => formatMoney(value, p.currency);
  const subtotal = p.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const tax = p.taxEnabled ? subtotal * p.taxRate / 100 : 0;
  const subject = `Quote ${p.quoteNo} from ${p.business}`;
  const body = [
    p.message.trim(), "", subject,
    p.clientName ? `Prepared for: ${p.clientName}` : "",
    formatJobAddress({ address: p.jobAddress, city: p.city, province: p.province, postalCode: p.postalCode }), "",
    ...p.items.map((item) => `${item.description} — ${item.quantity} × ${money(item.rate)} = ${money(item.quantity * item.rate)}`),
    "", `Subtotal: ${money(subtotal)}`, `Tax: ${money(tax)}`, `Total: ${money(subtotal + tax)}`,
    p.terms ? `Payment terms: ${p.terms}` : "",
  ].join("\n").trim();
  return `mailto:${encodeURIComponent(p.to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function buildHtml(p: Payload) {
  const money = (n: number) => formatMoney(n, p.currency);

  const subtotal = p.items.reduce((sum, i) => sum + i.quantity * i.rate, 0);
  const tax = p.taxEnabled ? (subtotal * p.taxRate) / 100 : 0;
  const total = subtotal + tax;
  const depositPct = Number(p.terms.match(/(\d{1,3})\s*%/)?.[1] ?? 0);
  const deposit = depositPct > 0 && depositPct < 100 ? (total * depositPct) / 100 : null;
  const issued = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const rows = p.items
    .map(
      (i, n) => `<tr>
  <td style="padding:10px 8px;border-bottom:1px solid #e7e0d4;vertical-align:top;color:#7a7266">${n + 1}</td>
  <td style="padding:10px 8px;border-bottom:1px solid #e7e0d4;vertical-align:top;overflow-wrap:anywhere">${esc(cleanLineItemDescription(i.description) || "—")}</td>
  <td style="padding:10px 8px;border-bottom:1px solid #e7e0d4;vertical-align:top;text-align:right">${i.quantity}</td>
  <td style="padding:10px 8px;border-bottom:1px solid #e7e0d4;vertical-align:top;text-align:right">${money(i.rate)}</td>
  <td style="padding:10px 8px;border-bottom:1px solid #e7e0d4;vertical-align:top;text-align:right">${money(i.quantity * i.rate)}</td>
</tr>`,
    )
    .join("");

  const line = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:5px 0;color:#6b6358">${label}</td><td style="padding:5px 0;text-align:right;font-weight:${bold ? 700 : 400}">${value}</td></tr>`;

  const muted = "color:#6b6358";
  const contact = [p.businessAddress, p.businessPhone, p.businessEmail].filter(Boolean)
    .map((v) => `<div style="font-size:13px;${muted};line-height:1.5">${esc(v)}</div>`).join("");
  const detail = (label: string, value: string) => value
    ? `<tr><td style="padding:3px 12px 3px 0;font-size:13px;font-weight:700;color:#2b2722;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:3px 0;font-size:13px;color:#2b2722">${value}</td></tr>`
    : "";
  const address = esc(formatJobAddress({ address: p.jobAddress, city: p.city, province: p.province, postalCode: p.postalCode }));
  const message = p.message.trim()
    ? `<tr><td style="padding:22px 28px 0;font-size:15px;line-height:1.6;color:#2b2722">${esc(p.message.trim()).replace(/\r?\n/g, "<br/>")}</td></tr>`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Quote ${esc(p.quoteNo)}</title></head>
<body style="margin:0;padding:0;background:#f4efe6;font-family:Helvetica,Arial,sans-serif;color:#2b2722">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e7e0d4">
  <tr><td style="background:#2b2722;padding:22px 28px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:top">
        <div style="font-size:22px;font-weight:700;color:#ffffff">${esc(p.business)}</div>
        <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#e9b48f;margin-top:4px;font-weight:700">Quotation / Estimate</div>
      </td>
      <td style="vertical-align:top;text-align:right;font-size:13px;color:#f4efe6;line-height:1.6">
        <strong style="font-size:15px;color:#ffffff">${esc(p.quoteNo)}</strong><br/>Issued ${issued}
      </td>
    </tr></table>
  </td></tr>
  ${contact ? `<tr><td style="padding:16px 28px 0">${contact}</td></tr>` : ""}
  ${message}
  <tr><td style="padding:20px 28px 0">
    <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;${muted};margin-bottom:6px">Prepared for</div>
    <table role="presentation" cellpadding="0" cellspacing="0">
      ${detail("Client", esc(p.clientName))}
      ${detail("Job site", address)}
      ${detail("Payment terms", esc(p.terms))}
    </table>
  </td></tr>
  <tr><td style="padding:20px 28px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">
      <thead><tr style="background:#f4efe6">
        <th align="left" style="padding:10px 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #2b2722">#</th>
        <th align="left" style="padding:10px 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #2b2722">Description</th>
        <th align="right" style="padding:10px 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #2b2722">Qty</th>
        <th align="right" style="padding:10px 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #2b2722">Rate</th>
        <th align="right" style="padding:10px 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #2b2722">Amount</th>
      </tr></thead>
      <tbody>${rows || `<tr><td colspan="5" style="padding:16px;text-align:center;${muted}">No line items.</td></tr>`}</tbody>
    </table>
  </td></tr>
  <tr><td style="padding:16px 28px 0">
    <table role="presentation" cellpadding="0" cellspacing="0" align="right" style="width:280px;max-width:100%;font-size:14px">
      ${line("Subtotal", money(subtotal))}
      ${line(`Tax ${p.taxEnabled ? `(${p.taxRate}%)` : "(exempt)"}`, money(tax))}
      <tr><td style="padding:12px 0 4px;border-top:2px solid #2b2722;font-size:16px;font-weight:700">Total due</td><td style="padding:12px 0 4px;border-top:2px solid #2b2722;text-align:right;font-size:18px;font-weight:700;color:#b5532a">${money(total)}</td></tr>
      ${deposit !== null ? line(`Deposit to book (${depositPct}%)`, money(deposit), true) : ""}
    </table>
  </td></tr>
  <tr><td style="padding:24px 28px 26px;font-size:12px;line-height:1.6;${muted}">
    Quote valid for 30 days from the issue date. Prices assume standard site access and may be revised if hidden conditions are found.${p.pdfBase64 ? " The full quote is attached as a PDF." : ""}<br/><br/>
    Thank you for the opportunity — <strong style="color:#2b2722">${esc(p.business)}</strong>. Simply reply to this email with any questions.
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

export function buildResendPayload(data: Payload, contractorEmail: unknown) {
  const email = z.string().trim().email().safeParse(contractorEmail);
  return {
    from: "InstaQuote <instaquote@hkosolutions.ca>",
    to: [data.to],
    reply_to: email.success ? email.data : "nventures303@gmail.com",
    subject: `Quote ${data.quoteNo} from ${data.business}`,
    html: buildHtml(data),
    ...(data.pdfBase64 ? { attachments: [{
      filename: `Quote_${data.quoteNo.replace(/[^A-Za-z0-9_-]/g, "_")}.pdf`,
      content: data.pdfBase64,
    }] } : {}),
  };
}

export async function readResendResult(response: Response) {
  const raw = await response.text();
  let parsed: Record<string, unknown> = {};
  let isJson = false;
  try {
    const value: unknown = JSON.parse(raw);
    isJson = true;
    if (value && typeof value === "object" && !Array.isArray(value)) parsed = value as Record<string, unknown>;
  } catch { /* Preserve a non-JSON provider error. */ }
  if (response.status !== 200 || parsed["error"] || typeof parsed["id"] !== "string" || !parsed["id"].trim()) {
    const providerError = typeof parsed["message"] === "string" && parsed["message"].trim() ? parsed["message"] : parsed["error"];
    const detail = emailErrorMessage(providerError || (!isJson ? raw : undefined));
    const error = `Resend rejected the email (HTTP ${response.status}): ${detail}`;
    console.error(`Resend request failed [${response.status}]: ${raw}`);
    return { sent: false as const, status: response.status, error };
  }
  return { sent: true as const, status: 200 as const, id: parsed["id"] };
}
