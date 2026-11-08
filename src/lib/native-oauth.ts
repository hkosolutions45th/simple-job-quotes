import { Capacitor } from "@capacitor/core";
import { lovable } from "@/integrations/lovable";
import { APP_AUTH_CALLBACK } from "./auth-deep-link";
import { PUBLISHED_ORIGIN } from "./hosted-app";

export async function signInWithProvider(provider: "google" | "apple"): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    // Preserve the managed helper's iframe-safe preview flow on the web.
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) throw result.error;
    return;
  }
  // Match the managed broker's full-page initiation contract, but launch outside
  // WKWebView: provider pages and /~oauth are hosted, not Capacitor routes.
  const params = new URLSearchParams({ provider, redirect_uri: APP_AUTH_CALLBACK, state: crypto.randomUUID() });
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url: `${PUBLISHED_ORIGIN}/~oauth/initiate?${params}`, presentationStyle: "popover" });
}