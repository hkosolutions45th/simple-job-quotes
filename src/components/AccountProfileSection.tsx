import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { ChevronDown, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { authRedirectUrl } from "@/lib/auth-deep-link";

const PROVIDER_LABELS: Record<string, string> = { apple: "Signed in with Apple", google: "Signed in with Google", email: "Email / Password" };

export function providerLabel(user: Pick<User, "app_metadata">): string {
  const p = String(user.app_metadata?.provider ?? "email");
  return PROVIDER_LABELS[p] ?? `Signed in with ${p}`;
}

export function AccountProfileSection({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [name, setName] = useState<string>(String(user.user_metadata?.["display_name"] ?? user.user_metadata?.["full_name"] ?? ""));
  const [email, setEmail] = useState(user.email ?? "");
  const [busy, setBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const isEmailAccount = (user.app_metadata?.provider ?? "email") === "email";

  // Auth refreshes may arrive while settings remains mounted after confirmation.
  useEffect(() => {
    setEmail(user.email ?? "");
    setPendingEmail("");
  }, [user.id, user.email]);

  useEffect(() => {
    setName(String(user.user_metadata?.["display_name"] ?? user.user_metadata?.["full_name"] ?? ""));
  }, [user.id, user.user_metadata?.["display_name"], user.user_metadata?.["full_name"]]);

  const save = async () => {
    setBusy(true);
    try {
      const emailChanged = isEmailAccount && email.trim() && email.trim() !== user.email;
      const { error } = await supabase.auth.updateUser(
        { data: { display_name: name.trim() }, ...(emailChanged ? { email: email.trim() } : {}) },
        { emailRedirectTo: authRedirectUrl() },
      );
      if (error) throw error;
      if (emailChanged) setPendingEmail(email.trim());
      toast.success(emailChanged ? "Confirmation link sent to your new email address." : "Profile updated", emailChanged ? {
        description: `Open the email sent to ${email.trim()} and click the confirmation link to finalize your email change.`,
        duration: 10000,
      } : undefined);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Couldn't update your profile. Please try again.");
    } finally { setBusy(false); }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) { toast.error("Passwords do not match."); return; }
    setPasswordBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update your password. Please try again.");
    } finally { setPasswordBusy(false); }
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
        {isEmailAccount && <span className="mt-1 block text-xs text-inksoft">Changing your email requires confirmation. Open the email sent to your new email address and click the confirmation link to finalize the change. Your current email remains active until confirmation is complete.</span>}
      </label>
      {pendingEmail && <p role="status" className="text-sm text-inksoft">Check {pendingEmail} and click the confirmation link to finalize your email change. If a confirmation also arrives at your current address, confirm that link too.</p>}
      <Button className="min-h-12 w-full" disabled={busy} onClick={() => void save()} aria-busy={busy}>
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} {busy ? "Saving…" : "Update Profile"}
      </Button>
      {isEmailAccount && <div className="border-t border-line pt-3">
        <Button
          type="button"
          variant="outline"
          className="min-h-12 w-full justify-between"
          aria-expanded={passwordOpen}
          onClick={() => {
            setPasswordOpen((open) => {
              if (open) { setPassword(""); setConfirmPassword(""); }
              return !open;
            });
          }}
        >
          Change Password
          <ChevronDown className={`size-4 transition-transform ${passwordOpen ? "rotate-180" : ""}`} aria-hidden="true" />
        </Button>
        {passwordOpen && <form onSubmit={changePassword} className="space-y-3 pt-3">
          <input type="text" name="username" autoComplete="username" value={user.email ?? ""} readOnly className="sr-only" aria-label="Account email for password change" />
          <label className="block">
            <span className="label-mono">New password</span>
            <input type="password" name="new-password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="field mt-1" />
          </label>
          <label className="block">
            <span className="label-mono">Confirm new password</span>
            <input type="password" name="confirm-password" autoComplete="new-password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="field mt-1" />
          </label>
          <div className="flex gap-2">
            <Button type="submit" className="min-h-12 flex-1" disabled={passwordBusy} aria-busy={passwordBusy}>
              {passwordBusy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} {passwordBusy ? "Saving…" : "Save New Password"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-12 flex-1"
              onClick={() => { setPasswordOpen(false); setPassword(""); setConfirmPassword(""); }}
            >
              Cancel
            </Button>
          </div>
        </form>}
      </div>}
      <Button variant="outline" className="min-h-12 w-full" onClick={onSignOut}>
        <LogOut className="size-4" aria-hidden="true" /> Sign Out
      </Button>
    </div>
  );
}
