import type { User } from "@supabase/supabase-js";

type PasswordUser = Pick<User, "id" | "email" | "identities">;
type AuthResult = { error: { message: string } | null };
type PasswordAuth = {
  signInWithPassword: (credentials: { email: string; password: string }) => Promise<AuthResult & { data: { user: { id: string } | null } }>;
  updateUser: (attributes: { password: string; current_password?: string }) => Promise<AuthResult>;
};

export function hasPasswordIdentity(user: Pick<User, "identities">): boolean {
  return user.identities?.some((identity) => identity.provider === "email") ?? false;
}

/** Keep reauthentication and the backend's current-password check together. */
export async function updateAccountPassword(auth: PasswordAuth, user: PasswordUser, currentPassword: string, password: string, confirmation: string): Promise<void> {
  if (password !== confirmation) throw new Error("Passwords do not match.");
  if (password.length < 6) throw new Error("New password must be at least 6 characters.");
  if (!user.email) throw new Error("Your account needs an email address before you can set a password.");
  const requiresCurrentPassword = hasPasswordIdentity(user);
  if (requiresCurrentPassword) {
    if (!currentPassword) throw new Error("Enter your current password, or use the reset link below.");
    const { data, error } = await auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (error) throw new Error("Couldn't verify your current password. Try again, or reset your password.");
    if (data.user?.id !== user.id) throw new Error("Your account has changed. Reopen Account Settings and try again.");
  }
  const { error } = await auth.updateUser({ password, ...(requiresCurrentPassword ? { current_password: currentPassword } : {}) });
  if (error) throw new Error(error.message);
}