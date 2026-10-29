import { supabase } from "@/integrations/supabase/client";
import { isNativeIOS } from "./revenuecat";

/** Custom scheme the iOS app registers; auth emails opened on the phone return here. */
export const APP_AUTH_CALLBACK = "instaquote://auth-callback";

/** Where auth emails (confirm, change email, reset) should send the user back to. */
export function authRedirectUrl(path = ""): string {
  if (typeof window === "undefined") return "";
  return isNativeIOS() ? APP_AUTH_CALLBACK : window.location.origin + path;
}

/** Password-reset return address; the type flag survives PKCE links that omit it. */
export function recoveryRedirectUrl(): string {
  if (typeof window === "undefined") return "";
  return isNativeIOS() ? `${APP_AUTH_CALLBACK}?type=recovery` : `${window.location.origin}/reset-password`;
}

/** True when an auth link is a password-recovery link. */
export function isRecoveryLink(url: string): boolean {
  const parsed = new URL(url);
  return parsed.searchParams.get("type") === "recovery" || new URLSearchParams(parsed.hash.replace(/^#/, "")).get("type") === "recovery";
}

/** Signs the user in from an incoming auth link (PKCE code or token fragment). */
export async function consumeAuthLink(url: string): Promise<boolean> {
  const parsed = new URL(url);
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const code = parsed.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return true;
  }
  const access_token = hash.get("access_token");
  const refresh_token = hash.get("refresh_token");
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    return true;
  }
  const err = hash.get("error_description") ?? parsed.searchParams.get("error_description");
  if (err) throw new Error(err);
  return false;
}

/** Native only: listen for instaquote:// links and hand the session to the app. */
export async function listenForAuthDeepLinks(onSignedIn: (recovery: boolean) => void, onError: (m: string) => void): Promise<() => void> {
  if (typeof window === "undefined" || !isNativeIOS()) return () => undefined;
  const { App } = await import("@capacitor/app");
  const handle = await App.addListener("appUrlOpen", ({ url }) => {
    if (!url.startsWith("instaquote://")) return;
    consumeAuthLink(url).then((ok) => { if (ok) onSignedIn(isRecoveryLink(url)); })
      .catch((e) => onError(e instanceof Error ? e.message : "That sign-in link didn't work. Please try again."));
  });
  return () => { void handle.remove(); };
}
