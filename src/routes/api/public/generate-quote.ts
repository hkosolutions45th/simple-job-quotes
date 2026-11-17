import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { quoteNotesSchema, runQuoteAi } from "@/lib/ai-quote.functions";

// Plain HTTP endpoint so the native iOS app (capacitor://localhost) can reach AI generation.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const reply = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { ...CORS, "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/public/generate-quote")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const url = process.env["SUPABASE_URL"];
        const anon = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!url || !anon) return reply({ error: "Server is not configured." }, 500);
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
        if (!token) return reply({ error: "Please sign in again." }, 401);
        const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data: userData, error } = await supabase.auth.getUser(token);
        if (error || !userData.user) return reply({ error: "Please sign in again." }, 401);
        let body: unknown;
        try { body = await request.json(); } catch { return reply({ error: "Invalid request." }, 400); }
        const parsed = quoteNotesSchema.safeParse(body);
        if (!parsed.success) return reply({ error: "Add job notes first." }, 400);
        try {
          return reply(await runQuoteAi(parsed.data.notes));
        } catch (e) {
          return reply({ error: e instanceof Error ? e.message : "AI request failed." }, 502);
        }
      },
    },
  },
});
