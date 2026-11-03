import { beforeEach, mock, test } from "bun:test";
import assert from "node:assert/strict";

const calls = [];
let sessionEmail = "old@example.com";
let failRefresh = false;
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
const { consumeAuthLink } = await import("./auth-deep-link");
beforeEach(() => { calls.length = 0; sessionEmail = "old@example.com"; failRefresh = false; });

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