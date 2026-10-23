import { test, mock } from "bun:test";
import assert from "node:assert/strict";

const info = (active) => ({ entitlements: { active: active ? { pro_access: { isActive: true } } : {} } });
let active = false;
let cancelled = false;
let purchases = 0;
let selected = "";
mock.module("@revenuecat/purchases-capacitor", () => ({ Purchases: {
  configure: async () => undefined,
  logIn: async () => undefined,
  getCustomerInfo: async () => ({ customerInfo: info(active) }),
  getOfferings: async () => ({ current: { annual: { identifier: "annual" }, monthly: { identifier: "monthly" } } }),
  purchasePackage: async ({ aPackage }) => {
    purchases++; selected = aPackage.identifier;
    if (cancelled) throw { userCancelled: true };
    return { customerInfo: info(true) };
  },
} }));
const { purchaseRevenueCatAccess } = await import("./revenuecat.ts");
Object.defineProperty(globalThis, "window", { configurable: true, value: { Capacitor: { getPlatform: () => "ios" } } });

test("annual trial activation purchases the configured annual package", async () => {
  assert.equal(await purchaseRevenueCatAccess("account-one", "annual"), true);
  assert.equal(selected, "annual");
  assert.equal(purchases, 1);
});
test("active pro_access prevents a second purchase", async () => {
  active = true;
  assert.equal(await purchaseRevenueCatAccess("account-one", "annual"), true);
  assert.equal(purchases, 1);
  active = false;
});
test("cancelled purchase never grants account access", async () => {
  cancelled = true;
  await assert.rejects(purchaseRevenueCatAccess("account-two", "monthly"), /Purchase cancelled/);
  cancelled = false;
});
test("web cannot bypass Apple subscription activation", async () => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  await assert.rejects(purchaseRevenueCatAccess("account-two", "annual"), /iPhone app/);
});