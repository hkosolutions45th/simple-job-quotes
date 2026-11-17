import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { generateQuoteItems, type AiQuoteResult } from "./ai-quote.functions";
import { hostedAppOrigin } from "./hosted-app";

/** Web uses the server function; native shells call the hosted HTTP route on the primary domain. */
export async function requestQuoteItems(notes: string): Promise<AiQuoteResult> {
  if (!Capacitor.isNativePlatform() && /^https?:$/.test(window.location.protocol)) {
    return generateQuoteItems({ data: { notes } });
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You're signed out. Please sign in again.");
  let res: Response;
  try {
    res = await fetch(`${hostedAppOrigin()}/api/public/generate-quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ notes }),
    });
  } catch (e) {
    throw new Error(`Network error contacting AI server: ${e instanceof Error ? e.message : String(e)}`);
  }
  const json = (await res.json().catch(() => ({}))) as Partial<AiQuoteResult> & { error?: string };
  if (!res.ok) throw new Error(json.error || `AI request failed (${res.status}).`);
  return json as AiQuoteResult;
}
