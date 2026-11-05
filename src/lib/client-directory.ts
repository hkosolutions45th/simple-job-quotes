type ClientIdentity = { id: string; name: string; email: string };

/** Selected identity wins over editable contact fields; blank emails never match. */
export function findDirectoryClient<T extends ClientIdentity>(
  clients: T[], selectedId: string | null, customer: { name: string; email: string },
): T | undefined {
  const email = customer.email.trim().toLowerCase();
  const name = customer.name.trim().toLowerCase();
  return clients.find((c) => c.id === selectedId)
    ?? (email ? clients.find((c) => c.email.trim().toLowerCase() === email) : undefined)
    ?? (name ? clients.find((c) => c.name.trim().toLowerCase() === name) : undefined);
}