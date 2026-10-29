import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose New Password — InstaQuote" },
      { name: "description", content: "Set a new password for your InstaQuote account." },
      { property: "og:title", content: "Choose New Password — InstaQuote" },
      { property: "og:description", content: "Set a new password for your InstaQuote account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) { setHasSession(true); setReady(true); }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasSession(true);
      // Give the recovery link a moment to be processed before showing the expired message.
      setTimeout(() => setReady(true), session ? 0 : 1500);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords do not match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message || "Couldn't update your password. Please try again."); return; }
    toast.success("Password updated");
    await navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[430px] px-4 py-10">
        <h1 className="text-2xl font-bold">Choose New Password</h1>
        {!ready ? (
          <div role="status" className="mt-8 flex justify-center"><Loader2 className="size-6 animate-spin" /></div>
        ) : !hasSession ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-inksoft">This reset link is invalid or has expired. Request a new one from the sign-in screen.</p>
            <Link to="/auth" className="text-sm font-semibold underline underline-offset-4">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-3">
            <label className="block">
              <span className="label-mono">New password</span>
              <input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="field mt-1" />
            </label>
            <label className="block">
              <span className="label-mono">Confirm new password</span>
              <input type="password" required minLength={6} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="field mt-1" />
            </label>
            <Button type="submit" disabled={busy} className="mt-2 min-h-14 w-full">{busy ? "Saving…" : "Update password"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
