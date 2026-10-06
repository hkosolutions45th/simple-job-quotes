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
  city: string;
  postalCode: string;
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

/** Removes stale currency annotations from descriptions; currency belongs in money columns only. */
export const cleanLineItemDescription = (value: string) => {
  const currency = "(?:USD|CAD|EUR|GBP|AUD|MXN)";
  const unit = "\\b(?:linear\\s*(?:feet|foot|ft)|square\\s*(?:feet|foot|ft)|sq\\.?\\s*ft|feet|foot|ft|hours?|hrs?|days?|yards?|yds?|metres?|meters?|kilometres?|kilometers?|km|inches?|centimetres?|centimeters?|cm|litres?|liters?|gallons?|gal|pounds?|lbs?|tons?|tonnes?|bundles?|units?|pieces?|pcs?|coats?|loads?|each|ea)\\b";
  return value
    // Parenthetical annotations are metadata, not item titles. Remove the whole group
    // when it contains a currency or measurement/unit token, including mixed notes.
    .replace(
      new RegExp(
        `\\s*[\\(\\[][^\\)\\]]*(?:${currency}|(?:estimated|estimate|priced)\\s+(?:in\\s+)?${currency}|${unit})[^\\)\\]]*[\\)\\]]`,
        "gi",
      ),
      "",
    )
    .replace(
      new RegExp(
        `\\s*[\\(\\[]\\s*(?:(?:estimated|estimate|priced)\\s+)?(?:[$€£]\\s*)?${currency}(?:\\s*[$€£])?\\s*[\\)\\]]`,
        "gi",
      ),
      "",
    )
    .replace(
      new RegExp(
        `\\s*[-–—,:]\\s*(?:(?:estimated|estimate|priced)\\s+(?:in\\s+)?)?(?:[$€£]\\s*)?${currency}(?:\\s*[$€£])?\\s*$`,
        "gi",
      ),
      "",
    )
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
};

/** Builds a private, work-only sentence when the AI omits its scope summary. */
export function scopeSummaryFromNotes(notes: string, client?: Partial<Customer>): string {
  let work = notes.replace(/[\r\n]+/g, ". ");
  const privateValues = client
    ? [client.name, client.email, client.phone, client.address, client.city, client.postalCode]
        .filter((value): value is string => Boolean(value?.trim()))
        .sort((a, b) => b.length - a.length)
    : [];

  for (const value of privateValues) {
    work = work.replace(new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ");
  }

  work = work
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, " ")
    .replace(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g, " ")
    .replace(/\b[A-Z]\d[A-Z][ -]?\d[A-Z]\d\b/gi, " ")
    .replace(/\b\d{5}(?:-\d{4})?\b/g, " ")
    .replace(/\b\d{1,6}\s+[A-Za-z0-9.' -]{2,50}\s(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|way|highway|hwy|trail|trl)\b\.?/gi, " ")
    .replace(/\b(?:client|customer)\s*(?:name)?\s*(?:is|:)?\s*[A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){0,2}/gi, " ")
    .replace(/\b(?:email|phone|telephone|address|located at|job site|dictation|new quote|start quote|create quote|generate quote)\s*(?:is|:|at)?/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/^[\s,.;:—-]+|[\s,;:—-]+$/g, "")
    .trim();

  const firstSentence = work
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.replace(/^[\s,.;:—-]+|[\s,;:—-]+$/g, "").trim())
    .find((sentence) => /[A-Za-z]{3}/.test(sentence) && !/^(?:client|customer)\b/i.test(sentence)) || work;
  const concise = firstSentence.slice(0, 320).replace(/[\s,;:—-]+$/g, "").trim();
  if (!concise) return "Complete the work described in the job notes.";
  return /[.!?]$/.test(concise) ? concise : `${concise}.`;
}

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
  const jobAddress = [opts.customer.address, opts.customer.city, opts.customer.postalCode]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
  return [
    `Hi ${first},`,
    "",
    `Thanks for having us out${jobAddress ? ` at ${jobAddress}` : ""}. Your quote ${opts.quoteNo} from ${opts.business} comes to ${money(opts.total)} including tax.`,
    "",
    opts.customer.terms ? `Terms: ${opts.customer.terms}.` : "",
    "Reply to this message to book a start date and we'll get you on the schedule.",
    "",
    `— ${opts.business}`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}
