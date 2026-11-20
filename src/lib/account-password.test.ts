import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { User } from "@supabase/supabase-js";
import { hasPasswordIdentity, requestPasswordReset, updateAccountPassword, updateRecoveryPassword } from "./account-password";

function account(providers: string[]) {
  return { id: "account-1", email: "contractor@example.com", identities: providers.map((provider) => ({ provider })) } as Pick<User, "id" | "email" | "identities">;
}
function client(failVerification = false) {
  const calls: unknown[] = [];
  return { calls, auth: {
    async signInWithPassword(credentials: { email: string; password: string }) {
      calls.push(["verify", credentials]);
      return { data: { user: { id: "account-1" } }, error: failVerification ? { message: "Invalid credentials" } : null };
    },
    async updateUser(attributes: { password: string; current_password?: string }) {
      calls.push(["update", attributes]); return { error: null };
    },
  } };
}
describe("account password rules", () => {
  test("recovery updates do not require the forgotten current password", async () => {
    const { auth, calls } = client();
    await updateRecoveryPassword(auth, "new-password", "new-password");
    assert.deepEqual(calls, [["update", { password: "new-password" }]]);
  });
  test("recovery rejects mismatched passwords without updating", async () => {
    const { auth, calls } = client();
    await assert.rejects(updateRecoveryPassword(auth, "new-password", "different-password"), /Passwords do not match/);
    assert.deepEqual(calls, []);
  });
  test("reset requests preserve the account email and recovery return address", async () => {
    const calls: unknown[] = [];
    await requestPasswordReset({ async resetPasswordForEmail(email, options) { calls.push([email, options]); return { error: null }; } }, " contractor@example.com ", "instaquote://auth-callback?type=recovery");
    assert.deepEqual(calls, [["contractor@example.com", { redirectTo: "instaquote://auth-callback?type=recovery" }]]);
  });
  test("failed reset requests cannot report success", async () => {
    await assert.rejects(requestPasswordReset({ async resetPasswordForEmail() { return { error: { message: "Email delivery failed" } }; } }, "contractor@example.com", "https://example.com/reset-password"), /Email delivery failed/);
  });
  test("email identity requires verification and current_password even with Google linked", async () => {
    const { auth, calls } = client();
    await updateAccountPassword(auth, account(["google", "email"]), "old-password", "new-password", "new-password");
    assert.deepEqual(calls, [["verify", { email: "contractor@example.com", password: "old-password" }], ["update", { password: "new-password", current_password: "old-password" }]]);
  });
  for (const provider of ["google", "apple"]) {
    test(`${provider}-only accounts set a password without current-password verification`, async () => {
      const { auth, calls } = client();
      assert.equal(hasPasswordIdentity(account([provider])), false);
      await updateAccountPassword(auth, account([provider]), "", "new-password", "new-password");
      assert.deepEqual(calls, [["update", { password: "new-password" }]]);
    });
  }
  test("missing current password prevents an update", async () => {
    const { auth, calls } = client();
    await assert.rejects(updateAccountPassword(auth, account(["email"]), "", "new-password", "new-password"), /Enter your current password/);
    assert.deepEqual(calls, []);
  });
  test("incorrect current password prevents an update", async () => {
    const { auth, calls } = client(true);
    await assert.rejects(updateAccountPassword(auth, account(["email"]), "wrong-password", "new-password", "new-password"), /Couldn't verify/);
    assert.equal(calls.length, 1);
  });
  test("mismatched confirmation prevents any auth request", async () => {
    const { auth, calls } = client();
    await assert.rejects(updateAccountPassword(auth, account(["email"]), "old-password", "new-password", "different-password"), /Passwords do not match/);
    assert.deepEqual(calls, []);
  });
});