export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  /** Fixed USD unit price — the only stored price. `rate` is derived for display. */
  basePriceUSD?: number;
};

export type Customer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  terms: string;
};

export const newId = () => Math.random().toString(36).slice(2, 10);

export const CURRENCIES = [
  { code: "USD", symbol: "$", label: "USD $ — US dollar" },
  { code: "CAD", symbol: "$", label: "CAD $ — Canadian dollar" },
  { code: "EUR", symbol: "€", label: "EUR € — Euro" },
  { code: "GBP", symbol: "£", label: "GBP £ — British pound" },
  { code: "AUD", symbol: "$", label: "AUD $ — Australian dollar" },
  { code: "MXN", symbol: "$", label: "MXN $ — Mexican peso" },
] as const;

let activeCurrency = "USD";
/** Sets the currency used by money() when no code is passed. */
export const setActiveCurrency = (code: string) => {
  activeCurrency = code;
};

export const formatMoney = (n: number, code: string) => {
  const sym = CURRENCIES.find((c) => c.code === code)?.symbol ?? "";
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? "-" : ""}${sym}${abs} ${code}`;
};

export const money = (n: number, code?: string) => formatMoney(n, code ?? activeCurrency);

export const lineTotal = (i: LineItem) => i.quantity * i.rate;

export const subtotalOf = (items: LineItem[]) =>
  items.reduce((sum, i) => sum + lineTotal(i), 0);

/** Keyword catalog used to turn dictated notes into priced line items. */
const CATALOG: { match: RegExp; description: string; rate: number; unit: string }[] = [
  { match: /shingle|re-?roof|roofing/i, description: "Asphalt shingle supply & install", rate: 148, unit: "bundle" },
  { match: /ice.?(and|&|\/)?.?water|underlayment/i, description: "Ice & water shield", rate: 12.5, unit: "ft" },
  { match: /ridge vent|vent/i, description: "Ridge vent system", rate: 18, unit: "ft" },
  { match: /flashing|caulk/i, description: "Flashing & re-caulking", rate: 22, unit: "ft" },
  { match: /elastomeric|coating/i, description: "Elastomeric coating, 2 coats", rate: 85, unit: "sq" },
  { match: /prime|primer/i, description: "Surface prep & primer", rate: 1.4, unit: "sq ft" },
  { match: /paint|coat/i, description: "Interior/exterior painting", rate: 2.6, unit: "sq ft" },
  { match: /drywall|patch/i, description: "Drywall repair & patching", rate: 45, unit: "patch" },
  { match: /sod|lawn|turf/i, description: "Sod supply & lay", rate: 1.1, unit: "sq ft" },
  { match: /mulch/i, description: "Mulch supply & spread", rate: 62, unit: "yd" },
  { match: /tree|trim|prune|hedge/i, description: "Tree & hedge trimming", rate: 95, unit: "hr" },
  { match: /furnace|hvac|heat pump/i, description: "Furnace / heat pump install", rate: 2400, unit: "unit" },
  { match: /duct/i, description: "Ductwork run & sealing", rate: 34, unit: "ft" },
  { match: /a\/?c|air condition|condenser/i, description: "A/C condenser supply & install", rate: 1850, unit: "unit" },
  { match: /gutter|downspout/i, description: "Gutter & downspout replacement", rate: 14, unit: "ft" },
  { match: /deck|fence/i, description: "Deck / fence carpentry", rate: 38, unit: "ft" },
  { match: /haul|dispos|debris|dump|tear ?off/i, description: "Tear-off, haul-away & disposal", rate: 420, unit: "load" },
  { match: /permit/i, description: "Permits & inspection fees", rate: 260, unit: "ea" },
];

const numberIn = (text: string): number | null => {
  const m = text.match(/(\d[\d,]*(?:\.\d+)?)\s*(sq\.?\s?ft|square feet|ft|feet|linear|hours?|hrs?|yards?|yds?|bundles?|units?|coats?|x)?/i);
  if (!m) return null;
  const n = parseFloat((m[1] ?? "").replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Turns free-form dictation into editable line items.
 * Always returns at least a labour line so the contractor has something to edit.
 */
export function generateLineItems(notes: string): LineItem[] {
  const fragments = notes
    .split(/[.;\n]|,\s(?=[a-z]{3})/i)
    .map((f) => f.trim())
    .filter(Boolean);

  const items: LineItem[] = [];
  const used = new Set<string>();

  for (const fragment of fragments) {
    for (const entry of CATALOG) {
      if (!entry.match.test(fragment) || used.has(entry.description)) continue;
      used.add(entry.description);
      const qty = numberIn(fragment);
      items.push({
        id: newId(),
        description: `${entry.description} (${entry.unit})`,
        quantity: qty ?? 1,
        rate: entry.rate,
      });
    }
  }

  const hours = notes.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
  items.push({
    id: newId(),
    description: "Labour — crew on site (hr)",
    quantity: hours?.[1] ? parseFloat(hours[1]) : Math.max(4, items.length * 3),
    rate: 75,
  });

  return items;
}

export function quoteMessage(opts: {
  business: string;
  customer: Customer;
  total: number;
  quoteNo: string;
}) {
  const first = opts.customer.name.trim().split(" ")[0] || "there";
  return [
    `Hi ${first},`,
    "",
    `Thanks for having us out${opts.customer.address ? ` at ${opts.customer.address}` : ""}. Your quote ${opts.quoteNo} from ${opts.business} comes to ${money(opts.total)} including tax.`,
    "",
    opts.customer.terms ? `Terms: ${opts.customer.terms}.` : "",
    "Reply to this message to book a start date and we'll get you on the schedule.",
    "",
    `— ${opts.business}`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}
