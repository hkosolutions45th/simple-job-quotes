import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, Plus, Printer, Send, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { QuoteSheet } from "@/components/QuoteSheet";
import {
  generateLineItems,
  lineTotal,
  money,
  newId,
  quoteMessage,
  subtotalOf,
  type Customer,
  type LineItem,
} from "@/lib/quote";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InstaQuote — Voice-to-Quote for Contractors" },
      {
        name: "description",
        content:
          "Dictate job notes on site and turn them into a priced, print-ready line-item quote you can text or email in seconds.",
      },
      { property: "og:title", content: "InstaQuote — Voice-to-Quote for Contractors" },
      {
        property: "og:description",
        content:
          "Dictate job notes on site and turn them into a priced, print-ready line-item quote you can text or email in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InstaQuote,
});

const SAMPLE =
  "Three car garage — 2 coats premium elastomeric on asphalt shingle. North slope needs an ice/water shield patch along the ridge.";

function InstaQuote() {
  const [business, setBusiness] = useState("Tanner & Field Roofing");
  const [logo, setLogo] = useState<string | null>(null);
  const [quoteNo, setQuoteNo] = useState("IQ-2041");
  const [notes, setNotes] = useState(SAMPLE);
  const [listening, setListening] = useState(false);
  const [items, setItems] = useState<LineItem[]>([]);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState(13);
  const [customer, setCustomer] = useState<Customer>({
    name: "Marcus Whitfield",
    email: "m.whitfield@example.com",
    phone: "(555) 014-2287",
    address: "418 Alder Ct, Millbrook",
    terms: "50% deposit required",
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const recognitionRef = useRef<any>(null);
  const baseNotesRef = useRef("");

  const subtotal = useMemo(() => subtotalOf(items), [items]);
  const tax = taxEnabled ? (subtotal * taxRate) / 100 : 0;
  const total = subtotal + tax;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
      const base = baseNotesRef.current;
      setNotes((base ? base.trimEnd() + " " : "") + text.trim());
    };
    rec.onerror = () => {
      setListening(false);
      toast.error("Couldn't hear you", { description: "Check microphone access and try again." });
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    };
  }, []);

  const startDictation = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) {
      toast.error("Dictation isn't supported in this browser", {
        description: "Type your notes below instead — everything else works the same.",
      });
      return;
    }
    baseNotesRef.current = notes;
    try {
      rec.start();
      setListening(true);
    } catch {
      /* already running */
    }
  }, [notes]);

  const stopDictation = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* not running */
    }
    setListening(false);
  }, []);

  const generate = () => {
    if (!notes.trim()) {
      toast.error("Add some job notes first");
      return;
    }
    const generated = generateLineItems(notes);
    setItems(generated);
    toast.success(`${generated.length} line items drafted`, {
      description: "Tweak quantities and rates before you send.",
    });
  };

  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const addRow = () =>
    setItems((prev) => [...prev, { id: newId(), description: "", quantity: 1, rate: 0 }]);

  const message = quoteMessage({ business, customer, total, quoteNo });

  const onLogo = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(file);
  };

  const newQuote = () => {
    setItems([]);
    setNotes("");
    setCustomer({ name: "", email: "", phone: "", address: "", terms: "50% deposit required" });
    setQuoteNo(`IQ-${Math.floor(2000 + Math.random() * 8000)}`);
    toast.success("Blank quote ready");
  };

  return (
    <div className="min-h-screen bg-cream text-ink">
      <div className="mx-auto max-w-[430px] px-4 pt-5 pb-36">
        {/* Header */}
        <header className="flex items-center gap-3">
          <label className="clay-shadow relative grid size-12 shrink-0 cursor-pointer place-items-center rounded-xl bg-clay font-mono text-lg font-bold text-cream">
            {logo ? (
              <img src={logo} alt="Business logo" className="size-12 rounded-xl object-cover" />
            ) : (
              <Upload className="size-5" aria-hidden="true" />
            )}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Upload business logo"
              onChange={(e) => onLogo(e.target.files?.[0])}
            />
          </label>
          <div className="min-w-0">
            <p className="label-mono tracking-[0.22em]">InstaQuote · {quoteNo}</p>
            <input
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              aria-label="Business name"
              className="w-full truncate bg-transparent text-lg font-bold leading-tight outline-none"
            />
          </div>
          <button
            onClick={newQuote}
            className="clay-shadow-ink ml-auto flex min-h-12 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-cream active:translate-y-0.5"
          >
            <Plus className="size-4" aria-hidden="true" /> New Quote
          </button>
        </header>

        {/* Dictate */}
        <section className="mt-5 rounded-2xl bg-card p-4 ring-1 ring-black/5">
          <h1 className="sr-only">Build a quote</h1>
          <div className="flex flex-col items-center">
            <div className="relative grid size-28 place-items-center">
              {listening && (
                <span
                  className="mic-pulse absolute size-28 rounded-full border-2 border-clay"
                  aria-hidden="true"
                />
              )}
              <button
                onPointerDown={startDictation}
                onPointerUp={stopDictation}
                onPointerLeave={() => listening && stopDictation()}
                aria-pressed={listening}
                className="clay-shadow relative grid size-28 touch-none place-items-center rounded-full bg-clay text-cream select-none active:translate-y-0.5"
              >
                <Mic className="size-9" aria-hidden="true" />
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase">
                  {listening ? "Listening" : "Hold"}
                </span>
              </button>
            </div>
            <p className="mt-4 text-base font-semibold">Hold to dictate your notes</p>
            <p className="text-center text-sm text-inksoft">
              Freehand the job while your hands are still gloved.
            </p>
          </div>

          <label className="label-mono mt-4 block" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe the job — materials, measurements, hours…"
            className="mt-1 w-full resize-none rounded-xl bg-cream p-3 text-sm leading-relaxed ring-1 ring-line outline-none focus-visible:ring-2 focus-visible:ring-clay"
          />

          <button
            onClick={generate}
            className="clay-shadow-leaf mt-4 min-h-12 w-full rounded-xl bg-leaf px-4 text-sm font-semibold text-cream active:translate-y-0.5"
          >
            Generate Line-Item Quote
          </button>
        </section>

        {/* Line items */}
        <section className="mt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-bold">Line items</h2>
            <span className="font-mono text-[11px] text-inksoft">{items.length} items</span>
          </div>

          {items.length === 0 && (
            <p className="mt-3 rounded-xl bg-card p-4 text-sm text-inksoft ring-1 ring-black/5">
              No items yet — dictate or type your notes above, then hit Generate.
            </p>
          )}

          {items.map((item, index) => (
            <div
              key={item.id}
              className="rowin mt-2 rounded-xl bg-card p-3 ring-1 ring-black/5"
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <div className="flex items-start gap-2">
                <input
                  value={item.description}
                  onChange={(e) => updateItem(item.id, { description: e.target.value })}
                  aria-label="Item description"
                  placeholder="Item description"
                  className="min-w-0 flex-1 bg-transparent py-2 text-sm font-semibold outline-none"
                />
                <button
                  onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                  aria-label={`Delete ${item.description || "row"}`}
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-cream text-inksoft ring-1 ring-line active:translate-y-0.5"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="label-mono">Qty</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
                    className="field mt-1 font-mono"
                  />
                </label>
                <label className="block">
                  <span className="label-mono">Unit rate</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={item.rate}
                    onChange={(e) => updateItem(item.id, { rate: Number(e.target.value) })}
                    className="field mt-1 font-mono"
                  />
                </label>
                <label className="block">
                  <span className="label-mono">Total</span>
                  <div className="field mt-1 flex items-center font-mono">
                    {money(lineTotal(item))}
                  </div>
                </label>
              </div>
            </div>
          ))}

          <button
            onClick={addRow}
            className="mt-2 flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-cream text-sm font-semibold ring-1 ring-line active:translate-y-0.5"
          >
            <Plus className="size-4" aria-hidden="true" /> Add row
          </button>

          {/* Totals */}
          <div className="mt-3 rounded-xl bg-ink p-4 text-cream">
            <div className="flex items-center justify-between">
              <span className="text-sm text-cream/70">Subtotal</span>
              <span className="font-mono text-sm">{money(subtotal)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-cream/70">Sales tax</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{money(tax)}</span>
                <Switch
                  checked={taxEnabled}
                  onCheckedChange={setTaxEnabled}
                  aria-label="Apply sales tax"
                  className="data-[state=checked]:bg-leaf"
                />
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  aria-label="Tax rate percent"
                  className="w-12 rounded-md bg-cream/10 px-1.5 py-1 text-center font-mono text-[11px] text-cream outline-none"
                />
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between border-t border-cream/15 pt-3">
              <span className="text-sm font-semibold">Final total</span>
              <span className="font-mono text-2xl leading-none font-bold">{money(total)}</span>
            </div>
          </div>
        </section>

        {/* Client & job */}
        <section className="mt-6 rounded-2xl bg-card p-4 ring-1 ring-black/5">
          <h2 className="text-base font-bold">Client &amp; job</h2>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <label className="block">
              <span className="label-mono">Client name</span>
              <input
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                className="field mt-1"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label-mono">Email</span>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  className="field mt-1"
                />
              </label>
              <label className="block">
                <span className="label-mono">Phone</span>
                <input
                  type="tel"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  className="field mt-1 font-mono"
                />
              </label>
            </div>
            <label className="block">
              <span className="label-mono">Job address</span>
              <input
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                className="field mt-1"
              />
            </label>
            <label className="block">
              <span className="label-mono">Payment terms</span>
              <input
                value={customer.terms}
                onChange={(e) => setCustomer({ ...customer, terms: e.target.value })}
                className="field mt-1"
              />
            </label>
          </div>
        </section>
      </div>

      {/* Sticky action bar */}
      <div className="no-print fixed right-0 bottom-0 left-0 z-10">
        <div className="mx-auto max-w-[430px] px-4 pt-2 pb-4">
          <div className="clay-shadow flex gap-3 rounded-2xl bg-card p-3 ring-1 ring-black/5">
            <button
              onClick={() => setPreviewOpen(true)}
              className="flex min-h-14 flex-1 items-center justify-center gap-1.5 rounded-xl bg-cream px-3 text-sm font-semibold ring-1 ring-line active:translate-y-0.5"
            >
              <Printer className="size-4" aria-hidden="true" /> Preview PDF
            </button>
            <button
              onClick={() => setSendOpen(true)}
              className="clay-shadow flex min-h-14 flex-1 items-center justify-center gap-1.5 rounded-xl bg-clay px-3 text-sm font-semibold text-cream active:translate-y-0.5"
            >
              <Send className="size-4" aria-hidden="true" /> Send
            </button>
          </div>
        </div>
      </div>

      {/* PDF preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="print-sheet max-h-[88vh] overflow-y-auto bg-white p-0 sm:max-w-lg">
          <DialogHeader className="no-print px-4 pt-4">
            <DialogTitle>Quote preview</DialogTitle>
            <DialogDescription>
              Print or save as PDF from your browser's print dialog.
            </DialogDescription>
          </DialogHeader>
          <QuoteSheet
            business={business}
            logo={logo}
            quoteNo={quoteNo}
            customer={customer}
            items={items}
            subtotal={subtotal}
            tax={tax}
            total={total}
            taxRate={taxRate}
            taxEnabled={taxEnabled}
          />
          <div className="no-print sticky bottom-0 flex gap-3 border-t border-line bg-white p-3">
            <button
              onClick={() => window.print()}
              className="clay-shadow min-h-12 flex-1 rounded-xl bg-clay text-sm font-semibold text-cream active:translate-y-0.5"
            >
              Print / Save as PDF
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send modal */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send this quote</DialogTitle>
            <DialogDescription>
              Edit the message, then send it by text or email.
            </DialogDescription>
          </DialogHeader>
          <textarea
            readOnly
            rows={9}
            value={message}
            className="w-full resize-none rounded-xl bg-cream p-3 text-sm leading-relaxed ring-1 ring-line outline-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`sms:${customer.phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(message)}`}
              className="flex min-h-12 items-center justify-center rounded-xl bg-cream text-sm font-semibold ring-1 ring-line active:translate-y-0.5"
            >
              Text it
            </a>
            <a
              href={`mailto:${customer.email}?subject=${encodeURIComponent(`Quote ${quoteNo} from ${business}`)}&body=${encodeURIComponent(message)}`}
              className="clay-shadow flex min-h-12 items-center justify-center rounded-xl bg-clay text-sm font-semibold text-cream active:translate-y-0.5"
            >
              Email it
            </a>
          </div>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(message);
              toast.success("Message copied");
            }}
            className="min-h-12 w-full rounded-xl text-sm font-semibold text-inksoft underline underline-offset-4"
          >
            Copy message
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
