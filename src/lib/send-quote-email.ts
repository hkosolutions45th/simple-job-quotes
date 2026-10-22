import { supabase } from "@/integrations/supabase/client";
import { emailErrorMessage, type Payload } from "./quote-email";

const PUBLISHED_ORIGIN = "https://simple-job-quotes.lovable.app";

export type SendResult = { sent: true; id: string } | { sent: false; error: string };

/** Native app pages are served from capacitor://, so call the published server. */
function endpoint() {
  const native = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
  const origin = native || !/^https?:$/.test(window.location.protocol) ? PUBLISHED_ORIGIN : window.location.origin;
  return `${origin}/api/public/send-quote-email`;
}

export async function sendQuoteEmailRequest(payload: Payload): Promise<SendResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { sent: false, error: "You're signed out. Please sign in again to send email." };

  let response: Response;
  try {
    response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return { sent: false, error: `Network error contacting email server: ${emailErrorMessage(error)}` };
  }
  const raw = await response.text();
  let json: Record<string, unknown> = {};
  try { json = JSON.parse(raw); } catch { /* non-JSON error page */ }
  if (response.ok && json["sent"] === true && typeof json["id"] === "string") return { sent: true, id: json["id"] };
  const detail = typeof json["error"] === "string" && json["error"].trim()
    ? json["error"]
    : raw.trim().slice(0, 300) || response.statusText;
  return { sent: false, error: `HTTP ${response.status}: ${detail || "no error details returned"}` };
}
