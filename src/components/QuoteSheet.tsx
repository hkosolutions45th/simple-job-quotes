import {
  cleanLineItemDescription,
  money,
  lineTotal,
  type Customer,
  type LineItem,
} from "@/lib/quote";

type Props = {
  business: string;
  logo: string | null;
  quoteNo: string;
  customer: Customer;
  items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  taxRate: number;
  taxEnabled: boolean;
  scopeSummary?: string;
};

export function QuoteSheet(props: Props) {
  const {
    business,
    logo,
    quoteNo,
    customer,
    items,
    subtotal,
    tax,
    total,
    taxRate,
    taxEnabled,
    scopeSummary,
  } = props;

  const today = new Date();
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const validUntil = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const depositMatch = customer.terms.match(/(\d{1,3})\s*%/);
  const depositPct = depositMatch?.[1] ? Number(depositMatch[1]) : null;
  const deposit = depositPct && depositPct > 0 && depositPct < 100 ? (total * depositPct) / 100 : null;
  const cityPostal = [customer.city, customer.postalCode].filter(Boolean).join(" ");
  const printableScope = scopeSummary?.trim() || "Work is detailed in the line items below.";

  return (
    <div className="quote-sheet mx-auto w-full min-w-0 overflow-hidden bg-white p-6 text-ink sm:p-8">
      {/* Header */}
      <header className="grid grid-cols-1 gap-3 border-b-2 border-ink pb-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6">
        <div className="flex min-w-0 items-center gap-3">
          {logo ? (
            <img src={logo} alt={`${business} logo`} className="size-14 shrink-0 rounded-md object-cover" />
          ) : (
            <div className="grid size-14 shrink-0 place-items-center rounded-md bg-clay font-mono text-xl font-bold text-cream">
              {business.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 overflow-hidden">
            <p className="break-words text-xl leading-tight font-bold">{business}</p>
            <p className="label-mono">Quotation / Estimate</p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="label-mono">Quote no.</p>
          <p className="font-mono text-base font-bold">{quoteNo}</p>
          <p className="mt-1 font-mono text-[11px] text-inksoft">Issued {fmt(today)}</p>
          <p className="font-mono text-[11px] text-inksoft">Valid to {fmt(validUntil)}</p>
        </div>
      </header>

      {/* Client details */}
      <section className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 sm:gap-6">
        <div className="min-w-0 break-words">
          <p className="label-mono">Prepared for</p>
          <p className="font-semibold">{customer.name || "—"}</p>
          {customer.email && <p className="text-inksoft">{customer.email}</p>}
          {customer.phone && <p className="font-mono text-inksoft">{customer.phone}</p>}
        </div>
        <div className="min-w-0 break-words">
          <p className="label-mono">Job address</p>
          <p className="text-inksoft">{customer.address || "—"}</p>
          {cityPostal && <p className="text-inksoft">{cityPostal}</p>}
          <p className="label-mono mt-3">Payment terms</p>
          <p className="text-inksoft">{customer.terms || "Due on completion"}</p>
        </div>
      </section>

      {/* Scope of work */}
      <section className="mt-5 break-inside-avoid rounded-md border border-line bg-cream p-3 text-sm">
        <p className="label-mono font-bold text-ink">Scope of work</p>
        <p className="mt-1 break-words leading-relaxed text-inksoft">{printableScope}</p>
      </section>

      {/* Line items */}
      <div className="mt-5 min-w-0 w-full max-w-full overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-sm">
        <thead>
          <tr className="border-y border-ink/30">
            <th className="label-mono w-8 py-2 text-left">#</th>
            <th className="label-mono py-2 text-left">Item description</th>
            <th className="label-mono py-2 text-right">Qty</th>
            <th className="label-mono py-2 pl-3 text-right">Unit rate</th>
            <th className="label-mono py-2 pl-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr className="border-b border-line/60">
              <td colSpan={5} className="py-4 text-center text-inksoft">
                No line items on this quote yet.
              </td>
            </tr>
          )}
          {items.map((item, index) => (
            <tr key={item.id} className="border-b border-line/60 align-top">
              <td className="py-2 font-mono text-inksoft">{index + 1}</td>
               <td className="py-2 pr-2">{cleanLineItemDescription(item.description) || "—"}</td>
              <td className="py-2 text-right font-mono">{item.quantity}</td>
              <td className="py-2 pl-3 text-right font-mono whitespace-nowrap">{money(item.rate)}</td>
              <td className="py-2 pl-3 text-right font-mono whitespace-nowrap">{money(lineTotal(item))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {/* Totals */}
      <div className="mt-4 ml-auto w-full max-w-72 text-sm">
        <div className="flex justify-between py-1">
          <span className="text-inksoft">Subtotal</span>
          <span className="font-mono">{money(subtotal)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-inksoft">Sales tax {taxEnabled ? `(${taxRate}%)` : "(exempt)"}</span>
          <span className="font-mono">{money(taxEnabled ? tax : 0)}</span>
        </div>
        <div className="mt-1 flex items-end justify-between border-t-2 border-ink pt-2">
          <span className="font-semibold">Total due</span>
          <span className="font-mono text-xl font-bold">{money(total)}</span>
        </div>
        {deposit !== null && (
          <div className="mt-1 flex justify-between py-1">
            <span className="text-inksoft">Deposit to book ({depositPct}%)</span>
            <span className="font-mono font-semibold">{money(deposit)}</span>
          </div>
        )}
      </div>

      {/* Acceptance */}
      <section className="mt-8 grid grid-cols-2 gap-6 text-sm">
        <div>
          <div className="h-8 border-b border-ink/40" />
          <p className="label-mono mt-1">Client signature</p>
        </div>
        <div>
          <div className="h-8 border-b border-ink/40" />
          <p className="label-mono mt-1">Date</p>
        </div>
      </section>

      <p className="mt-6 border-t border-line pt-3 font-mono text-[11px] leading-relaxed text-inksoft">
        Quote valid for 30 days from the issue date. Prices assume standard site access and may be
        revised if hidden conditions are found. Work begins once the deposit is received and a start
        date is confirmed. Thank you for the opportunity to quote — {business}.
      </p>
    </div>
  );
}
