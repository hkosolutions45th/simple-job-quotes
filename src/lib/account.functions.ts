import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { removeOwnAccount } from "./delete-account";

export const deleteOwnAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Revalidate against Auth so revoked/deleted sessions cannot repeat this operation.
    const { data, error } = await context.supabase.auth.getUser();
    if (error || !data.user || data.user.id !== context.userId) return { deleted: false, error: "Your session expired. Sign in again to delete your account." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return removeOwnAccount(context.userId, {
      clearData: async (id) => supabaseAdmin.rpc("delete_account_data", { target_user_id: id }),
      deleteAuth: async (id) => supabaseAdmin.auth.admin.deleteUser(id),
    });
  });