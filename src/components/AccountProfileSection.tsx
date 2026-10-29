import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { authRedirectUrl } from "@/lib/auth-deep-link";

const PROVIDER_LABELS: Record<string, string> = { apple: "Signed in with Apple", google: "Signed in with Google", email: "Email / Password" };

export function providerLabel(user: Pick<User, "app_metadata">): string {
  const p = String(user.app_metadata?.provider ?? "email");
  return PROVIDER_LABELS[p] ?? `Signed in with ${p}`;
}

export function AccountProfileSection({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [name, setName] = useState<string>(String(user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? ""));
  const [email, setEmail] = useState(user.email ?? "");
  const [busy, setBusy] = useState(false);
  const isEmailAccount = (user.app_metadata?.provider ?? "email") === "email";

  const save = async () => {
    setBusy(true);
    try {
      const emailChanged = isEmailAccount && email.trim() && email.trim() !== user.email;
      const { error } = await supabase.auth.updateUser(
        { data: { display_name: name.trim() }, ...(emailChanged ? { email: email.trim() } : {}) },
        { emailRedirectTo: authRedirectUrl() },
      );
      if (error) throw error;
      toast.success(emailChanged ? "Profile updated. Check your new email to confirm the change." : "Profile updated");
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Couldn't update your profile. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3 border-t border-line pt-4">
      <p className="label-mono">Account</p>
      <p className="text-sm font-semibold">{providerLabel(user)}</p>
      <label className="block">
        <span className="label-mono">Display name</span>
        <input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sam Rivera" autoComplete="name" />
      </label>
      <label className="block">
        <span className="label-mono">Email address</span>
        <input className="field mt-1" type="email" value={email} disabled={!isEmailAccount} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. you@yourbusiness.com" autoComplete="email" />
        {!isEmailAccount && <span className="mt-1 block text-xs text-inksoft">Your email is managed by your sign-in provider.</span>}
      </label>
      <Button className="min-h-12 w-full" disabled={busy} onClick={() => void save()} aria-busy={busy}>
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} {busy ? "Saving…" : "Update Profile"}
      </Button>
      <Button variant="outline" className="min-h-12 w-full" onClick={onSignOut}>
        <LogOut className="size-4" aria-hidden="true" /> Sign Out
      </Button>
    </div>
  );
}
