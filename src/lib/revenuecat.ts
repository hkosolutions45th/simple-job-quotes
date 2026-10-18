/**
 * RevenueCat setup for the native iOS build.
 *
 * The SDK is loaded lazily and only on native iOS so the web app and SSR
 * bundle never touch it. Configuration runs once per app launch.
 */

import { hasProAccess } from "./account-access";

const REVENUCAT_IOS_API_KEY = "appl_dKfkGDGahfIpbRXKSnjnLcdMupr";
let setup: Promise<void> | undefined;
let owner: string | null = null;
let queue: Promise<unknown> = Promise.resolve();

function isNativeIOS(): boolean {
  try {
    const cap = (window as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
    return cap?.getPlatform?.() === "ios";
  } catch {
    return false;
  }
}

/** Configure RevenueCat on app launch when running as a native iOS app. */
export async function initRevenueCat(): Promise<void> {
  if (typeof window === "undefined" || !isNativeIOS()) return;
  if (!setup) {
    setup = import("@revenuecat/purchases-capacitor")
      .then(({ Purchases }) => Purchases.configure({ apiKey: REVENUCAT_IOS_API_KEY }))
      .catch((error) => { setup = undefined; throw error; });
  }
  await setup;
}

function serialized<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(work);
  queue = result.catch(() => undefined);
  return result;
}

/** Identify before every read/restore; never reuse another account's entitlement. */
export function checkRevenueCatAccess(userId: string, restore = false): Promise<boolean> {
  return serialized(async () => {
    if (typeof window === "undefined" || !isNativeIOS()) {
      if (restore) throw new Error("Restore Purchases is available in the InstaQuote iPhone app. Use the Apple ID that purchased your subscription.");
      return false;
    }
    await initRevenueCat();
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    if (owner !== userId) {
      await Purchases.logIn({ appUserID: userId });
      owner = userId;
    }
    const { customerInfo } = restore ? await Purchases.restorePurchases() : await Purchases.getCustomerInfo();
    return hasProAccess(customerInfo);
  });
}

export function clearRevenueCatIdentity(): Promise<void> {
  return serialized(async () => {
    if (!owner || typeof window === "undefined" || !isNativeIOS()) return;
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    await Purchases.logOut();
    owner = null;
  });
}

export async function subscribeRevenueCatAccess(userId: string, update: (active: boolean) => void): Promise<() => void> {
  if (typeof window === "undefined" || !isNativeIOS()) return () => undefined;
  await initRevenueCat();
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const id = await Purchases.addCustomerInfoUpdateListener((info) => {
    if (owner === userId) update(hasProAccess(info));
  });
  return () => { void Purchases.removeCustomerInfoUpdateListener({ listenerToRemove: id }); };
}
