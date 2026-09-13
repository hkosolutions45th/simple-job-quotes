import { money, lineTotal, type Customer, type LineItem } from "@/lib/quote";

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
};

export function QuoteSheet(props: Props) {
  const { business, logo, quoteNo, customer, items, subtotal, tax, total, taxRate, taxEnabled } =
    props;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-white p-6 text-ink">
      <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          {logo ? (
            <img src={logo} alt={`${business} logo`} className="size-12 rounded-md object-cover" />
          ) : (
            <div className="grid size-12 place-items-center rounded-md bg-clay font-mono text-lg font-bold text-cream">
              {business.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-lg font-bold leading-tight">{business}</p>
            <p className="label-mono">Quotation</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm font-bold">{quoteNo}</p>
          <p className="font-mono text-[11px] text-inksoft">{today}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="label-mono">Prepared for</p>
          <p className="font-semibold">{customer.name || "—"}</p>
          <p className="text-inksoft">{customer.email}</p>
          <p className="font-mono text-inksoft">{customer.phone}</p>
        </div>
        <div>
          <p className="label-mono">Job address</p>
          <p className="text-inksoft">{customer.address || "—"}</p>
          <p className="label-mono mt-2">Payment terms</p>
          <p className="text-inksoft">{customer.terms || "—"}</p>
        </div>
      </div>

      <table className="mt-5 w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-line">
            <th className="label-mono py-2 text-left">Item description</th>
            <th className="label-mono py-2 text-right">Qty</th>
            <th className="label-mono py-2 text-right">Unit rate</th>
            <th className="label-mono py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-line/60">
              <td className="py-2 pr-2">{item.description}</td>
              <td className="py-2 text-right font-mono">{item.quantity}</td>
              <td className="py-2 text-right font-mono">{money(item.rate)}</td>
              <td className="py-2 text-right font-mono">{money(lineTotal(item))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto w-full max-w-64 text-sm">
        <div className="flex justify-between py-1">
          <span className="text-inksoft">Subtotal</span>
          <span className="font-mono">{money(subtotal)}</span>
        </div>
        {taxEnabled && (
          <div className="flex justify-between py-1">
            <span className="text-inksoft">Tax ({taxRate}%)</span>
            <span className="font-mono">{money(tax)}</span>
          </div>
        )}
        <div className="mt-1 flex items-end justify-between border-t border-line pt-2">
          <span className="font-semibold">Total due</span>
          <span className="font-mono text-xl font-bold">{money(total)}</span>
        </div>
      </div>

      <p className="mt-6 border-t border-line pt-3 font-mono text-[11px] text-inksoft">
        Quote valid for 30 days. Work begins once the deposit is received and a start date is
        confirmed.
      </p>
    </div>
  );
}
