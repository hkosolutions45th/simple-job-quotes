import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Mic,
  FileText,
  Users,
  Hash,
  X,
  Check,
  Paintbrush,
  Leaf,
  Home,
  Fan,
  Zap,
  Wrench,
  Briefcase,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { writeDeviceText } from "@/lib/device-storage";
import { cn } from "@/lib/utils";

const TRADES = [
  { id: "painter", label: "Painting", icon: Paintbrush },
  { id: "landscaper", label: "Landscaping", icon: Leaf },
  { id: "roofer", label: "Roofing", icon: Home },
  { id: "hvac", label: "HVAC", icon: Fan },
  { id: "electrician", label: "Electrical", icon: Zap },
  { id: "plumber", label: "Plumbing", icon: Wrench },
  { id: "other", label: "Other trade", icon: Briefcase },
] as const;

const BENEFITS = [
  { icon: FileText, title: "Unlimited PDF Quotes", text: "Print-ready, professional quotes on every job." },
  { icon: Users, title: "Client Directory Sync", text: "Your clients follow you on every device." },
  { icon: Hash, title: "Auto Quote Numbers", text: "Every quote numbered and tracked for you." },
] as const;

type Plan = "monthly" | "annual";

export function OnboardingFlow({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [trade, setTrade] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>("annual");

  const finish = () => {
    writeDeviceText("instaquote:onboardingDone", "1");
    if (trade) writeDeviceText("instaquote:trade", trade);
    onDone();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to InstaQuote"
      className="app-safe-layout fixed inset-0 z-50 flex flex-col bg-cream text-ink"
    >
      {/* Top bar: progress + close */}
      <div className="app-safe-header mx-auto flex w-full max-w-[430px] items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-7 bg-clay" : i < step ? "w-3 bg-clay/50" : "w-3 bg-ink/15",
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={finish}
          aria-label="Close onboarding"
          className="grid size-11 place-items-center rounded-full bg-ink/5 text-ink transition-colors hover:bg-ink/10"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      {/* Slide content */}
      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col overflow-y-auto px-6 pb-6 pt-3">
        {step === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
            <div className="clay-shadow grid size-28 place-items-center rounded-3xl bg-clay text-cream">
              <Mic className="size-12" aria-hidden="true" />
            </div>
            <div>
              <p className="label-mono tracking-[0.22em] text-muted-foreground">Welcome to InstaQuote</p>
              <h1 className="mt-3 text-4xl font-bold leading-tight">
                Send professional PDF quotes in under 60 seconds.
              </h1>
              <p className="mx-auto mt-4 max-w-xs text-base text-muted-foreground">
                Dictate the job, get a priced quote, and text or email it before you leave the driveway.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="clay-shadow flex min-h-14 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-clay text-lg font-bold text-cream"
            >
              Get started <ArrowRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-1 flex-col">
            <p className="label-mono tracking-[0.22em] text-muted-foreground">Quick question</p>
            <h2 className="mt-2 text-3xl font-bold leading-tight">What trade are you in?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We'll tune your quote templates and sample rates to match.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {TRADES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTrade(id)}
                  aria-pressed={trade === id}
                  className={cn(
                    "flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 px-3 text-base font-bold transition-colors",
                    trade === id
                      ? "clay-shadow border-clay bg-clay text-cream"
                      : "border-ink/10 bg-paper text-ink hover:border-clay/40",
                  )}
                >
                  <Icon className="size-6" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-auto flex gap-3 pt-8">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-ink/5 px-5 text-base font-bold text-ink"
              >
                <ArrowLeft className="size-5" aria-hidden="true" /> Back
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="clay-shadow flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-clay text-lg font-bold text-cream"
              >
                {trade ? "Continue" : "Skip"} <ArrowRight className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-1 flex-col">
            <h2 className="text-2xl font-bold leading-tight">Start Your 7-Day Free Trial</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Full access to everything. Cancel anytime — no charge until day 8.
            </p>

            <ul className="mt-3 space-y-2">
              {BENEFITS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex items-start gap-3 rounded-2xl bg-paper p-2.5">
                  <span className="clay-shadow-leaf grid size-10 shrink-0 place-items-center rounded-xl bg-leaf text-cream">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-base font-bold">{title}</span>
                    <span className="block text-sm text-muted-foreground">{text}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Choose a plan">
              <button
                type="button"
                role="radio"
                aria-checked={plan === "monthly"}
                onClick={() => setPlan("monthly")}
                className={cn(
                  "relative flex min-h-24 flex-col items-center justify-center rounded-2xl border-2 px-3 transition-colors",
                  plan === "monthly"
                    ? "clay-shadow border-clay bg-paper"
                    : "border-ink/10 bg-paper hover:border-clay/40",
                )}
              >
                {plan === "monthly" && (
                  <span className="absolute -top-3 grid size-6 place-items-center rounded-full bg-clay text-cream">
                    <Check className="size-4" aria-hidden="true" />
                  </span>
                )}
                <span className="text-2xl font-bold">$9.99</span>
                <span className="text-sm text-muted-foreground">per month</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={plan === "annual"}
                onClick={() => setPlan("annual")}
                className={cn(
                  "relative flex min-h-24 flex-col items-center justify-center rounded-2xl border-2 px-3 transition-colors",
                  plan === "annual"
                    ? "clay-shadow border-clay bg-paper"
                    : "border-ink/10 bg-paper hover:border-clay/40",
                )}
              >
                <span className="absolute -top-3 rounded-full bg-leaf px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-cream">
                  Save 25%
                </span>
                <span className="text-2xl font-bold">$89</span>
                <span className="text-sm text-muted-foreground">per year</span>
              </button>
            </div>

            <div className="mt-auto pt-4">
              <button
                type="button"
                onClick={finish}
                className="clay-shadow flex min-h-14 w-full items-center justify-center rounded-2xl bg-clay text-lg font-bold text-cream"
              >
                Start Free Trial
              </button>
              <button
                type="button"
                onClick={finish}
                className="mt-1 flex min-h-9 w-full items-center justify-center text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline"
              >
                Maybe later
              </button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                By continuing you agree to our{" "}
                <Link to="/terms" className="font-semibold text-clay underline underline-offset-2">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="font-semibold text-clay underline underline-offset-2">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
