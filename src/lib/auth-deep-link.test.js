import { beforeEach, mock, test } from "bun:test";
import assert from "node:assert/strict";

const calls = [];
let sessionEmail = "old@example.com";
let failRefresh = false;
let native = false;
let appUrlHandler;
mock.module("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => native, getPlatform: () => native ? "ios" : "web" } }));
mock.module("@capacitor/app", () => ({ App: {
  addListener: async (_event, handler) => { appUrlHandler = handler; return { remove: async () => {} }; },
  getLaunchUrl: async () => undefined,
} }));
mock.module("@capacitor/browser", () => ({ Browser: { close: () => { calls.push("close"); return new Promise(() => {}); } } }));
mock.module("@/integrations/supabase/client", () => ({ supabase: { auth: {
  exchangeCodeForSession: async () => { calls.push("exchange"); return { error: null }; },
  setSession: async () => { calls.push("set"); return { error: null }; },
  getUser: async () => { calls.push("getUser"); return { data: { user: { email: "new@example.com" } }, error: null }; },
  refreshSession: async () => {
    calls.push("refreshSession");
    if (failRefresh) return { data: { session: null }, error: new Error("Refresh failed") };
    sessionEmail = "new@example.com";
    return { data: { session: { user: { email: sessionEmail } } }, error: null };
  },
} } }));
const { consumeAuthLink, listenForAuthDeepLinks } = await import("./auth-deep-link");
beforeEach(() => { calls.length = 0; sessionEmail = "old@example.com"; failRefresh = false; native = false; });

test("PKCE confirmation refetches the user then refreshes the local session email", async () => {
  assert.equal(await consumeAuthLink("instaquote://auth-callback?code=confirmation"), true);
  assert.deepEqual(calls, ["exchange", "getUser", "refreshSession"]);
  assert.equal(sessionEmail, "new@example.com");
});
test("token confirmation refetches the user and refreshes the session", async () => {
  assert.equal(await consumeAuthLink("instaquote://auth-callback#access_token=test&refresh_token=test"), true);
  assert.deepEqual(calls, ["set", "getUser", "refreshSession"]);
});
test("token-free email confirmation still refreshes the signed-in account", async () => {
  assert.equal(await consumeAuthLink("instaquote://auth-callback?type=email_change"), true);
  assert.deepEqual(calls, ["getUser", "refreshSession"]);
});
test("failed refresh cannot report successful account synchronization", async () => {
  failRefresh = true;
  await assert.rejects(consumeAuthLink("instaquote://auth-callback?code=confirmation"), /Refresh failed/);
});
test("confirmation errors never refresh or report success", async () => {
  await assert.rejects(consumeAuthLink("instaquote://auth-callback#error_description=Expired"), /Expired/);
  assert.deepEqual(calls, []);
});
test("native callback closes Browser immediately and exchanges session without waiting for close", async () => {
  native = true;
  globalThis.window = new EventTarget();
  let loadingFinished = false;
  window.addEventListener("instaquote:oauth-callback", () => { loadingFinished = true; });
  let signedIn = false;
  const cleanup = await listenForAuthDeepLinks(() => { signedIn = true; }, () => assert.fail("unexpected auth error"));
  appUrlHandler({ url: "instaquote://auth-callback?code=confirmation" });
  assert.equal(loadingFinished, true);
  assert.deepEqual(calls.slice(0, 2), ["close", "exchange"]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(signedIn, true);
  assert.deepEqual(calls, ["close", "exchange", "getUser", "refreshSession"]);
  cleanup(); delete globalThis.window;
});