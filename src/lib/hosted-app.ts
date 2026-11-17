import { Capacitor } from "@capacitor/core";

/** Managed OAuth broker host (hosts /~oauth). */
export const PUBLISHED_ORIGIN = "https://simple-job-quotes.lovable.app";
/** Primary domain for API calls: the lovable.app host 307-redirects here, and WKWebView rejects redirected CORS preflights ("Load failed"). */
export const API_ORIGIN = "https://instaquote.hkosolutions.ca";

/** Call only from browser effects/events; native shells do not host server routes. */
export function hostedAppOrigin(): string {
  return Capacitor.isNativePlatform() || !/^https?:$/.test(window.location.protocol)
    ? API_ORIGIN : window.location.origin;
}
