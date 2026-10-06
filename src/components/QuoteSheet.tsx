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

function MoneyValue({ value, emphasize = false }: { value: number; emphasize?: boolean }) {
  const formatted = money(value);
  const splitAt = formatted.lastIndexOf(" ");
  const amount = splitAt > 0 ? formatted.slice(0, splitAt) : formatted;
  const code = splitAt > 0 ? formatted.slice(splitAt + 1) : "";

  return (
    <span
      className={`inline-flex max-w-full items-baseline justify-end gap-1 font-mono tabular-nums ${
        emphasize ? "text-xl font-bold" : ""
      }`}
    >
      <span className="whitespace-nowrap">{amount}</span>
      {code && <span className="whitespace-nowrap text-[0.75em] sm:text-[1em]">{code}</span>}
    </span>
  );
}

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
  const printableScope = scopeSummary?.trim() ?? "";

  return (
    <div className="quote-sheet mx-auto w-full min-w-0 overflow-hidden bg-white p-6 text-ink sm:p-8">
      {/* Locked two-column document header */}
      <header className="grid grid-cols-2 gap-x-5 border-b-2 border-ink pb-5">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            {logo ? (
              <img src={logo} alt={`${business} logo`} className="size-14 shrink-0 rounded-md object-cover" />
            ) : (
              <div className="grid size-14 shrink-0 place-items-center rounded-md bg-clay font-mono text-xl font-bold text-cream">
                {business.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 overflow-hidden">
              <p className="break-words text-lg leading-tight font-bold sm:text-xl">{business}</p>
              <p className="label-mono">Quotation / Estimate</p>
            </div>
          </div>
          <div className="mt-5 min-w-0 break-words text-sm">
          <p className="label-mono">Prepared for</p>
          <p className="font-semibold">{customer.name || "—"}</p>
          {customer.email && <p className="text-inksoft">{customer.email}</p>}
          {customer.phone && <p className="font-mono text-inksoft">{customer.phone}</p>}
        </div>
        </div>
        <div className="min-w-0 break-words text-sm">
          <div className="text-right">
            <p className="label-mono">Quote no.</p>
            <p className="font-mono text-base font-bold">{quoteNo}</p>
            <p className="mt-1 font-mono text-[11px] text-inksoft">Issued {fmt(today)}</p>
            <p className="font-mono text-[11px] text-inksoft">Valid to {fmt(validUntil)}</p>
          </div>
          <div className="mt-5">
            <p className="label-mono">Job address</p>
            <p className="text-inksoft">{customer.address || "—"}</p>
            {cityPostal && <p className="text-inksoft">{cityPostal}</p>}
            <p className="label-mono mt-3">Payment terms</p>
            <p className="text-inksoft">{customer.terms || "Due on completion"}</p>
          </div>
        </div>
      </header>

      {/* Scope of work */}
      <section className="mt-5 break-inside-avoid rounded-md border border-line bg-cream p-3 text-sm">
        <p className="label-mono font-bold text-ink">Scope of work</p>
        <p className="mt-1 min-h-5 break-words leading-relaxed text-inksoft">{printableScope || "—"}</p>
      </section>

      {/* Line items */}
      <div className="mt-5 min-w-0 w-full max-w-full overflow-hidden">
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-[6%]" />
          <col className="w-[43%]" />
          <col className="w-[9%]" />
          <col className="w-[21%]" />
          <col className="w-[21%]" />
        </colgroup>
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
               <td className="break-words py-2 pr-2">{cleanLineItemDescription(item.description) || "—"}</td>
              <td className="py-2 text-right font-mono">{item.quantity}</td>
               <td className="py-2 pl-1 text-right text-[11px] sm:pl-3 sm:text-sm"><MoneyValue value={item.rate} /></td>
               <td className="py-2 pl-1 text-right text-[11px] sm:pl-3 sm:text-sm"><MoneyValue value={lineTotal(item)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {/* Totals */}
      <div className="mt-4 ml-auto w-full max-w-72 text-sm tabular-nums">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-1">
          <span className="text-inksoft">Subtotal</span>
          <MoneyValue value={subtotal} />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-1">
          <span className="text-inksoft">Sales tax {taxEnabled ? `(${taxRate}%)` : "(exempt)"}</span>
          <MoneyValue value={taxEnabled ? tax : 0} />
        </div>
        <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 border-t-2 border-ink pt-2">
          <span className="font-semibold">Total due</span>
          <MoneyValue value={total} emphasize />
        </div>
        {deposit !== null && (
          <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-1">
            <span className="text-inksoft">Deposit to book ({depositPct}%)</span>
            <span className="font-semibold"><MoneyValue value={deposit} /></span>
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
