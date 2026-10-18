/** Onboarding completion is not proof of a paid entitlement. */
export function shouldShowOnboarding(completed: boolean, proAccess: boolean): boolean {
  return !completed && !proAccess;
}

export function hasProAccess(info: { entitlements: { active: Record<string, { isActive: boolean }> } }): boolean {
  return info.entitlements.active["pro_access"]?.isActive === true;
}