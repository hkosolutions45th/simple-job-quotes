import { test } from "node:test";
import assert from "node:assert/strict";
import { hasProAccess, shouldShowOnboarding } from "./account-access";
import { removeOwnAccount } from "./delete-account";
import { clearAllDeviceStorage, readDeviceText, writeDeviceText } from "./device-storage";

test("completed onboarding skips onboarding without a subscription", () => {
  assert.equal(shouldShowOnboarding(true, false), false);
});
test("active pro_access skips onboarding and blocks repeat paywall prompts", () => {
  const pro = hasProAccess({ entitlements: { active: { pro_access: { isActive: true } } } });
  assert.equal(pro, true);
  assert.equal(shouldShowOnboarding(false, pro), false);
});
test("new accounts without active pro_access must complete onboarding", () => {
  assert.equal(shouldShowOnboarding(false, false), true);
  assert.equal(hasProAccess({ entitlements: { active: { other: { isActive: true }, pro_access: { isActive: false } } } }), false);
});
test("deletion removes only the verified account and clears its data before auth", async () => {
  const calls: string[] = [];
  const result = await removeOwnAccount("verified-user", {
    clearData: async (id) => { calls.push(`data:${id}`); return { error: null }; },
    deleteAuth: async (id) => { calls.push(`auth:${id}`); return { error: null }; },
  });
  assert.deepEqual(calls, ["data:verified-user", "auth:verified-user"]);
  assert.equal(result.deleted, true);
});
test("failed data deletion cannot report a deleted account", async () => {
  let deleted = false;
  const result = await removeOwnAccount("verified-user", {
    clearData: async () => ({ error: { message: "failure" } }),
    deleteAuth: async () => { deleted = true; return { error: null }; },
  });
  assert.equal(result.deleted, false);
  assert.equal(deleted, false);
});
test("account deletion clears persistent storage and in-memory fallback", () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    clear: () => values.clear(),
  } });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { clear: () => undefined } });
  writeDeviceText("instaquote:clients", "private client");
  assert.equal(clearAllDeviceStorage(), true);
  assert.equal(values.size, 0);
  assert.equal(readDeviceText("instaquote:clients"), null);
});