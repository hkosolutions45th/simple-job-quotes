import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { removeOwnAccount } from "@/lib/delete-account";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};
const reply = (body: { deleted: boolean; error?: string }, status = 200) =>
  Response.json(body, { status, headers: { ...CORS, "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/public/delete-account")({
  server: { handlers: {
    OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
    POST: async ({ request }) => {
      const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
      if (!token) return reply({ deleted: false, error: "Please sign in again to delete your account." }, 401);
      const url = process.env["SUPABASE_URL"];
      const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
      if (!url || !key) return reply({ deleted: false, error: "Account deletion is temporarily unavailable." }, 503);
      try {
        const auth = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data, error } = await auth.auth.getUser(token);
        if (error || !data.user) return reply({ deleted: false, error: "Your session expired. Sign in again to delete your account." }, 401);
        // No user ID is accepted from input. Load privilege only after verification.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const result = await removeOwnAccount(data.user.id, {
          clearData: async (id) => supabaseAdmin.rpc("delete_account_data", { target_user_id: id }),
          deleteAuth: async (id) => supabaseAdmin.auth.admin.deleteUser(id),
        });
        return reply(result, result.deleted ? 200 : 500);
      } catch {
        console.error("Account deletion request failed");
        return reply({ deleted: false, error: "Couldn't delete your account. Please try again." }, 500);
      }
    },
  } },
});