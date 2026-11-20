import { describe, expect, test } from "bun:test";
import type { User } from "@supabase/supabase-js";
import { hasPasswordIdentity, updateAccountPassword } from "./account-password";

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
  test("email identity requires verification and current_password even with Google linked", async () => {
    const { auth, calls } = client();
    await updateAccountPassword(auth, account(["google", "email"]), "old-password", "new-password", "new-password");
    expect(calls).toEqual([["verify", { email: "contractor@example.com", password: "old-password" }], ["update", { password: "new-password", current_password: "old-password" }]]);
  });
  for (const provider of ["google", "apple"]) {
    test(`${provider}-only accounts set a password without current-password verification`, async () => {
      const { auth, calls } = client();
      expect(hasPasswordIdentity(account([provider]))).toBe(false);
      await updateAccountPassword(auth, account([provider]), "", "new-password", "new-password");
      expect(calls).toEqual([["update", { password: "new-password" }]]);
    });
  }
  test("missing current password prevents an update", async () => {
    const { auth, calls } = client();
    await expect(updateAccountPassword(auth, account(["email"]), "", "new-password", "new-password")).rejects.toThrow("Enter your current password");
    expect(calls).toEqual([]);
  });
  test("incorrect current password prevents an update", async () => {
    const { auth, calls } = client(true);
    await expect(updateAccountPassword(auth, account(["email"]), "wrong-password", "new-password", "new-password")).rejects.toThrow("Couldn't verify");
    expect(calls).toHaveLength(1);
  });
  test("mismatched confirmation prevents any auth request", async () => {
    const { auth, calls } = client();
    await expect(updateAccountPassword(auth, account(["email"]), "old-password", "new-password", "different-password")).rejects.toThrow("Passwords do not match.");
    expect(calls).toEqual([]);
  });
});