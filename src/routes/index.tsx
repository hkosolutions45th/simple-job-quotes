import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CloudUpload, FolderOpen, Loader2, LogOut, Mail, Mic, Plus, Printer, Send, Settings, Trash2, Upload } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateQuoteItems } from "@/lib/ai-quote.functions";
import { sendQuoteEmail } from "@/lib/send-quote.functions";
import {
  generateLineItems,
  lineTotal,
  money,
  CURRENCIES,
  setActiveCurrency,
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


function InstaQuote() {
  const [business, setBusiness] = useState("Tanner & Field Roofing");
  const [logo, setLogo] = useState<string | null>(null);
  const [quoteNo, setQuoteNo] = useState("IQ-2041");
  const [notes, setNotes] = useState("");
  const [listening, setListening] = useState(false);
  // Source of truth: each item stores ONLY its fixed basePriceUSD. No converted price is ever stored.
  type BaseItem = { id: string; description: string; quantity: number; basePriceUSD: number };
  const [baseItems, setItems] = useState<BaseItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState(13);
  const [customer, setCustomer] = useState<Customer>({
    name: "Marcus Whitfield",
    email: "m.whitfield@example.com",
    phone: "(555) 014-2287",
    address: "418 Alder Ct",
    city: "Millbrook",
    postalCode: "",
    terms: "50% deposit required",
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailNote, setEmailNote] = useState("");
  const [sending, setSending] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<any[]>([]);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const quoteIdRef = useRef<string | null>(null);
  quoteIdRef.current = quoteId;
  const [businessPhone, setBusinessPhone] = useState("");
  const [defaultTerms, setDefaultTerms] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
const [savingSettings, setSavingSettings] = useState(false);
  const [settings, setSettings] = useState({ business_name: "", phone: "", logo_url: "", default_terms: "", default_currency: "USD" });
  const [currency, setCurrency] = useState("USD");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  // money() everywhere in this render (incl. the quote preview) uses the quote's currency.
  setActiveCurrency(currency);
  const [converting, setConverting] = useState(false);
  // Current currency's exchange rate vs USD (1 = USD). Rates always derive from baseRate * rateFactor.
  const [rateFactor, setRateFactor] = useState(1);
  const rateFactorRef = useRef(1);
  const currencyRef = useRef(currency);
  currencyRef.current = currency;
  rateFactorRef.current = rateFactor;
  // Displayed items are derived on render: rate = baseRate (USD) × current exchange rate.
  const items = useMemo(
    () =>
      baseItems.map((i) => ({
        ...i,
        // Display only: basePriceUSD × current currency rate (USD = 1.0 exactly).
        rate: currency === "USD" ? i.basePriceUSD : Math.round(i.basePriceUSD * rateFactor * 100) / 100,
      })),
    [baseItems, rateFactor, currency],
  );
  // Persist currency + rate so reloads/tab switches never desync the dropdown from the numbers.
  const currencyRestored = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("instaquote:currency");
      if (raw) {
        const saved = JSON.parse(raw);
        if (typeof saved?.currency === "string") setCurrency(saved.currency);
        if (typeof saved?.rateFactor === "number" && saved.rateFactor > 0) setRateFactor(saved.rateFactor);
        currencyRestored.current = true;
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("instaquote:currency", JSON.stringify({ currency, rateFactor }));
    } catch {}
  }, [currency, rateFactor]);
  const changeCurrency = async (next: string) => {
    if (next === currency) return;
    return applyCurrency(next);
  };
  const applyCurrency = async (next: string) => {
    if (next === "USD") {
      setRateFactor(1);
      setCurrency(next);
      return;
    }
    setConverting(true);
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/USD`);
      const json = await res.json();
      const rate = Number(json?.rates?.[next]);
      if (!res.ok || json?.result !== "success" || !(rate > 0)) throw new Error("No rate");
      setRateFactor(rate);
      setCurrency(next);
      toast.success(`Converted to ${next}`, {
        description: `1 USD = ${rate.toFixed(4)} ${next} (live rate)`,
      });
    } catch {
      toast.error("Couldn't get live exchange rates", {
        description: "Currency not changed. Check your connection and try again.",
      });
    } finally {
      setConverting(false);
    }
  };

  const { user } = useAuth();
  const navigate = useNavigate();


  const recognitionRef = useRef<any>(null);
  const baseNotesRef = useRef("");

  const subtotal = useMemo(() => subtotalOf(items), [items]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
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
    // Start every recording from a blank notes field.
    baseNotesRef.current = "";
    setNotes("");
    try {
      rec.start();
      setListening(true);
    } catch {
      /* already running */
    }
  }, []);

  const stopDictation = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* not running */
    }
    setListening(false);
  }, []);

  const toggleDictation = useCallback(() => {
    if (listening) stopDictation();
    else startDictation();
  }, [listening, startDictation, stopDictation]);

  const generate = async () => {
    if (!notes.trim()) {
      toast.error("Add some job notes first");
      return;
    }
    setGenerating(true);
    try {
      const { items: aiItems, client } = await generateQuoteItems({ data: { notes } });
      if (client && (client.name || client.email || client.phone || client.address || client.city || client.postalCode)) {
        setCustomer((c) => ({
          ...c,
          name: client.name || c.name,
          email: client.email || c.email,
          phone: client.phone || c.phone,
          address: client.address || c.address,
          city: client.city || c.city,
          postalCode: client.postalCode || c.postalCode,
        }));
      }
      const rows: BaseItem[] = aiItems.map((i) => ({
        id: newId(),
        description: i.description,
        quantity: i.quantity,
        basePriceUSD: i.unitRate / (rateFactorRef.current || 1),
      }));
      setItems(rows);
      toast.success(`${rows.length} line items generated`, {
        description: "Tweak quantities and rates before you send.",
      });
    } catch (error) {
      const generated: BaseItem[] = generateLineItems(notes).map((g) => ({
        id: g.id,
        description: g.description,
        quantity: g.quantity,
        basePriceUSD: g.rate, // catalog rates are USD
      }));
      setItems(generated);
      toast.error(error instanceof Error ? error.message : "Couldn't reach the estimator", {
        description: "Added a draft from your notes instead — check the rates.",
      });
    } finally {
      setGenerating(false);
    }
  };

  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const next: BaseItem = { ...i };
        if (patch.description !== undefined) next.description = patch.description;
        if (patch.quantity !== undefined) next.quantity = patch.quantity;
        // Only a price the user types changes the base: typed value (current currency) → USD.
        if (patch.rate !== undefined) {
          const f = currencyRef.current === "USD" ? 1 : rateFactorRef.current || 1;
          next.basePriceUSD = patch.rate / f;
        }
        return next;
      }),
    );

  const addRow = () =>
    setItems((prev) => [...prev, { id: newId(), description: "", quantity: 1, basePriceUSD: 0 }]);

  const message = quoteMessage({ business, customer, total, quoteNo });

  const openEmail = () => {
    if (items.length === 0) {
      toast.info("Nothing to send yet", {
        description: "Generate or add a line item first.",
      });
      return;
    }
    setEmailTo(customer.email);
    setEmailNote(message);
    setEmailOpen(true);
  };

  const openSend = () => {
    if (items.length === 0) {
      toast.info("Nothing to send yet", {
        description: "Generate or add a line item first.",
      });
      return;
    }
    setSendOpen(true);
  };

  const sendEmail = async () => {
    const to = emailTo.trim();
    if (!to) {
      toast.error("Add the client's email address first.");
      return;
    }
    setSending(true);
    try {
      await sendQuoteEmail({
        data: {
          to,
          message: emailNote,
          business,
          quoteNo,
          clientName: customer.name,
          jobAddress: customer.address,
          city: customer.city,
          postalCode: customer.postalCode,
          terms: customer.terms,
          taxRate,
          currency,
          taxEnabled,
          items: items.map(({ description, quantity, rate }) => ({ description, quantity, rate })),
        },
      });
      toast.success(`Quote emailed to ${to}`);
      setEmailOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't send the email", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSending(false);
    }
  };


  const onLogo = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(file);
  };

  const newQuote = () => {
    setItems([]);
    setNotes("");
    setQuoteId(null);
    setCurrency("USD");
    setRateFactor(1);
    if (defaultCurrency !== "USD") void applyCurrency(defaultCurrency);
    setCustomer({
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      terms: defaultTerms || "50% deposit required",
    });
    setQuoteNo(`IQ-${Math.floor(2000 + Math.random() * 8000)}`);
    toast.success("Blank quote ready");
  };

  // Load the signed-in contractor's saved business details.
  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase
      .from("user_profiles")
      .select("business_name, logo_url, phone, default_terms, default_currency")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return;
        if (data.business_name) setBusiness(data.business_name);
        if (data.logo_url) setLogo(data.logo_url);
        setBusinessPhone(data.phone ?? "");
        if (data.default_currency) {
          setDefaultCurrency(data.default_currency);
          if (!quoteIdRef.current && !currencyRestored.current && data.default_currency === "USD") setCurrency(data.default_currency);
        }
        if (data.default_terms) {
          setDefaultTerms(data.default_terms);
          setCustomer((c) => (quoteIdRef.current ? c : { ...c, terms: data.default_terms! }));
        }
      });
    return () => {
      active = false;
    };
  }, [user]);

  const openSettings = () => {
    setSettings({
      business_name: business,
      phone: businessPhone,
      logo_url: logo && !logo.startsWith("data:") ? logo : logo ?? "",
      default_terms: defaultTerms,
      default_currency: defaultCurrency,
    });
    setSettingsOpen(true);
  };

  const saveSettings = async () => {
    if (!user) return;
    setSavingSettings(true);
    const s = {
      business_name: settings.business_name.trim() || null,
      phone: settings.phone.trim() || null,
      logo_url: settings.logo_url.trim() || null,
      default_terms: settings.default_terms.trim() || null,
      default_currency: settings.default_currency,
    };
    const { error } = await supabase
      .from("user_profiles")
      .upsert({ user_id: user.id, ...s }, { onConflict: "user_id" });
    setSavingSettings(false);
    if (error) {
      toast.error("Couldn't save settings", { description: error.message });
      return;
    }
    if (s.business_name) setBusiness(s.business_name);
    setLogo(s.logo_url);
    setBusinessPhone(s.phone ?? "");
    setDefaultTerms(s.default_terms ?? "");
    setDefaultCurrency(s.default_currency);
    if (!quoteId) {
      if (s.default_currency !== currency) void applyCurrency(s.default_currency);
      if (s.default_terms) setCustomer((c) => ({ ...c, terms: s.default_terms! }));
    }
    setSettingsOpen(false);
    toast.success("Business settings saved");
  };

  const saveQuote = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (items.length === 0) {
      toast.error("Nothing to save yet", { description: "Generate or add a line item first." });
      return;
    }
    setSaving(true);
    const record = {
      client_name: customer.name || null,
      client_email: customer.email || null,
      total_amount: Number(total.toFixed(2)),
      currency,
      line_items: { quoteNo, notes, items: baseItems.map((b) => ({ ...b, rate: items.find((i) => i.id === b.id)?.rate ?? b.basePriceUSD })), customer, taxRate, taxEnabled, currency, rateFactor } as any,
    };
    let error;
    if (quoteId) {
      ({ error } = await supabase
        .from("quotes")
        .update({ ...record, updated_at: new Date().toISOString() })
        .eq("id", quoteId));
    } else {
      const res = await supabase
        .from("quotes")
        .insert({ ...record, user_id: user.id, status: "draft" })
        .select("id")
        .single();
      error = res.error;
      if (res.data) setQuoteId(res.data.id);
    }
    await supabase
      .from("user_profiles")
      .upsert({ user_id: user.id, business_name: business, logo_url: logo }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error("Couldn't save this quote", { description: error.message });
      return;
    }
    toast.success(quoteId ? "Quote updated" : "Quote saved to your account");
  };

  const updateStatus = async (id: string, status: string) => {
    const prev = saved;
    setSaved((rows) => rows.map((r) => (r.id === id ? { ...r, status } : r)));
    const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
    if (error) {
      setSaved(prev);
      toast.error("Couldn't update status", { description: error.message });
      return;
    }
    toast.success(`Marked as ${status}`);
  };

  const deleteQuote = async (id: string) => {
    if (!window.confirm("Delete this quote? This can't be undone.")) return;
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (error) {
      toast.error("Couldn't delete quote", { description: error.message });
      return;
    }
    setSaved((rows) => rows.filter((r) => r.id !== id));
    if (id === quoteId) setQuoteId(null);
    toast.success("Quote deleted");
  };

  const openSaved = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setSavedOpen(true);
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) {
      toast.error("Couldn't load your quotes", { description: error.message });
      return;
    }
    setSaved(data ?? []);
  };

  const loadQuote = (row: any) => {
    const payload = (row.line_items ?? {}) as any;
    setQuoteId(row.id);
    setCurrency(row.currency ?? "USD");
    const factor = typeof payload.rateFactor === "number" && payload.rateFactor > 0 ? payload.rateFactor : 1;
    setRateFactor(factor);
    setItems(
      (Array.isArray(payload.items) ? payload.items : []).map((i: any): BaseItem => ({
        id: i.id ?? newId(),
        description: i.description ?? "",
        quantity: Number(i.quantity) || 0,
        basePriceUSD: Number(i.basePriceUSD ?? i.baseRate ?? (Number(i.rate) || 0) / factor),
      })),
    );
    setNotes(payload.notes ?? "");
    if (payload.customer) {
      setCustomer({
        name: payload.customer.name ?? "",
        email: payload.customer.email ?? "",
        phone: payload.customer.phone ?? "",
        address: payload.customer.address ?? "",
        city: payload.customer.city ?? "",
        postalCode: payload.customer.postalCode ?? payload.customer.zipCode ?? "",
        terms: payload.customer.terms ?? defaultTerms || "50% deposit required",
      });
    }
    if (payload.quoteNo) setQuoteNo(payload.quoteNo);
    if (typeof payload.taxRate === "number") setTaxRate(payload.taxRate);
    if (typeof payload.taxEnabled === "boolean") setTaxEnabled(payload.taxEnabled);
    setSavedOpen(false);
    toast.success("Quote loaded — saving will update it");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSaved([]);
    toast.success("Signed out");
  };


  return (
    <div className="min-h-screen bg-cream text-ink">
      <div className="mx-auto max-w-[430px] px-4 pt-5 pb-36 max-[360px]:pb-40">
        {/* Header */}
        <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
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
            className="clay-shadow-ink flex min-h-12 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-cream active:translate-y-0.5 max-[340px]:size-12 max-[340px]:justify-center max-[340px]:px-0"
            aria-label="Start a new quote"
          >
            <Plus className="size-4 shrink-0" aria-hidden="true" />
            <span className="max-[340px]:sr-only">New Quote</span>
          </button>
        </header>

        {/* Account */}
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-card p-2 ring-1 ring-black/5">
          {user ? (
            <>
              <span className="min-w-0 flex-1 truncate px-2 text-xs text-inksoft">
                Signed in as {user.email}
              </span>
              <button
                onClick={openSaved}
                className="flex min-h-10 items-center gap-1.5 rounded-lg bg-cream px-3 text-xs font-semibold ring-1 ring-line active:translate-y-0.5"
              >
                <FolderOpen className="size-4" aria-hidden="true" /> Saved
              </button>
              <button
                onClick={openSettings}
                aria-label="Business settings"
                className="grid size-10 place-items-center rounded-lg bg-cream text-inksoft ring-1 ring-line active:translate-y-0.5"
              >
                <Settings className="size-4" aria-hidden="true" />
              </button>
              <button
                onClick={signOut}
                aria-label="Sign out"
                className="grid size-10 place-items-center rounded-lg bg-cream text-inksoft ring-1 ring-line active:translate-y-0.5"
              >
                <LogOut className="size-4" aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <span className="min-w-0 flex-1 px-2 text-xs text-inksoft">
                Sign in to save quotes to your account.
              </span>
              <Link
                to="/auth"
                className="flex min-h-10 items-center rounded-lg bg-ink px-4 text-xs font-semibold text-cream active:translate-y-0.5"
              >
                Sign in
              </Link>
            </>
          )}
        </div>



        {/* Dictate */}
        <section className="mt-5 rounded-2xl bg-card p-4 ring-1 ring-black/5">
          <h1 className="sr-only">Build a quote</h1>
            <div className="flex flex-col items-center">
            <div className="relative grid size-28 place-items-center">
              {listening && (
                <span
                  className="mic-pulse absolute size-28 rounded-full border-2 border-red-500"
                  aria-hidden="true"
                />
              )}
              <button
                onClick={toggleDictation}
                aria-pressed={listening}
                aria-label={listening ? "Stop recording" : "Start recording"}
                className={`clay-shadow relative grid size-28 touch-none place-items-center rounded-full text-cream select-none active:translate-y-0.5 ${
                  listening ? "animate-pulse bg-red-600" : "bg-clay"
                }`}
              >
                <Mic className="size-9" aria-hidden="true" />
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase">
                  {listening ? "Stop" : "Tap"}
                </span>
              </button>
            </div>
            <p className="mt-4 text-base font-semibold">
              {listening ? "Tap to stop recording" : "Tap to dictate your notes"}
            </p>
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
            placeholder="Tap the button above to dictate or type job notes here..."
            className="mt-1 w-full resize-none rounded-xl bg-cream p-3 text-sm leading-relaxed ring-1 ring-line outline-none focus-visible:ring-2 focus-visible:ring-clay"
          />

          <button
            onClick={generate}
            disabled={generating}
            aria-busy={generating}
            className="clay-shadow-leaf mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-leaf px-4 text-sm font-semibold text-cream active:translate-y-0.5 disabled:opacity-70"
          >
            {generating && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {generating ? "Analyzing notes…" : "Generate Line-Item Quote"}
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
              <div className="mt-3 grid grid-cols-[0.75fr_1fr_1.2fr] gap-2 max-[340px]:grid-cols-2">
                <label className="block min-w-0">
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
                <label className="block min-w-0">
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
                <label className="block min-w-0 max-[340px]:col-span-2">
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
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-cream/70">Currency</span>
              <select
                value={currency}
                onChange={(e) => changeCurrency(e.target.value)}
                disabled={converting}
                aria-label="Quote currency"
                className="min-h-10 rounded-md bg-cream/10 px-2 font-mono text-sm text-cream outline-none"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code} className="text-ink">{c.code} {c.symbol}</option>
                ))}
              </select>
            </div>
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
            <div className="grid grid-cols-2 gap-3 max-[340px]:grid-cols-1">
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
              <span className="label-mono">Street address</span>
              <input
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                className="field mt-1"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block min-w-0">
                <span className="label-mono">City</span>
                <input
                  value={customer.city}
                  onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                  className="field mt-1"
                />
              </label>
              <label className="block min-w-0">
                <span className="label-mono">Postal / ZIP code</span>
                <input
                  value={customer.postalCode}
                  onChange={(e) => setCustomer({ ...customer, postalCode: e.target.value })}
                  className="field mt-1 font-mono"
                  autoCapitalize="characters"
                />
              </label>
            </div>
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
          <div className="clay-shadow grid grid-cols-[3.5rem_repeat(3,minmax(0,1fr))] gap-2 rounded-2xl bg-card p-3 ring-1 ring-black/5">
            <button
              onClick={saveQuote}
              disabled={saving}
              aria-busy={saving}
              aria-label="Save quote to my account"
              className="grid min-h-14 w-14 shrink-0 place-items-center rounded-xl bg-cream ring-1 ring-line active:translate-y-0.5 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              ) : (
                <CloudUpload className="size-5" aria-hidden="true" />
              )}
            </button>
            <button
              onClick={() => {
                if (items.length === 0) {
                  toast.info("Nothing to preview yet", {
                    description: "Generate or add a line item first.",
                  });
                  return;
                }
                setPreviewOpen(true);
              }}
              className="flex min-h-14 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-cream px-2 text-sm font-semibold ring-1 ring-line active:translate-y-0.5 max-[360px]:flex-col max-[360px]:gap-0.5 max-[360px]:px-1 max-[360px]:text-[11px]"
            >
              <Printer className="size-4" aria-hidden="true" /> Preview
            </button>
            <button
              onClick={openEmail}
              aria-label="Send quote by email"
              className="flex min-h-14 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-cream px-2 text-sm font-semibold ring-1 ring-line active:translate-y-0.5 max-[360px]:flex-col max-[360px]:gap-0.5 max-[360px]:px-1 max-[360px]:text-[11px]"
            >
              <Mail className="size-4" aria-hidden="true" /> Email
            </button>

            <button
              onClick={openSend}
              className="clay-shadow flex min-h-14 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-clay px-2 text-sm font-semibold text-cream active:translate-y-0.5 max-[360px]:flex-col max-[360px]:gap-0.5 max-[360px]:px-1 max-[360px]:text-[11px]"
            >
              <Send className="size-4" aria-hidden="true" /> Send
            </button>
          </div>
        </div>
      </div>

      {/* Hidden print-only copy of the quote — printed instead of the dialog */}
      {mounted &&
        createPortal(
          <div className="print-sheet hidden print:block" aria-hidden="true">
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
              notes={notes}
            />
          </div>,
          document.body,
        )}


      {/* PDF preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="no-print max-h-[88vh] overflow-y-auto bg-white p-0 sm:max-w-lg">
          <DialogHeader className="no-print px-4 pt-4 pr-12">
            <DialogTitle>Quote preview — {quoteNo}</DialogTitle>
            <DialogDescription>
              Print-ready letter page. Choose "Save as PDF" as the destination in the print dialog.
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
            notes={notes}
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

      {/* Send by email */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Email this quote</DialogTitle>
            <DialogDescription>
              The quote {quoteNo} — with the full item table and totals — is sent as a clean,
              printable email.
            </DialogDescription>
          </DialogHeader>
          <label className="block">
            <span className="label-mono">Client email</span>
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="client@example.com"
              className="field mt-1"
            />
          </label>
          <label className="block">
            <span className="label-mono">Message</span>
            <textarea
              rows={8}
              value={emailNote}
              onChange={(e) => setEmailNote(e.target.value)}
              className="field mt-1 resize-none leading-relaxed"
            />
          </label>
          <button
            onClick={sendEmail}
            disabled={sending}
            aria-busy={sending}
            className="clay-shadow flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-clay text-sm font-semibold text-cream active:translate-y-0.5 disabled:opacity-70"
          >
            {sending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Sending…
              </>
            ) : (
              <>
                <Mail className="size-4" aria-hidden="true" /> Send email
              </>
            )}
          </button>
        </DialogContent>
      </Dialog>

      {/* Saved quotes */}
      <Dialog open={savedOpen} onOpenChange={setSavedOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your saved quotes</DialogTitle>
            <DialogDescription>
              Tap a quote to load it back into the editor.
            </DialogDescription>
          </DialogHeader>
          {saved.length === 0 ? (
            <p className="py-6 text-center text-sm text-inksoft">
              No saved quotes yet. Save one with the cloud button.
            </p>
          ) : (
            <ul className="space-y-2">
              {saved.map((row) => (
                <li key={row.id} className="field rounded-xl p-2">
                  <button
                    type="button"
                    onClick={() => loadQuote(row)}
                    className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-2 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {row.client_name || "Unnamed client"}
                        {row.id === quoteId && <span className="ml-1 text-xs text-leaf">· editing</span>}
                      </span>
                      <span className="label-mono block text-xs text-inksoft">
                        {(row.line_items?.quoteNo ?? "").toString()}{" "}
                        {new Date(row.created_at).toLocaleDateString()}
                      </span>
                    </span>
                    <span className="label-mono shrink-0 text-sm font-bold">
                      {money(Number(row.total_amount) || 0, row.currency ?? "USD")}
                    </span>
                  </button>
                  <div className="mt-1 flex items-center gap-2 px-1">
                    <select
                      value={row.status}
                      onChange={(e) => updateStatus(row.id, e.target.value)}
                      aria-label="Quote status"
                      className="min-h-10 flex-1 rounded-lg bg-cream px-2 text-sm font-semibold ring-1 ring-line"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="accepted">Accepted</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => deleteQuote(row.id)}
                      aria-label="Delete quote"
                      className="grid size-10 place-items-center rounded-lg bg-cream text-destructive ring-1 ring-line active:translate-y-0.5"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {/* Business settings */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader className="pr-12">
            <DialogTitle>Business Settings</DialogTitle>
            <DialogDescription>These details pre-fill every new quote.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {([
              ["business_name", "Business name", "text"],
              ["phone", "Phone", "tel"],
              ["logo_url", "Logo URL", "url"],
              ["default_terms", "Default payment terms", "text"],
            ] as const).map(([key, label, type]) => (
              <label key={key} className="block">
                <span className="label-mono">{label}</span>
                <input
                  type={type}
                  value={settings[key]}
                  onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
                  className="field mt-1 min-h-12 w-full rounded-xl px-3"
                />
              </label>
            ))}
            <label className="block">
              <span className="label-mono">Default currency</span>
              <select
                value={settings.default_currency}
                onChange={(e) => setSettings((s) => ({ ...s, default_currency: e.target.value }))}
                className="field mt-1 min-h-12 w-full rounded-xl px-3"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </label>
          </div>
          <button
            onClick={saveSettings}
            disabled={savingSettings}
            aria-busy={savingSettings}
            className="clay-shadow-leaf flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-leaf font-semibold text-cream disabled:opacity-70"
          >
            {savingSettings && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {savingSettings ? "Saving…" : "Save settings"}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
