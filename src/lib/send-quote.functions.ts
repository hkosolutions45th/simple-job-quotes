import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cleanLineItemDescription, formatMoney } from "@/lib/quote";

const itemSchema = z.object({
  description: z.string().default(""),
  quantity: z.number().default(1),
  rate: z.number().default(0),
});

const payloadSchema = z.object({
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
  postalCode: z.string().max(24).default(""),
  terms: z.string().max(240).default(""),
  taxRate: z.number().default(13),
  currency: z.string().max(3).default("USD"),
  taxEnabled: z.boolean().default(true),
  items: z.array(itemSchema).max(200).default([]),
});

type Payload = z.infer<typeof payloadSchema>;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

let currentCode = "USD";
const money = (n: number) => formatMoney(n, currentCode);

function buildHtml(p: Payload) {
  currentCode = p.currency;
  const cityPostal = [p.city, p.postalCode].filter(Boolean).join(" ");
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
  <td style="padding:8px 4px;border-bottom:1px solid #e7e0d4;color:#7a7266">${n + 1}</td>
  <td style="padding:8px 4px;border-bottom:1px solid #e7e0d4;overflow-wrap:anywhere">${esc(cleanLineItemDescription(i.description) || "—")}</td>
  <td style="padding:8px 4px;border-bottom:1px solid #e7e0d4;text-align:right">${i.quantity}</td>
  <td style="padding:8px 4px;border-bottom:1px solid #e7e0d4;text-align:right">${money(i.rate)}</td>
  <td style="padding:8px 4px;border-bottom:1px solid #e7e0d4;text-align:right">${money(i.quantity * i.rate)}</td>
</tr>`,
    )
    .join("");

  const line = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:4px 0;color:#7a7266">${label}</td><td style="padding:4px 0;text-align:right;font-weight:${bold ? 700 : 400}">${value}</td></tr>`;

  return `<!doctype html><html><body style="margin:0;background:#f6efe3;font-family:Helvetica,Arial,sans-serif;color:#2b2722">
<div style="max-width:640px;margin:0 auto;padding:24px">
  <div style="background:#ffffff;border-radius:14px;padding:24px">
    <div style="display:flex;justify-content:space-between;border-bottom:2px solid #2b2722;padding-bottom:12px">
      <div><div style="font-size:20px;font-weight:700">${esc(p.business)}</div>
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#7a7266">Quotation / Estimate</div>
      ${[p.businessAddress, p.businessPhone, p.businessEmail].filter(Boolean).map((v) => `<div style="font-size:12px;color:#7a7266">${esc(v)}</div>`).join("")}</div>
      <div style="text-align:right;font-size:12px;color:#7a7266">Quote ${esc(p.quoteNo)}<br/>Issued ${issued}</div>
    </div>
    ${p.message.trim() ? `<p style="white-space:pre-wrap;line-height:1.6;margin:18px 0">${esc(p.message.trim())}</p>` : ""}
    <div style="font-size:13px;color:#7a7266;margin:16px 0">
      ${p.clientName ? `<div><strong style="color:#2b2722">Prepared for:</strong> ${esc(p.clientName)}</div>` : ""}
      ${p.jobAddress ? `<div><strong style="color:#2b2722">Job address:</strong> ${esc(p.jobAddress)}</div>` : ""}
      ${cityPostal ? `<div>${esc(cityPostal)}</div>` : ""}
      ${p.terms ? `<div><strong style="color:#2b2722">Payment terms:</strong> ${esc(p.terms)}</div>` : ""}
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="border-bottom:1px solid #2b2722">
        <th style="text-align:left;padding:6px 4px">#</th>
        <th style="text-align:left;padding:6px 4px">Item description</th>
        <th style="text-align:right;padding:6px 4px">Qty</th>
        <th style="text-align:right;padding:6px 4px">Unit rate</th>
        <th style="text-align:right;padding:6px 4px">Amount</th>
      </tr></thead>
      <tbody>${rows || `<tr><td colspan="5" style="padding:14px;text-align:center;color:#7a7266">No line items.</td></tr>`}</tbody>
    </table>
    <table style="margin-left:auto;margin-top:14px;width:260px;font-size:13px">
      ${line("Subtotal", money(subtotal))}
      ${line(`Sales tax ${p.taxEnabled ? `(${p.taxRate}%)` : "(exempt)"}`, money(tax))}
      ${line("Total due", money(total), true)}
      ${deposit !== null ? line(`Deposit to book (${depositPct}%)`, money(deposit), true) : ""}
    </table>
    <p style="margin-top:22px;font-size:11px;line-height:1.6;color:#7a7266">
      Quote valid for 30 days from the issue date. Prices assume standard site access and may be
      revised if hidden conditions are found. Thank you for the opportunity to quote — ${esc(p.business)}.
    </p>
  </div>
  <p style="text-align:center;font-size:11px;color:#7a7266;margin-top:14px">To save a copy, print this email and choose "Save as PDF".</p>
</div></body></html>`;
}

export const sendQuoteEmail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => payloadSchema.parse(data))
  .handler(async ({ data }) => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const resendKey = process.env["RESEND_API_KEY"];
    if (!lovableKey || !resendKey) {
      throw new Error("Email is not configured yet.");
    }

    const response = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from: `${data.business} <onboarding@resend.dev>`,
        to: [data.to],
        ...(data.businessEmail.includes("@") ? { reply_to: data.businessEmail } : {}),
        subject: `Quote ${data.quoteNo} from ${data.business}`,
        html: buildHtml(data),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Resend request failed [${response.status}]: ${errorBody}`);
      throw new Error(`Email send failed [${response.status}]: ${errorBody}`);
    }

    const result = (await response.json()) as { id?: string };
    return { id: result.id ?? null };
  });
