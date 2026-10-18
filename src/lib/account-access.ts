import { writeDeviceText } from "./device-storage";

/** Onboarding completion is not proof of a paid entitlement. */
export function shouldShowOnboarding(completed: boolean, proAccess: boolean): boolean {
  return !completed && !proAccess;
}

/** Device marker written once the onboarding/paywall step is completed, so a
 * returning device never re-renders the carousel while the account is checked. */
export const ONBOARDING_SEEN_KEY = "has_seen_onboarding";
export function markOnboardingSeen(): boolean {
  return writeDeviceText(ONBOARDING_SEEN_KEY, "true");
}

export function hasProAccess(info: { entitlements: { active: Record<string, { isActive: boolean }> } }): boolean {
  return info.entitlements.active["pro_access"]?.isActive === true;
}