import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { buildResendPayload, emailErrorMessage, payloadSchema, readResendResult } from "@/lib/quote-email";

// Plain HTTP endpoint (not RPC) so the native iOS app can reach it with an
// absolute URL and every failure comes back as readable JSON.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const reply = (body: Record<string, unknown>, status = 200) =>
  Response.json(body, { status, headers: { ...CORS, "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/public/send-quote-email")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const url = process.env["SUPABASE_URL"];
        const anon = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const lovableKey = process.env["LOVABLE_API_KEY"];
        const resendKey = process.env["RESEND_API_KEY"];
        const missing = [
          !url && "SUPABASE_URL", !anon && "SUPABASE_PUBLISHABLE_KEY",
          !lovableKey && "LOVABLE_API_KEY", !resendKey && "RESEND_API_KEY",
        ].filter(Boolean);
        if (missing.length) return reply({ sent: false, status: 500, error: `Server is missing: ${missing.join(", ")}` }, 500);

        // Verify the signed-in contractor; reply-to comes from the verified account only.
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
        if (!token) return reply({ sent: false, status: 401, error: "Please sign in again to send email (no session token)." }, 401);
        const supabase = createClient(url!, anon!, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data: userData, error: authError } = await supabase.auth.getUser(token);
        if (authError || !userData.user) {
          return reply({ sent: false, status: 401, error: `Session check failed: ${authError?.message ?? "no user"}` }, 401);
        }

        let body: unknown;
        try { body = await request.json(); } catch { return reply({ sent: false, status: 400, error: "Request body is not valid JSON." }, 400); }
        const parsed = payloadSchema.safeParse(body);
        if (!parsed.success) {
          const issue = parsed.error.issues[0];
          return reply({ sent: false, status: 400, error: `Invalid ${issue?.path.join(".") || "input"}: ${issue?.message ?? "check the quote fields"}` }, 400);
        }

        try {
          const response = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lovableKey}`,
              "X-Connection-Api-Key": resendKey!,
            },
            body: JSON.stringify(buildResendPayload(parsed.data, userData.user.email)),
          });
          const result = await readResendResult(response);
          return reply(result, result.sent ? 200 : 502);
        } catch (error) {
          console.error("Resend request threw:", error);
          return reply({ sent: false, status: 502, error: `Could not reach email service: ${emailErrorMessage(error)}` }, 502);
        }
      },
    },
  },
});
