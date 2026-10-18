/** The caller supplies only the server-verified user ID, never an ID from form input. */
export async function removeOwnAccount(userId: string, operations: {
  clearData: (id: string) => Promise<{ error: { message: string } | null }>;
  deleteAuth: (id: string) => Promise<{ error: { message: string } | null }>;
}): Promise<{ deleted: boolean; error?: string }> {
  const cleanup = await operations.clearData(userId);
  if (cleanup.error) return { deleted: false, error: "Couldn't delete account data. Please try again." };
  const auth = await operations.deleteAuth(userId);
  if (auth.error) return { deleted: false, error: "Account data was removed, but account deletion could not finish. Please try again." };
  return { deleted: true };
}