import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
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
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setCheckEmail(true);
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

  const google = async () => {
    try {
      await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    } catch (err: any) {
      toast.error(err?.message ?? "Google sign-in failed");
    }
  };

  return (
    <div className="min-h-screen bg-cream text-ink">
      <div className="mx-auto max-w-[430px] px-4 py-10">
        <Link to="/" className="label-mono tracking-[0.22em]">
          ← InstaQuote
        </Link>
        <h1 className="mt-4 text-2xl font-bold">
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
          </div>
        ) : (
          <>
            <button
              onClick={google}
              className="clay-shadow mt-6 min-h-14 w-full rounded-xl bg-card px-4 text-sm font-semibold ring-1 ring-line active:translate-y-0.5"
            >
              Continue with Google
            </button>

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
              <button
                type="submit"
                disabled={busy}
                className="clay-shadow-leaf mt-2 min-h-14 w-full rounded-xl bg-leaf px-4 text-sm font-semibold text-cream active:translate-y-0.5 disabled:opacity-60"
              >
                {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="mt-4 w-full text-sm font-semibold underline underline-offset-4"
            >
              {mode === "signin"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
