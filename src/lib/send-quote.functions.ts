import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildResendPayload, emailErrorMessage, payloadSchema, readResendResult } from "./quote-email";

export const sendQuoteEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => payloadSchema.parse(data))
  .handler(async ({ data, context }) => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const resendKey = process.env["RESEND_API_KEY"];
    if (!lovableKey || !resendKey) {
      return { sent: false as const, status: 503, error: "Email is not configured yet: the email API credentials are missing." };
    }
    try {
      const response = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": resendKey,
        },
        body: JSON.stringify(buildResendPayload(data, context.claims.email)),
      });
      // Return provider errors as data so production RPC error sanitization
      // cannot replace the provider's exact explanation.
      return await readResendResult(response);
    } catch (error) {
      return { sent: false as const, status: 502, error: emailErrorMessage(error) };
    }
  });
