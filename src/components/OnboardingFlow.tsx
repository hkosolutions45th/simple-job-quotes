import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Mic,
  FileText,
  Users,
  Hash,
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
  Loader2,
  RotateCcw,
} from "lucide-react";
import { writeDeviceText } from "@/lib/device-storage";
import { cn } from "@/lib/utils";

export const TRADES = [
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

export function OnboardingFlow({
  onDone,
  onTrade,
  onRestore,
  beforeAccount = false,
  initialStep = 0,
  /** Escape hatch on the paywall: returns to the sign-in screen (never unlocks the app). */
  onSignIn,
}: {
  beforeAccount?: boolean;
  initialStep?: number;
  onDone: (plan: Plan) => Promise<void>;
  onRestore: () => Promise<boolean>;
  onSignIn?: () => void;
  /** Fired the instant a trade is tapped so it lands in Business Settings right away. */
  onTrade?: (tradeId: string) => void;
}) {
  const [step, setStep] = useState(initialStep);
  const [trade, setTrade] = useState<string | null>(null);
  // The annual plan is the default choice when the paywall appears.
  const [plan, setPlan] = useState<Plan>("annual");
  const [busy, setBusy] = useState<"complete" | "restore" | null>(null);

  const pickTrade = (id: string) => {
    setTrade(id);
    writeDeviceText("instaquote:trade", id);
    onTrade?.(id);
  };

  const finish = async () => {
    // The parent marks the trial step complete for this account — there is no
    // other way past this screen (no close, no skip).
    if (trade) writeDeviceText("instaquote:trade", trade);
    setBusy("complete");
    try { await onDone(plan); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't save your progress. Please try again."); }
    finally { setBusy(null); }
  };

  const restore = async () => {
    setBusy("restore");
    try {
      const active = await onRestore();
      if (active) toast.success("Purchases restored successfully!");
      else toast.info("No active subscription found for this Apple ID.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't restore purchases. Please try again.");
    } finally { setBusy(null); }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to InstaQuote"
      className="onboarding-screen fixed inset-0 z-50 flex flex-col bg-background text-foreground"
    >
      {/* Top bar: progress only — the trial step is required, so there is no close */}
      <div className="app-safe-header mx-auto flex w-full max-w-[430px] items-center justify-between px-5 py-3">
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
      </div>

      {/* Slide content */}
      <div className="mx-auto flex w-full max-w-[430px] min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-3 pt-2">
        {step === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <div className="clay-shadow grid size-20 place-items-center rounded-3xl bg-clay text-cream">
              <Mic className="size-12" aria-hidden="true" />
            </div>
            <div>
              <p className="label-mono tracking-[0.22em] text-muted-foreground">Welcome to InstaQuote</p>
              <h1 className="mt-3 text-3xl font-bold leading-tight">
                Send professional PDF quotes in under 60 seconds.
              </h1>
              <p className="mx-auto mt-4 max-w-xs text-base text-muted-foreground">
                Dictate the job, get a priced quote, and text or email it before you leave the driveway.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setStep(1)}
              className="clay-shadow flex min-h-14 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-clay text-lg font-bold text-cream"
            >
              Get started <ArrowRight className="size-5" aria-hidden="true" />
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-1 flex-col">
            <p className="label-mono tracking-[0.22em] text-muted-foreground">Quick question</p>
            <h2 className="mt-2 text-3xl font-bold leading-tight">What trade are you in?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We'll tune your quote templates and sample rates to match.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {TRADES.map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  variant="outline"
                  type="button"
                  onClick={() => pickTrade(id)}
                  aria-pressed={trade === id}
                  className={cn(
                    "flex min-h-16 flex-row items-center justify-center gap-2 rounded-2xl border-2 px-3 text-base font-bold transition-colors",
                    trade === id
                      ? "clay-shadow border-clay bg-clay text-cream"
                      : "border-ink/10 bg-paper text-ink hover:border-clay/40",
                  )}
                >
                  <Icon className="size-6" aria-hidden="true" />
                  {label}
                </Button>
              ))}
            </div>
            <div className="onboarding-actions sticky bottom-0 mt-auto flex gap-3 bg-background pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(0)}
                className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-ink/5 px-5 text-base font-bold text-ink"
              >
                <ArrowLeft className="size-5" aria-hidden="true" /> Back
              </Button>
              <Button
                type="button"
                disabled={!trade || busy !== null}
                onClick={() => beforeAccount ? void finish() : setStep(2)}
                className="clay-shadow flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-clay text-lg font-bold text-cream"
              >
                {busy ? "Continuing…" : "Continue"} <ArrowRight className="size-5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="paywall-content flex flex-1 flex-col">
            <h2 className="text-2xl font-bold leading-tight">Start Your 7-Day Free Trial</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              For eligible Apple accounts. Cancel anytime in App Store settings.
            </p>

            <ul className="mt-2 space-y-1.5">
              {BENEFITS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex items-start gap-3 rounded-2xl bg-paper p-2">
                  <span className="clay-shadow-leaf grid size-10 shrink-0 place-items-center rounded-xl bg-leaf text-cream">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-base font-bold">{title}</span>
                    <span className="hidden text-sm text-muted-foreground min-[700px]:block">{text}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Choose a plan">
              <Button
                type="button"
                variant="outline"
                role="radio"
                aria-checked={plan === "monthly"}
                onClick={() => setPlan("monthly")}
                className={cn(
                  "relative flex min-h-20 flex-col items-center justify-center rounded-2xl border-2 px-3 transition-colors",
                  plan === "monthly"
                    ? "clay-shadow border-clay bg-paper ring-2 ring-clay/25"
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
              </Button>
              <Button
                type="button"
                variant="outline"
                role="radio"
                aria-checked={plan === "annual"}
                onClick={() => setPlan("annual")}
                className={cn(
                  "relative flex min-h-20 flex-col items-center justify-center rounded-2xl border-2 px-3 transition-colors",
                  plan === "annual"
                    ? "clay-shadow border-clay bg-paper ring-2 ring-clay/25"
                    : "border-ink/10 bg-paper hover:border-clay/40",
                )}
              >
                <span className="absolute -top-3 rounded-full bg-leaf px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-cream">
                  Save 25%
                </span>
                <span className="text-2xl font-bold">$89.99</span>
                <span className="text-sm text-muted-foreground">per year</span>
              </Button>
            </div>

            <div className="onboarding-actions sticky bottom-0 mt-auto bg-background pt-3">
              <Button
                type="button"
                onClick={() => void finish()}
                disabled={busy !== null}
                aria-busy={busy === "complete"}
                className="clay-shadow flex min-h-14 w-full items-center justify-center rounded-2xl bg-clay text-lg font-bold text-cream"
              >
                {busy === "complete" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {busy === "complete" ? "Opening App Store…" : "Start Free Trial"}
              </Button>
              <Button type="button" variant="outline" onClick={() => void restore()} disabled={busy !== null}
                aria-busy={busy === "restore"} className="mt-2 min-h-12 w-full text-base font-semibold">
                {busy === "restore" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="size-4" aria-hidden="true" />}
                {busy === "restore" ? "Restoring…" : "Restore Purchases"}
              </Button>
              <p className="mt-2 text-center text-xs leading-snug text-muted-foreground">
                7 days free, then {plan === "annual" ? "$89.99/year" : "$9.99/month"}. Cancel anytime in App Store
                settings.
              </p>
              <p className="mt-2 text-center text-xs leading-snug text-muted-foreground">
                $9.99/month or $89.99/year (with 7-day free trial). Subscriptions auto-renew unless turned off at least 24 hours before the trial or current period ends.
              </p>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                By continuing you agree to our{" "}
                <a href="https://hkosolutions.ca/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-clay underline underline-offset-2">
                  Terms of Use (EULA)
                </a>{" "}
                and{" "}
                <a href="https://hkosolutions.ca/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-clay underline underline-offset-2">
                  Privacy Policy
                </a>
                .
              </p>
              {onSignIn && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onSignIn}
                  className="mt-3 w-full text-sm font-semibold underline underline-offset-4"
                >
                  Already have an account? Sign in
                </Button>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
