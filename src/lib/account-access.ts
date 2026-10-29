import { writeDeviceText } from "./device-storage";

/** Onboarding completion is not proof of a paid entitlement. */
/** On the iPhone app an active pro_access entitlement is always required, so a
 * lapsed subscription is sent back to the paywall. On the web (no App Store
 * check available) a completion flag — only ever written after a verified
 * purchase — is accepted. */
export function shouldShowOnboarding(completed: boolean, proAccess: boolean, nativeIOS = false): boolean {
  if (proAccess) return false;
  return nativeIOS ? true : !completed;
}

/** Device marker written once the onboarding/paywall step is completed, so a
 * returning device never re-renders the carousel while the account is checked. */
export const ONBOARDING_SEEN_KEY = "has_seen_onboarding";
export function markOnboardingSeen(): boolean {
  return writeDeviceText(ONBOARDING_SEEN_KEY, "true");
}

/** RevenueCat entitlement IDs that unlock the app (current first, legacy kept for existing subscribers). */
export const PRO_ENTITLEMENTS = ["instaquote_pro_premium", "pro_access"];
export function hasProAccess(info: { entitlements: { active: Record<string, { isActive: boolean }> } }): boolean {
  return PRO_ENTITLEMENTS.some((id) => info.entitlements.active[id]?.isActive === true);
}