import { Capacitor } from "@capacitor/core";

export const PUBLISHED_ORIGIN = "https://simple-job-quotes.lovable.app";

/** Call only from browser effects/events; native shells do not host server routes. */
export function hostedAppOrigin(): string {
  return Capacitor.isNativePlatform() || !/^https?:$/.test(window.location.protocol)
    ? PUBLISHED_ORIGIN : window.location.origin;
}