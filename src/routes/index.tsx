import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, FileText, FolderOpen, Loader2, LogOut, Mail, MessageSquare, Mic, Plus, Save, Settings, Trash2, Undo2, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { duplicateQuoteRecord } from "@/lib/duplicate-quote";
import { clearDeviceText, nextQuoteNumber, readDeviceJSON, readDeviceText, writeDeviceText } from "@/lib/device-storage";
import { Switch } from "@/components/ui/switch";
import { QuoteSheet } from "@/components/QuoteSheet";
import { OnboardingFlow, TRADES } from "@/components/OnboardingFlow";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateQuoteItems } from "@/lib/ai-quote.functions";
import { sendQuoteEmail } from "@/lib/send-quote.functions";
import {
  cleanLineItemDescription,
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
  validateSearch: (search: Record<string, unknown>): { settings?: number } =>
    Number(search["settings"]) === 1 ? { settings: 1 } : {},


  component: InstaQuote,
});



type BusinessProfile = {
  companyName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  taxRate: number;
  defaultTerms: string;
  trade: string;
};

const PROFILE_KEY = "instaquote:businessProfile";
const EMPTY_PROFILE: BusinessProfile = {
  companyName: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  postalCode: "",
  taxRate: 13,
  defaultTerms: "",
  trade: "",
};

function InstaQuote() {
  const { user, loading: authLoading } = useAuth();
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(EMPTY_PROFILE);
  const [deviceReady, setDeviceReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Load the device-saved profile after hydration, then keep it in sync.
  useEffect(() => {
    try {
      const raw = readDeviceText(PROFILE_KEY);
      if (raw) {
        const value = JSON.parse(raw);
        const p = { ...EMPTY_PROFILE };
        for (const key of ["companyName", "phone", "email", "address", "city", "postalCode", "defaultTerms", "trade"] as const) {
          if (typeof value?.[key] === "string") p[key] = value[key];
        }
        if (Number.isFinite(value?.taxRate) && value.taxRate >= 0) p.taxRate = value.taxRate;
        setBusinessProfile(p);
        setTaxRate(p.taxRate);
        if (p.defaultTerms) setCustomer((c) => ({ ...c, terms: p.defaultTerms }));
      }
    } catch {
      /* ignore corrupt storage */
    }
    // A trade picked during onboarding belongs in the business profile.
    const savedTrade = readDeviceText("instaquote:trade");
    if (savedTrade) setBusinessProfile((p) => (p.trade ? p : { ...p, trade: savedTrade }));
    setDeviceReady(true);
  }, []);
  // The trial/paywall step is required per account: a brand-new account always
  // sees onboarding, even on a device where another account already finished it.
  useEffect(() => {
    if (!deviceReady) return;
    if (!user) {
      setShowOnboarding(false);
      return;
    }
    setShowOnboarding(readDeviceText(`instaquote:onboardingDone:${user.id}`) !== "1");
  }, [user, deviceReady]);
  useEffect(() => {
    if (deviceReady) writeDeviceText(PROFILE_KEY, JSON.stringify(businessProfile));
  }, [businessProfile, deviceReady]);
  const business = businessProfile.companyName.trim() || "Your Business Name";
  const setBusiness = (name: string) => setBusinessProfile((p) => ({ ...p, companyName: name }));
  const businessContact = {
    phone: businessProfile.phone,
    email: businessProfile.email,
    address: [businessProfile.address, [businessProfile.city, businessProfile.postalCode].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", "),
  };
  const [logo, setLogo] = useState<string | null>(null);
  const [quoteNo, setQuoteNo] = useState("IQ-1001");
  // Auto-incrementing quote numbers stored on this device.
  const takeNextQuoteNo = () => {
    const number = nextQuoteNumber(saved.map((row) => row.line_items?.quoteNo ?? ""));
    writeDeviceText("instaquote:currentQuoteNo", number);
    return number;
  };
  useEffect(() => {
    const current = readDeviceText("instaquote:currentQuoteNo");
    setQuoteNo(current || takeNextQuoteNo());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (deviceReady && quoteNo.trim()) writeDeviceText("instaquote:currentQuoteNo", quoteNo);
  }, [quoteNo, deviceReady]);

  // Saved clients directory (this device).
  type SavedClient = { id: string; name: string; email: string; phone: string; address: string; city: string; postalCode: string };
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);
  useEffect(() => {
    try {
      setSavedClients(readDeviceJSON<SavedClient[]>("instaquote:clients", [], (v): v is SavedClient[] =>
        Array.isArray(v) && v.every((c) => c && ["id", "name", "email", "phone", "address", "city", "postalCode"].every((key) => typeof c[key] === "string"))));
    } catch {
      /* ignore */
    }
  }, []);
  const storeClients = (next: SavedClient[]) => {
    setSavedClients(next);
    if (!writeDeviceText("instaquote:clients", JSON.stringify(next))) toast.warning("Device storage is unavailable", { description: "Your clients may not survive closing this app." });
  };
  const [notes, setNotes] = useState("");
  const [listening, setListening] = useState(false);
  // Source of truth: each item stores ONLY its fixed basePriceUSD. No converted price is ever stored.
  type BaseItem = { id: string; description: string; quantity: number; basePriceUSD: number };
  const [baseItems, setItems] = useState<BaseItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState(13);
  const [customer, setCustomer] = useState<Customer>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    terms: "50% deposit required",
  });
  const clientMatch = savedClients.find(
    (c) => c.name.trim().toLowerCase() === customer.name.trim().toLowerCase(),
  );
  const clientSaved = Boolean(clientMatch);
  const clientModified = Boolean(
    clientMatch &&
      (clientMatch.email !== customer.email ||
        clientMatch.phone !== customer.phone ||
        clientMatch.address !== customer.address ||
        clientMatch.city !== customer.city ||
        clientMatch.postalCode !== customer.postalCode ||
        clientMatch.name !== customer.name.trim()),
  );
  const updateClient = async () => {
    if (!clientMatch) return;
    const updated: SavedClient = {
      ...clientMatch,
      name: customer.name.trim(),
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      postalCode: customer.postalCode,
    };
    storeClients(savedClients.map((c) => (c.id === clientMatch.id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name)));
    if (user) {
      const { error } = await supabase
        .from("saved_clients")
        .update({ name: updated.name, email: updated.email, phone: updated.phone, address: updated.address, city: updated.city, postal_code: updated.postalCode })
        .eq("id", clientMatch.id)
        .eq("user_id", user.id);
      if (error) toast.warning("Updated on this device only", { description: "We'll sync it to your account next time you're online." });
    }
    toast.success(`${updated.name} updated in your clients`);
  };
  const revertClient = () => {
    if (!clientMatch) return;
    const saved = clientMatch;
    setCustomer((prev) => ({
      ...prev,
      name: saved.name,
      email: saved.email,
      phone: saved.phone,
      address: saved.address,
      city: saved.city,
      postalCode: saved.postalCode,
    }));
    toast.info("Changes discarded", { description: `${saved.name}'s saved details are back.` });
  };
  const toggleSaveClient = async (on: boolean) => {
    if (on) {
      let entry: SavedClient = {
        id: newId(),
        name: customer.name.trim(),
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        postalCode: customer.postalCode,
      };
      if (user) {
        const { data, error } = await supabase
          .from("saved_clients")
          .insert({ user_id: user.id, name: entry.name, email: entry.email, phone: entry.phone, address: entry.address, city: entry.city, postal_code: entry.postalCode })
          .select("id")
          .single();
        if (data) entry = { ...entry, id: data.id };
        else if (error) toast.warning("Saved on this device only", { description: "We'll sync it to your account next time you're online." });
      }
      storeClients([...savedClients, entry].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success(`${entry.name} saved to your clients`);
    } else if (clientMatch) {
      storeClients(savedClients.filter((c) => c.id !== clientMatch.id));
      if (user) await supabase.from("saved_clients").delete().eq("id", clientMatch.id).eq("user_id", user.id);
      toast.success(`${clientMatch.name} removed from your clients`);
    }
  };
  // Signed in: load clients from the account, and upload any device-only clients.
  useEffect(() => {
    if (!user || !deviceReady) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("saved_clients")
        .select("id, name, email, phone, address, city, postal_code")
        .eq("user_id", user.id);
      if (!active || error || !data) return;
      const cloud: SavedClient[] = data.map((r) => ({ id: r.id, name: r.name, email: r.email, phone: r.phone, address: r.address, city: r.city, postalCode: r.postal_code }));
      const names = new Set(cloud.map((c) => c.name.trim().toLowerCase()));
      const local = readDeviceJSON<SavedClient[]>("instaquote:clients", [], (v): v is SavedClient[] => Array.isArray(v));
      const missing = local.filter((c) => c?.name && !names.has(c.name.trim().toLowerCase()));
      if (missing.length) {
        const { data: added } = await supabase
          .from("saved_clients")
          .insert(missing.map((c) => ({ user_id: user.id, name: c.name, email: c.email ?? "", phone: c.phone ?? "", address: c.address ?? "", city: c.city ?? "", postal_code: c.postalCode ?? "" })))
          .select("id, name, email, phone, address, city, postal_code");
        added?.forEach((r) => cloud.push({ id: r.id, name: r.name, email: r.email, phone: r.phone, address: r.address, city: r.city, postalCode: r.postal_code }));
      }
      if (!active) return;
      storeClients(cloud.sort((a, b) => a.name.localeCompare(b.name)));
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, deviceReady]);
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
  const defaultTerms = businessProfile.defaultTerms;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settings, setSettings] = useState({
    business_name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    postal_code: "",
    tax_rate: "13",
    logo_url: "",
    default_terms: "",
    default_currency: "USD",
    trade: "",
  });
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
        description: cleanLineItemDescription(i.description),
        // Display only: basePriceUSD × current currency rate (USD = 1.0 exactly).
        rate: currency === "USD" ? i.basePriceUSD : Math.round(i.basePriceUSD * rateFactor * 100) / 100,
      })),
    [baseItems, rateFactor, currency],
  );
  // Normalize legacy/active rows in state, not only at render and output boundaries.
  useEffect(() => {
    setItems((current) => {
      let changed = false;
      const cleaned = current.map((item) => {
        const description = cleanLineItemDescription(item.description);
        if (description === item.description) return item;
        changed = true;
        return { ...item, description };
      });
      return changed ? cleaned : current;
    });
  }, []);
  // Persist currency + rate so reloads/tab switches never desync the dropdown from the numbers.
  const currencyRestored = useRef(false);
  useEffect(() => {
    try {
      const raw = readDeviceText("instaquote:currency");
      if (raw) {
        const saved = JSON.parse(raw);
        if (CURRENCIES.some((c) => c.code === saved?.currency)) setCurrency(saved.currency);
        if (typeof saved?.rateFactor === "number" && saved.rateFactor > 0) setRateFactor(saved.rateFactor);
        currencyRestored.current = true;
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (deviceReady) writeDeviceText("instaquote:currency", JSON.stringify({ currency, rateFactor }));
    } catch {}
  }, [currency, rateFactor, deviceReady]);
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

  const [cacheOwner, setCacheOwner] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [dupConfirm, setDupConfirm] = useState<any | null>(null);
  useEffect(() => {
    if (!user) { setCacheOwner(null); return; }
    setSaved(readDeviceJSON<any[]>(`instaquote:savedQuotes:${user.id}`, [], (v): v is any[] =>
      Array.isArray(v) && v.every((row) => row && typeof row.id === "string" && row.user_id === user.id)));
    setCacheOwner(user.id);
  }, [user?.id]);
  useEffect(() => {
    if (user && cacheOwner === user.id) writeDeviceText(`instaquote:savedQuotes:${user.id}`, JSON.stringify(saved));
  }, [saved, user?.id, cacheOwner]);
  useEffect(() => {
    const stored = readDeviceJSON<{ logo: string | null; currency: string }>("instaquote:businessExtras", { logo: null, currency: "USD" },
      (v): v is { logo: string | null; currency: string } => Boolean(v && typeof v === "object" && "currency" in v && CURRENCIES.some((c) => c.code === v.currency) && "logo" in v && (v.logo === null || typeof v.logo === "string")));
    setLogo(stored.logo);
    setDefaultCurrency(stored.currency);
  }, []);
  useEffect(() => {
    if (deviceReady) writeDeviceText("instaquote:businessExtras", JSON.stringify({ logo, currency: defaultCurrency }));
  }, [logo, defaultCurrency, deviceReady]);
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
    rec.onerror = (event: any) => {
      setListening(false);
      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        setMicDenied(true);
        return;
      }
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

  const [micDenied, setMicDenied] = useState(false);

  const startDictation = useCallback(async () => {
    const rec = recognitionRef.current;
    if (!rec) {
      toast.error("Dictation isn't supported in this browser", {
        description: "Type your notes below instead — everything else works the same.",
      });
      return;
    }
    // Trigger the browser's native mic permission prompt before starting recognition.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === "NotAllowedError" || name === "NotFoundError") {
        setMicDenied(true);
      } else {
        toast.error("Microphone unavailable", {
          description: "Check that no other app is using the mic, then try again.",
        });
      }
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
        description: cleanLineItemDescription(i.description),
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
        description: cleanLineItemDescription(g.description),
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
        if (patch.description !== undefined) next.description = cleanLineItemDescription(patch.description);
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

  const copyMessage = async (
    copiedToast = "Message copied to clipboard — ready to paste!",
  ) => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success(copiedToast);
      return true;
    } catch {
      // Clipboard blocked (e.g. private browsing) — fall back to a hidden textarea copy.
      try {
        const ta = document.createElement("textarea");
        ta.value = message;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        toast.success(copiedToast);
        return true;
      } catch {
        toast.error("Couldn't copy the message — long-press the text to copy it.");
        return false;
      }
    }
  };

  // Open the native SMS app directly with the encoded summary.
  // If nothing launches, copy to clipboard so nothing is lost in privacy modes.
  const sendVia = async (link: string) => {
    try {
      window.location.href = link;
      // If the app launch was blocked the page never unloads; offer clipboard as backup.
      window.setTimeout(() => {
        if (!document.hidden) {
          toast("No messaging app opened", {
            description: "Tap Copy Text below to paste it anywhere.",
          });
        }
      }, 1500);
    } catch {
      await copyMessage();
    }
  };

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
      const pdfItems = items.map(({ description, quantity, rate }) => ({ description, quantity, rate }));
      const { buildQuotePdfBase64 } = await import("@/lib/quote-pdf");
      const pdfBase64 = await buildQuotePdfBase64({
        business,
        businessContact,
        quoteNo,
        customer,
        items: pdfItems,
        taxRate,
        taxEnabled,
        currency,
      });
      await sendQuoteEmail({
        data: {
          to,
          message: emailNote,
          business,
          businessPhone: businessProfile.phone,
          businessEmail: businessProfile.email,
          businessAddress: businessContact.address,
          quoteNo,
          clientName: customer.name,
          jobAddress: customer.address,
          city: customer.city,
          postalCode: customer.postalCode,
          terms: customer.terms,
          taxRate,
          currency,
          taxEnabled,
          items: pdfItems,
          pdfBase64,
        },
      });
      await markSent(quoteId);
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
    setTaxRate(businessProfile.taxRate);
    setQuoteNo(takeNextQuoteNo());
    toast.success("Blank quote ready");
  };

  const [profileReady, setProfileReady] = useState(false);

  // Load the signed-in contractor's saved business details.
  useEffect(() => {
    if (!user) {
      setProfileReady(true);
      return;
    }

    let active = true;
    supabase
      .from("user_profiles")
      .select("business_name, logo_url, phone, default_terms, default_currency, business_email, street_address, city, postal_code, tax_rate, trade")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setProfileReady(true);
        if (!data) return;

        // Account data is authoritative; device values fill any gaps (offline cache).
        const cloudRate = data.tax_rate == null ? NaN : Number(data.tax_rate);
        setBusinessProfile((p) => ({
          ...p,
          companyName: data.business_name || p.companyName,
          phone: data.phone || p.phone,
          email: data.business_email || p.email,
          address: data.street_address || p.address,
          city: data.city || p.city,
          postalCode: data.postal_code || p.postalCode,
          taxRate: Number.isFinite(cloudRate) && cloudRate >= 0 ? cloudRate : p.taxRate,
          defaultTerms: data.default_terms || p.defaultTerms,
          trade: data.trade || p.trade,
        }));
        if (Number.isFinite(cloudRate) && cloudRate >= 0 && !quoteIdRef.current) setTaxRate(cloudRate);
        if (data.logo_url) setLogo(data.logo_url);
        if (data.default_currency) {
          setDefaultCurrency(data.default_currency);
          if (!quoteIdRef.current && !currencyRestored.current && data.default_currency === "USD") setCurrency(data.default_currency);
        }
        if (data.default_terms) {
          setCustomer((c) => (quoteIdRef.current ? c : { ...c, terms: c.terms || (data.default_terms ?? "") }));
        }
      });
    return () => {
      active = false;
    };
  }, [user]);

  const openSettings = () => {
    setSettings({
      business_name: businessProfile.companyName,
      phone: businessProfile.phone,
      email: businessProfile.email,
      address: businessProfile.address,
      city: businessProfile.city,
      postal_code: businessProfile.postalCode,
      tax_rate: String(businessProfile.taxRate),
      logo_url: logo && !logo.startsWith("data:") ? logo : logo ?? "",
      default_terms: defaultTerms,
      trade: businessProfile.trade,
      default_currency: defaultCurrency,
    });
    setSettingsOpen(true);
  };

  // A legal document's "Back to settings" button arrives with ?settings=1, so the
  // dialog reopens once the account profile has finished loading.
  const search = Route.useSearch();
  const [settingsRequested, setSettingsRequested] = useState(false);
  useEffect(() => {
    if (search.settings) setSettingsRequested(true);
  }, [search.settings]);
  useEffect(() => {
    if (!settingsRequested || !deviceReady || authLoading || !profileReady) return;
    setSettingsRequested(false);
    openSettings();
    navigate({ to: "/", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsRequested, deviceReady, authLoading, profileReady]);


  const saveSettings = async () => {
    const rate = Number(settings.tax_rate);
    const nextProfile: BusinessProfile = {
      companyName: settings.business_name.trim(),
      phone: settings.phone.trim(),
      email: settings.email.trim(),
      address: settings.address.trim(),
      city: settings.city.trim(),
      postalCode: settings.postal_code.trim(),
      taxRate: Number.isFinite(rate) && rate >= 0 ? rate : 13,
      defaultTerms: settings.default_terms.trim(),
      trade: settings.trade.trim(),
    };
    const s = {
      business_name: nextProfile.companyName || null,
      phone: nextProfile.phone || null,
      logo_url: settings.logo_url.trim() || null,
      default_terms: nextProfile.defaultTerms || null,
      default_currency: settings.default_currency,
      business_email: nextProfile.email || null,
      street_address: nextProfile.address || null,
      city: nextProfile.city || null,
      postal_code: nextProfile.postalCode || null,
      tax_rate: nextProfile.taxRate,
      trade: nextProfile.trade || null,
    };
    if (user) {
      setSavingSettings(true);
      const { error } = await supabase
        .from("user_profiles")
        .upsert({ user_id: user.id, ...s }, { onConflict: "user_id" });
      setSavingSettings(false);
      if (error) {
        toast.error("Couldn't save settings", { description: error.message });
        return;
      }
    }
    setBusinessProfile(nextProfile);
    setLogo(s.logo_url);
    setDefaultCurrency(s.default_currency);
    if (!quoteId) {
      if (s.default_currency !== currency) void applyCurrency(s.default_currency);
      if (s.default_terms) setCustomer((c) => ({ ...c, terms: s.default_terms ?? "" }));
      setTaxRate(nextProfile.taxRate);
    }
    setSettingsOpen(false);
    toast.success(user ? "Business settings saved to your account" : "Business settings saved on this device");
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
      line_items: { quoteNo, notes, items: baseItems.map((b) => ({ ...b, description: cleanLineItemDescription(b.description), rate: items.find((i) => i.id === b.id)?.rate ?? b.basePriceUSD })), customer, taxRate, taxEnabled, currency, rateFactor } as any,
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
    const { data: history } = await supabase.from("quotes").select("*").order("created_at", { ascending: false }).limit(30);
    if (history) setSaved(history);
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

  const markSent = async (id: string | null) => {
    if (!id) return;
    setSaved((rows) => rows.map((r) => (r.id === id ? { ...r, status: "sent" } : r)));
    const { error } = await supabase.from("quotes").update({ status: "sent" }).eq("id", id);
    if (error) console.error("Couldn't mark quote as sent:", error.message);
  };

  const duplicateQuote = async (row: any) => {
    if (!user || duplicating) return;
    setDuplicating(row.id);
    try {
      const number = nextQuoteNumber([quoteNo, ...saved.map((r) => r.line_items?.quoteNo ?? "")]);
      const record = duplicateQuoteRecord(row, number, user.id);
      const { data, error } = await supabase.from("quotes").insert(record).select("*").single();
      if (error) throw error;
      if (!data) throw new Error("No duplicated quote returned");
      setSaved((rows) => [data, ...rows]);
      setDupConfirm(null);
      loadQuote(data, `${number} duplicated — ready for a new client`);
    } catch (error) {
      toast.error("Couldn't duplicate quote", { description: error instanceof Error ? error.message : "Try again." });
    } finally { setDuplicating(null); }
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

  const loadQuote = (row: any, loadedMessage = "Quote loaded — saving will update it") => {
    const payload = (row.line_items ?? {}) as any;
    setQuoteId(row.id);
    setCurrency(row.currency ?? "USD");
    const factor = typeof payload.rateFactor === "number" && payload.rateFactor > 0 ? payload.rateFactor : 1;
    setRateFactor(factor);
    setItems(
      (Array.isArray(payload.items) ? payload.items : []).map((i: any): BaseItem => ({
        id: i.id ?? newId(),
        description: cleanLineItemDescription(i.description ?? ""),
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
        terms: payload.customer.terms ?? (defaultTerms || "50% deposit required"),
      });
    }
    if (payload.quoteNo) setQuoteNo(payload.quoteNo);
    if (typeof payload.taxRate === "number") setTaxRate(payload.taxRate);
    if (typeof payload.taxEnabled === "boolean") setTaxEnabled(payload.taxEnabled);
    setSavedOpen(false);
    if (loadedMessage) toast.success(loadedMessage);
  };

  const signOut = async () => {
    const uid = user?.id;
    await supabase.auth.signOut();
    // Clear user-specific device data: saved quotes, saved clients, business profile (+ extras).
    if (uid) clearDeviceText(`instaquote:savedQuotes:${uid}`);
    clearDeviceText(PROFILE_KEY);
    clearDeviceText("instaquote:clients");
    clearDeviceText("instaquote:businessExtras");
    clearDeviceText("instaquote:trade");
    // Guest defaults: blank business profile, no saved clients, and a fresh draft quote.
    setBusinessProfile(EMPTY_PROFILE);
    setSavedClients([]);
    setSaved([]);
    setQuoteId(null);
    setLogo(null);
    setDefaultCurrency("USD");
    setItems([]);
    setNotes("");
    setTaxEnabled(true);
    setTaxRate(EMPTY_PROFILE.taxRate);
    setCustomer({
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      terms: "50% deposit required",
    });
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };


  if (!deviceReady || authLoading) return (
    <div role="status" aria-label="Loading InstaQuote" className="startup-screen fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-background text-foreground">
      <div className="clay-shadow grid size-20 place-items-center rounded-xl bg-primary text-primary-foreground"><Mic className="size-9" aria-hidden="true" /></div>
      <div className="text-center"><h1 className="text-3xl font-bold">InstaQuote</h1><p className="mt-1 font-mono text-xs text-muted-foreground">PRO</p></div>
      <Loader2 className="size-6 animate-spin motion-reduce:animate-none text-accent" aria-hidden="true" />
    </div>
  );

  // Auth guard: signed-out users see a clean sign-in landing, never the estimator or cached drafts.
  if (!user) {
    return (
      <div className="app-safe-layout flex min-h-screen flex-col items-center justify-center gap-8 bg-cream px-6 text-center text-ink">
        <div className="clay-shadow grid size-24 place-items-center rounded-2xl bg-clay text-cream">
          <Mic className="size-11" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">InstaQuote</h1>
          <p className="mt-1 font-mono text-xs tracking-widest text-muted-foreground">PRO</p>
          <p className="mx-auto mt-4 max-w-xs text-base text-muted-foreground">
            Dictate job notes on site and turn them into a priced, print-ready quote you can text or email in seconds.
          </p>
        </div>
        <Link
          to="/auth"
          className="clay-shadow flex min-h-14 w-full max-w-xs items-center justify-center rounded-2xl bg-clay text-lg font-bold text-cream"
        >
          Sign in or create an account
        </Link>
        <p className="max-w-xs text-xs text-muted-foreground">
          Your business settings, saved clients and quotes stay with your account on every device.
        </p>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingFlow
        onDone={() => {
          if (user) writeDeviceText(`instaquote:onboardingDone:${user.id}`, "1");
          setShowOnboarding(false);
        }}
        onTrade={async (tradeId) => {
          // Slide 2's pick lands in Business Settings straight away (device + account).
          setBusinessProfile((p) => ({ ...p, trade: tradeId }));
          if (!user) return;
          const { error } = await supabase
            .from("user_profiles")
            .upsert({ user_id: user.id, trade: tradeId }, { onConflict: "user_id" });
          if (error)
            toast.error("Couldn't save your trade to your account", { description: error.message });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-cream text-ink">
      <div className="app-safe-layout mx-auto max-w-[430px] px-4 pt-5 pb-36 max-[360px]:pb-40">
        {/* Header */}
        <header className="app-safe-header grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
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
            <p className="label-mono flex items-center gap-1 tracking-[0.22em]">
              <span>InstaQuote ·</span>
              <input
                value={quoteNo}
                onChange={(e) => setQuoteNo(e.target.value.slice(0, 40))}
                aria-label="Quote number"
                className="w-24 min-w-0 rounded bg-transparent font-mono outline-none focus:ring-1 focus:ring-clay"
              />
            </p>
            <input
              value={businessProfile.companyName}
              placeholder="Your Business Name — tap to edit"
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
              <button
                onClick={openSettings}
                aria-label="Business settings"
                className="grid size-10 shrink-0 place-items-center rounded-lg bg-cream text-inksoft ring-1 ring-line active:translate-y-0.5"
              >
                <Settings className="size-4" aria-hidden="true" />
              </button>
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
            <div>
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="client-name" className="label-mono">Client name</label>
                <select
                  aria-label="Saved clients"
                  value=""
                  onChange={(e) => {
                    const c = savedClients.find((s) => s.id === e.target.value);
                    if (!c) return;
                    setCustomer((prev) => ({ ...prev, name: c.name, email: c.email, phone: c.phone, address: c.address, city: c.city, postalCode: c.postalCode }));
                    toast.success(`${c.name} added to this quote`);
                  }}
                  className="min-h-10 max-w-[55%] rounded-full bg-cream px-3 text-sm font-semibold ring-1 ring-black/10"
                >
                  <option value="">
                    {savedClients.length ? `Saved clients (${savedClients.length})` : "No saved clients"}
                  </option>
                  {savedClients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <input
                id="client-name"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                placeholder="e.g. Sarah Jenkins"
                className="field mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 max-[340px]:grid-cols-1">
              <label className="block">
                <span className="label-mono">Email</span>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  placeholder="e.g. sarah@example.com"
                  className="field mt-1"
                />
              </label>
              <label className="block">
                <span className="label-mono">Phone</span>
                <input
                  type="tel"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  placeholder="e.g. (416) 555-0192"
                  className="field mt-1 font-mono"
                />
              </label>
            </div>
            <label className="block">
              <span className="label-mono">Street address</span>
              <input
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                placeholder="e.g. 100 Yonge Street"
                className="field mt-1"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block min-w-0">
                <span className="label-mono">City</span>
                <input
                  value={customer.city}
                  onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                  placeholder="e.g. Toronto"
                  className="field mt-1"
                />
              </label>
              <label className="block min-w-0">
                <span className="label-mono">Postal / ZIP code</span>
                <input
                  value={customer.postalCode}
                  onChange={(e) => setCustomer({ ...customer, postalCode: e.target.value })}
                  placeholder="e.g. M5C 2C7"
                  className="field mt-1 font-mono"
                  autoCapitalize="characters"
                />
              </label>
            </div>
            {customer.name.trim() && clientModified && clientMatch ? (
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={updateClient}
                  className="clay-shadow flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-clay px-3 text-sm font-semibold text-cream active:translate-y-0.5"
                >
                  <Save className="size-4 shrink-0" aria-hidden="true" />
                  Update client information
                </button>
                <button
                  type="button"
                  onClick={revertClient}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink/70 underline underline-offset-4 ring-1 ring-transparent active:text-ink"
                >
                  <Undo2 className="size-4 shrink-0" aria-hidden="true" />
                  Revert to saved
                </button>
              </div>
            ) : customer.name.trim() ? (
              <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-cream px-3 ring-1 ring-black/5">
                <span className="text-sm font-semibold">Save client to directory</span>
                <Switch
                  checked={clientSaved}
                  onCheckedChange={toggleSaveClient}
                  aria-label="Save client to directory"
                />
              </label>
            ) : null}
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
      <div className="no-print fixed right-0 bottom-0 left-0 z-10 bg-gradient-to-t from-background via-background/95 to-transparent">
        <div className="app-safe-actions mx-auto max-w-[430px] px-3 pt-2 pb-4">
          <div className="clay-shadow grid grid-cols-4 gap-1.5 rounded-2xl bg-card p-2 ring-1 ring-black/5">
            <button
              onClick={saveQuote}
              disabled={saving}
              aria-busy={saving}
              aria-label="Save quote to my account"
              className="clay-shadow-ink flex min-h-16 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl bg-ink px-0.5 text-[11px] leading-none font-semibold text-cream active:translate-y-0.5 disabled:opacity-60 max-[360px]:text-[10px]"
            >
              {saving ? (
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="size-4 shrink-0" aria-hidden="true" />
              )}
              <span className="whitespace-nowrap">{saving ? "Saving…" : "Save Quote"}</span>
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
              aria-label="View quote PDF"
              className="flex min-h-16 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl bg-cream px-1 text-[11px] leading-none font-semibold text-ink ring-1 ring-line active:translate-y-0.5 max-[360px]:text-[10px]"
            >
              <FileText className="size-4 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">View PDF</span>
            </button>
            <button
              onClick={openEmail}
              aria-label="Email quote PDF"
              className="flex min-h-16 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl bg-cream px-1 text-[11px] leading-none font-semibold text-ink ring-1 ring-line active:translate-y-0.5 max-[360px]:text-[10px]"
            >
              <Mail className="size-4 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">Email PDF</span>
            </button>
            <button
              onClick={openSend}
              aria-label="Text or share this quote"
              className="clay-shadow flex min-h-16 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl bg-clay px-0.5 text-[11px] leading-none font-semibold text-cream active:translate-y-0.5 max-[360px]:text-[10px]"
            >
              <MessageSquare className="size-4 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">Text / Share</span>
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
          businessContact={businessContact}
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
            businessContact={businessContact}
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
              onClick={async () => {
                const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean }; webkit?: { messageHandlers?: unknown } };
                const isNative = !!w.Capacitor?.isNativePlatform?.() || (!!w.webkit?.messageHandlers && !/Safari\//.test(navigator.userAgent));
                if (!isNative) return window.print();
                try {
                  const { buildQuotePdfBase64 } = await import("@/lib/quote-pdf");
                  const b64 = await buildQuotePdfBase64({
                    business, businessContact, quoteNo, customer,
                    items: items.map(({ description, quantity, rate }) => ({ description, quantity, rate })),
                    taxRate, taxEnabled, currency,
                  });
                  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
                  const name = `Quote_${quoteNo.replace(/[^A-Za-z0-9_-]/g, "_")}.pdf`;
                  const file = new File([bytes], name, { type: "application/pdf" });
                  if (navigator.canShare?.({ files: [file] })) {
                    await navigator.share({ files: [file], title: `Quote ${quoteNo}` });
                  } else {
                    const url = URL.createObjectURL(file);
                    window.open(url, "_blank") ?? (window.location.href = url);
                    setTimeout(() => URL.revokeObjectURL(url), 60000);
                  }
                } catch (err) {
                  if (err instanceof Error && err.name === "AbortError") return;
                  toast.error("Couldn't create the PDF", { description: err instanceof Error ? err.message : "Please try again." });
                }
              }}
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
          <DialogHeader className="pr-10">
            <DialogTitle>Send SMS or Copy Summary</DialogTitle>
            <DialogDescription>
              Send a quick text message or copy the quote summary to send from your own apps.
            </DialogDescription>
          </DialogHeader>
          <textarea
            readOnly
            rows={9}
            value={message}
            className="w-full resize-none rounded-xl bg-cream p-3 text-sm leading-relaxed ring-1 ring-line outline-none"
          />
          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                title="Opens SMS/Messages with the quote text."
                aria-describedby="share-sms-help"
                onClick={() => {
                  void markSent(quoteId);
                  void sendVia(
                    `sms:${customer.phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(message)}`,
                  );
                }}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cream px-2 py-2 text-center text-[13px] font-semibold leading-snug ring-1 ring-line active:translate-y-0.5"
              >
                <MessageSquare className="size-4 shrink-0" aria-hidden="true" />
                <span>Send Text (SMS)</span>
              </button>
              <button
                type="button"
                title="Copies the summary so you can paste it into your email."
                aria-describedby="share-email-help"
                onClick={() =>
                  void copyMessage(
                    "Summary copied! Ready to paste into your email or messaging app.",
                  )
                }
                className="clay-shadow flex min-h-12 items-center justify-center gap-2 rounded-xl bg-clay px-2 py-2 text-center text-[13px] font-semibold leading-snug text-cream active:translate-y-0.5"
              >
                <Mail className="size-4 shrink-0" aria-hidden="true" />
                <span>Copy Summary for Email</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <p id="share-sms-help" className="text-center text-[11px] leading-snug text-inksoft">
                Opens SMS/Messages with the quote text.
              </p>
              <p id="share-email-help" className="text-center text-[11px] leading-snug text-inksoft">
                Copies the summary so you can paste it into your email.
              </p>
            </div>
          </div>
          <button
            onClick={() => void copyMessage()}
            title="Copies the text summary to your clipboard."
            aria-describedby="share-copy-help"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-inksoft underline underline-offset-4"
          >
            <Copy className="size-4 shrink-0" aria-hidden="true" />
            Copy Text
          </button>
          <p id="share-copy-help" className="-mt-2 text-center text-[11px] leading-snug text-inksoft">
            Copies the text summary to your clipboard.
          </p>
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

      {/* Microphone permission help */}
      <Dialog open={micDenied} onOpenChange={setMicDenied}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Microphone access is off</DialogTitle>
            <DialogDescription>
              Dictation needs your microphone. To turn it on:
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-inksoft">
            <li>Tap the lock or site-settings icon in your browser's address bar.</li>
            <li>Find <strong className="text-ink">Microphone</strong> and set it to <strong className="text-ink">Allow</strong>.</li>
            <li>Come back here and tap Try Again below.</li>
          </ol>
          <p className="text-xs text-inksoft">
            On iPhone you may also need Settings → Safari (or your browser) → Microphone → Allow.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setMicDenied(false)}
              className="field min-h-12 flex-1 rounded-xl px-4 text-sm font-semibold"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={() => {
                setMicDenied(false);
                void startDictation();
              }}
              className="clay-shadow min-h-12 flex-1 rounded-xl bg-clay px-4 text-sm font-bold text-cream"
            >
              Try Again
            </button>
          </div>
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
              No saved quotes yet. Save one with the Save Quote button.
            </p>
          ) : (
            <ul className="space-y-2">
              {saved.map((row) => (
                <li key={row.id} className="field rounded-xl p-2">
                  <button
                    type="button"
                    onClick={() => loadQuote(row)}
                    className="grid min-h-12 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 rounded-lg px-2 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {row.client_name || "Unnamed client"}
                        {row.id === quoteId && <span className="ml-1 text-xs text-leaf">· editing</span>}
                      </span>
                      <span className="label-mono block break-words text-xs text-inksoft">
                        {(row.line_items?.quoteNo ?? "").toString()}{" "}
                        {new Date(row.created_at).toLocaleDateString()}
                      </span>
                    </span>
                    <span className="label-mono col-span-2 break-words text-sm font-bold">
                      {money(Number(row.total_amount) || 0, row.currency ?? "USD")}
                    </span>
                  </button>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 px-1">
                    <select
                      value={row.status}
                      onChange={(e) => updateStatus(row.id, e.target.value)}
                      aria-label="Quote status"
                      className="min-h-10 w-28 shrink-0 rounded-lg bg-cream px-1.5 text-sm font-semibold ring-1 ring-line"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="accepted">Accepted</option>
                    </select>
                    <Button type="button" variant="outline" size="sm" title="Duplicate as New Quote (for new client)" aria-label="Duplicate as New Quote (for new client)" aria-haspopup="dialog" disabled={duplicating !== null} onClick={() => setDupConfirm(row)} className="h-10 min-w-0 shrink-0 grow gap-1 rounded-lg bg-cream px-2 text-sm font-semibold text-ink">
                      {duplicating === row.id ? <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Copy className="size-4 shrink-0" aria-hidden="true" />}
                      <span className="truncate">Duplicate Quote</span>
                    </Button>
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

      {/* Duplicate confirmation */}
      <Dialog
        open={dupConfirm !== null}
        onOpenChange={(open) => {
          if (!open && duplicating === null) setDupConfirm(null);
        }}
      >
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="pr-12">
            <DialogTitle>Duplicate as New Quote?</DialogTitle>
            <DialogDescription>
              This creates a fresh copy of all line items, quantities, and pricing for a new
              client. Client name and contact details will be left blank for you to fill in.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={duplicating !== null}
              onClick={() => setDupConfirm(null)}
              className="min-h-12 rounded-xl bg-cream px-4 text-sm font-semibold text-ink ring-1 ring-line"
            >
              Cancel
            </Button>
            <Button
              type="button"
              aria-busy={duplicating !== null}
              disabled={duplicating !== null}
              onClick={() => dupConfirm && void duplicateQuote(dupConfirm)}
              className="clay-shadow min-h-12 rounded-xl bg-clay px-4 text-sm font-semibold text-cream active:translate-y-0.5 disabled:opacity-70"
            >
              {duplicating !== null ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              Duplicate Quote
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Business settings */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="pr-12">
            <DialogTitle>Business Settings</DialogTitle>
            <DialogDescription>These details pre-fill every new quote.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {([
              ["business_name", "Business name", "text", "Your Business Name"],
              ["phone", "Phone number", "tel", "(416) 555-0100"],
              ["email", "Business email", "email", "you@yourbusiness.com"],
              ["address", "Street address", "text", "100 Yonge Street"],
            ] as const).map(([key, label, type, ph]) => (
              <label key={key} className="block">
                <span className="label-mono">{label}</span>
                <input
                  type={type}
                  value={settings[key]}
                  placeholder={ph}
                  onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
                  className="field mt-1 min-h-12 w-full rounded-xl px-3"
                />
              </label>
            ))}
            <div className="grid grid-cols-2 gap-3">
              {([
                ["city", "City", "Toronto"],
                ["postal_code", "Postal / ZIP", "M5C 2C7"],
              ] as const).map(([key, label, ph]) => (
                <label key={key} className="block min-w-0">
                  <span className="label-mono">{label}</span>
                  <input
                    value={settings[key]}
                    placeholder={ph}
                    onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
                    className="field mt-1 min-h-12 w-full rounded-xl px-3"
                  />
                </label>
              ))}
            </div>
            <label className="block">
              <span className="label-mono">Default tax rate (%)</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={settings.tax_rate}
                onChange={(e) => setSettings((s) => ({ ...s, tax_rate: e.target.value }))}
                className="field mt-1 min-h-12 w-full rounded-xl px-3"
              />
            </label>
            {([
              ["default_terms", "Default payment terms", "text", "50% deposit required"],
              ["logo_url", "Logo URL", "url", "https://…"],
            ] as const).map(([key, label, type, ph]) => (
              <label key={key} className="block">
                <span className="label-mono">{label}</span>
                <input
                  type={type}
                  value={settings[key]}
                  placeholder={ph}
                  onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
                  className="field mt-1 min-h-12 w-full rounded-xl px-3"
                />
              </label>
            ))}
            <label className="block">
              <span className="label-mono">Trade</span>
              <select
                value={settings.trade}
                onChange={(e) => setSettings((s) => ({ ...s, trade: e.target.value }))}
                className="field mt-1 min-h-12 w-full rounded-xl px-3"
              >
                {TRADES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </label>
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
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4">
            <span className="label-mono">Legal</span>
            <Link to="/privacy" className="text-sm font-semibold underline underline-offset-4">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-sm font-semibold underline underline-offset-4">
              Terms of Service
            </Link>
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
