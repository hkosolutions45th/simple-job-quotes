import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { readDeviceText, writeDeviceText } from "@/lib/device-storage";
import { Loader2, Mic } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — InstaQuote" },
      {
        name: "description",
        content:
          "Sign in to InstaQuote to save your contractor quotes to the cloud and pick them up on any device.",
      },
      { property: "og:title", content: "Sign in — InstaQuote" },
      {
        property: "og:description",
        content: "Save your contractor quotes to the cloud and pick them up on any device.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { signup?: boolean } => search["signup"] === true || search["signup"] === "true" ? { signup: true } : {},
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(search.signup ? "signup" : "signin");
  const [ready, setReady] = useState(false);
  const [introSeen, setIntroSeen] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    setIntroSeen(readDeviceText("has_seen_onboarding") === "true");
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(true);
      if (session) navigate({ to: "/", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        navigate({ to: "/", replace: true });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && password !== confirmPassword) { toast.error("Passwords do not match."); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { trade: readDeviceText("instaquote:trade") ?? "" } },
        });
        if (error) throw error;
        // An already-registered email returns a user with no identities and no email is sent.
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          toast.error("An account with this email already exists. Sign in instead, or reset your password.");
          setMode("signin");
          return;
        }
        if (data.session) await navigate({ to: "/", replace: true });
        else setCheckEmail(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const social = async (provider: "google" | "apple") => {
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (result.error) throw result.error;
    } catch (err: any) {
      toast.error(err?.message ?? "Sign-in failed");
    }
  };

  if (!ready) return <div role="status" className="startup-screen flex min-h-dvh items-center justify-center bg-background"><Loader2 className="size-6 animate-spin" /></div>;
  if (!introSeen) return <OnboardingFlow beforeAccount onDone={async () => { writeDeviceText("has_seen_onboarding", "true"); setIntroSeen(true); setMode("signup"); }} onRestore={async () => false} />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[430px] px-4 py-10">
        <Link to="/" className="label-mono tracking-[0.22em]">
          ← InstaQuote
        </Link>
        {mode === "signup" && <div className="mt-5 grid size-14 place-items-center rounded-lg bg-primary text-primary-foreground"><Mic className="size-7" /></div>}
        <h1 className={mode === "signup" ? "mt-4 text-3xl font-bold text-primary" : "mt-4 text-2xl font-bold"}>
          {mode === "signin" ? "Sign in to save quotes" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-inksoft">
          Your quotes stay on your account — ready on the truck, the office, or a client's kitchen
          table.
        </p>

        {checkEmail ? (
          <div className="mt-6 rounded-2xl bg-card p-4 ring-1 ring-black/5">
            <p className="text-sm font-semibold">Check your email</p>
            <p className="mt-1 text-sm text-inksoft">
              We sent a confirmation link to {email}. Click it, then come back and sign in.
            </p>
            <p className="mt-2 text-xs text-inksoft">Don't see it? Check your spam or junk folder.</p>
            <Button type="button" variant="outline" disabled={busy} className="mt-3 min-h-12 w-full" onClick={async () => {
              setBusy(true);
              const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: window.location.origin } });
              setBusy(false);
              if (error) toast.error(error.message || "Couldn't resend the email. Please try again shortly.");
              else toast.success(`Verification email sent again to ${email}.`);
            }}>{busy ? "Sending…" : "Resend verification email"}</Button>
            <Button type="button" variant="ghost" className="mt-2 w-full text-sm underline" onClick={() => { setCheckEmail(false); setMode("signin"); }}>Back to sign in</Button>
          </div>
        ) : (
          <>
            <Button variant="outline"
              onClick={() => void social("google")}
              className="clay-shadow mt-6 min-h-14 w-full rounded-xl bg-card px-4 text-sm font-semibold ring-1 ring-line active:translate-y-0.5"
            >
              Continue with Google
            </Button>
            <Button variant="outline" onClick={() => void social("apple")} className="mt-3 min-h-14 w-full bg-foreground text-background">
              Continue with Apple
            </Button>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="label-mono">or email</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={submit} className="grid gap-3">
              <label className="block">
                <span className="label-mono">Email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field mt-1"
                />
              </label>
              <label className="block">
                <span className="label-mono">Password</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field mt-1"
                />
              </label>
              {mode === "signup" && <label className="block">
                <span className="label-mono">Confirm password</span>
                <input type="password" required minLength={6} autoComplete="new-password" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} className="field mt-1" />
              </label>}
              <Button
                type="submit"
                disabled={busy}
                className="clay-shadow-leaf mt-2 min-h-14 w-full rounded-xl bg-leaf px-4 text-sm font-semibold text-cream active:translate-y-0.5 disabled:opacity-60"
              >
                {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <Button variant="ghost"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="mt-4 w-full text-sm font-semibold underline underline-offset-4"
            >
              {mode === "signin"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
