import { supabase } from "@/integrations/supabase/client";
import { hostedAppOrigin } from "./hosted-app";

export async function deleteAccountRequest(): Promise<{ deleted: boolean; error?: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { deleted: false, error: "Please sign in again to delete your account." };
  try {
    const response = await fetch(`${hostedAppOrigin()}/api/public/delete-account`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    const result: unknown = await response.json().catch(() => null);
    if (result && typeof result === "object" && "deleted" in result) {
      if (response.ok && result.deleted === true) return { deleted: true };
      if ("error" in result && typeof result.error === "string") return { deleted: false, error: result.error };
    }
    return { deleted: false, error: "Account deletion is unavailable. Please try again shortly." };
  } catch {
    return { deleted: false, error: "Couldn't reach the account server. Check your connection and try again." };
  }
}