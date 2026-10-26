import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isNativeIOS, checkRevenueCatAccess, purchaseRevenueCatAccess, subscribeRevenueCatAccess } from "@/lib/revenuecat";
import { markOnboardingSeen, shouldShowOnboarding } from "@/lib/account-access";
import { readDeviceText } from "@/lib/device-storage";

type Access = { owner: string | null; completed: boolean; pro: boolean; error: string | null };

export function useAccountAccess(userId: string | undefined) {
  const [state, setState] = useState<Access>({ owner: null, completed: false, pro: false, error: null });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!userId) { setState({ owner: null, completed: false, pro: false, error: null }); return; }
    let alive = true;
    let unsubscribe: (() => void) | undefined;
    setState({ owner: null, completed: false, pro: false, error: null });
    void (async () => {
      const results = await Promise.allSettled([
        supabase.from("user_profiles").select("has_completed_onboarding").eq("user_id", userId).maybeSingle().then(({ data, error }) => {
          if (error) throw new Error("Couldn't check your onboarding status. Check your connection and try again.");
          return data?.has_completed_onboarding === true;
        }),
        checkRevenueCatAccess(userId),
      ]);
      if (!alive) return;
      const completed = results[0].status === "fulfilled" && results[0].value;
      const pro = results[1].status === "fulfilled" && results[1].value;
      const failed = results.find((r) => r.status === "rejected");
      if (completed) markOnboardingSeen();
      setState({ owner: userId, completed, pro, error: !completed && !pro && failed ? "Couldn't verify your account or subscription. Please try again before continuing." : null });
      try {
        const stop = await subscribeRevenueCatAccess(userId, (active) => {
          if (alive) setState((s) => ({ ...s, pro: active, error: active ? null : s.error }));
        });
        if (alive) unsubscribe = stop; else stop();
      } catch { /* The verified initial result remains; foreground checks retry. */ }
    })();
    const refresh = () => {
      if (document.visibilityState === "visible") setRetry((n) => n + 1);
    };
    document.addEventListener("visibilitychange", refresh);
    return () => { alive = false; unsubscribe?.(); document.removeEventListener("visibilitychange", refresh); };
  }, [userId, retry]);

  const complete = useCallback(async (plan: "monthly" | "annual") => {
    if (!userId) throw new Error("Sign in before continuing.");
    const active = await purchaseRevenueCatAccess(userId, plan);
    if (!active) throw new Error("An active subscription is required to continue.");
    const trade = readDeviceText("instaquote:trade");
    const { error } = await supabase.from("user_profiles").upsert({ user_id: userId, has_completed_onboarding: true, ...(trade ? { trade } : {}) }, { onConflict: "user_id" });
    if (error) throw new Error("Couldn't save your onboarding progress. Please try again.");
    markOnboardingSeen();
    setState((s) => s.owner === userId ? { ...s, completed: true } : s);
  }, [userId]);

  const restore = useCallback(async () => {
    if (!userId) throw new Error("Sign in before restoring purchases.");
    const pro = await checkRevenueCatAccess(userId, true);
    setState((s) => s.owner === userId ? { ...s, pro, error: pro ? null : s.error } : s);
    return pro;
  }, [userId]);

  return { loading: Boolean(userId && state.owner !== userId), error: state.error, proAccess: state.owner === userId && state.pro,
    showOnboarding: state.owner === userId && shouldShowOnboarding(state.completed, state.pro, typeof window !== "undefined" && isNativeIOS()), complete, restore,
    retry: () => setRetry((n) => n + 1) };
}