/**
 * RevenueCat setup for the native iOS build.
 *
 * The SDK is loaded lazily and only on native iOS so the web app and SSR
 * bundle never touch it. Configuration runs once per app launch.
 */

const REVENUCAT_IOS_API_KEY = "appl_dKfkGDGahfIpbRXKSnjnLcdMupr";

let configured = false;

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
  if (configured || typeof window === "undefined" || !isNativeIOS()) return;
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    await Purchases.configure({ apiKey: REVENUCAT_IOS_API_KEY });
    configured = true;
  } catch (error) {
    console.error("RevenueCat configuration failed", error);
  }
}
