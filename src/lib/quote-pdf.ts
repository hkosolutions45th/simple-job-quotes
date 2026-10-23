import { cleanLineItemDescription, formatMoney, formatJobAddress, type Customer } from "@/lib/quote";

type PdfInput = {
  business: string;
  logo?: string | null;
  businessContact: { phone: string; email: string; address: string };
  quoteNo: string;
  customer: Customer;
  items: { description: string; quantity: number; rate: number }[];
  taxRate: number;
  taxEnabled: boolean;
  currency: string;
};

/** Builds the quote as a Letter PDF in the browser and returns it as base64 (no data: prefix). */
export async function buildQuotePdfBase64(p: PdfInput): Promise<string> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const m = (n: number) => formatMoney(n, p.currency);
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const L = 40;
  const R = W - 40;

  let headerLeft = L;
  if (p.logo) {
    try {
      const response = await fetch(p.logo);
      if (!response.ok) throw new Error("Logo could not be downloaded");
      const bitmap = await createImageBitmap(await response.blob());
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Logo could not be prepared");
      context.drawImage(bitmap, 0, 0);
      const scale = Math.min(42 / bitmap.width, 42 / bitmap.height);
      doc.addImage(canvas.toDataURL("image/png"), "PNG", L, 30, bitmap.width * scale, bitmap.height * scale);
      bitmap.close();
      headerLeft += 52;
    } catch {
      throw new Error("Your business logo could not be added to the PDF. Re-upload the logo in Business Settings and try again.");
    }
  }
  const businessLines = doc.setFont("helvetica", "bold").setFontSize(18).splitTextToSize(p.business, W / 2 - headerLeft);
  doc.text(businessLines, headerLeft, 50);
  const headerBottom = 50 + (businessLines.length - 1) * 21;
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(120);
  doc.text("QUOTATION / ESTIMATE", headerLeft, headerBottom + 14);
  let y = headerBottom + 28;
  for (const v of [p.businessContact.address, p.businessContact.phone, p.businessContact.email].filter(Boolean)) {
    doc.text(v, L, y);
    y += 12;
  }
  const issued = new Date();
  const valid = new Date(issued.getTime() + 30 * 86400000);
  const f = (d: Date) => d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.setTextColor(40).setFont("helvetica", "bold").setFontSize(12).text(`Quote ${p.quoteNo}`, R, 50, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(120);
  doc.text(`Issued ${f(issued)}`, R, 64, { align: "right" });
  doc.text(`Valid to ${f(valid)}`, R, 76, { align: "right" });

  y = Math.max(y, 90) + 8;
  doc.setDrawColor(40).setLineWidth(1.5).line(L, y, R, y);
  y += 20;
  const c = p.customer;
  const left = ["PREPARED FOR", c.name || "—", c.email, c.phone].filter(Boolean);
  const right = ["JOB ADDRESS", ...doc.splitTextToSize(formatJobAddress(c) || "—", W / 2 - 50), "", "PAYMENT TERMS", ...doc.splitTextToSize(c.terms || "Due on completion", W / 2 - 50)];
  doc.setFontSize(10).setTextColor(40);
  left.forEach((v, i) => doc.setFont("helvetica", i === 0 ? "bold" : "normal").text(v, L, y + i * 13));
  right.forEach((v, i) => doc.setFont("helvetica", v === "JOB ADDRESS" || v === "PAYMENT TERMS" ? "bold" : "normal").text(v, W / 2 + 10, y + i * 13));
  y += Math.max(left.length, right.length) * 13 + 12;

  autoTable(doc, {
    startY: y,
    margin: { left: L, right: 40 },
    head: [["#", "Item description", "Qty", "Unit rate", "Amount"]],
    body: p.items.map((i, n) => [String(n + 1), cleanLineItemDescription(i.description) || "—", String(i.quantity), m(i.rate), m(i.quantity * i.rate)]),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [43, 39, 34], textColor: 255 },
    columnStyles: { 0: { cellWidth: 24 }, 2: { halign: "right", cellWidth: 40 }, 3: { halign: "right", cellWidth: 95 }, 4: { halign: "right", cellWidth: 95 } },
  });

  const subtotal = p.items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const tax = p.taxEnabled ? (subtotal * p.taxRate) / 100 : 0;
  const total = subtotal + tax;
  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 20;
  const row = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(bold ? 11 : 10);
    doc.text(label, R - 220, y);
    doc.text(value, R, y, { align: "right" });
    y += 16;
  };
  row("Subtotal", m(subtotal));
  row(`Sales tax ${p.taxEnabled ? `(${p.taxRate}%)` : "(exempt)"}`, m(tax));
  row("Total due", m(total), true);
  const pct = Number(c.terms.match(/(\d{1,3})\s*%/)?.[1] ?? 0);
  if (pct > 0 && pct < 100) row(`Deposit to book (${pct}%)`, m((total * pct) / 100), true);

  y += 30;
  doc.setDrawColor(150).setLineWidth(0.5).line(L, y, L + 220, y).line(R - 160, y, R, y);
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(120);
  doc.text("CLIENT SIGNATURE", L, y + 12);
  doc.text("DATE", R - 160, y + 12);
  doc.text(
    doc.splitTextToSize(
      `Quote valid for 30 days from the issue date. Prices assume standard site access and may be revised if hidden conditions are found. Thank you for the opportunity to quote — ${p.business}.`,
      R - L,
    ),
    L,
    y + 40,
  );

  return doc.output("datauristring").split(",")[1] ?? "";
}
