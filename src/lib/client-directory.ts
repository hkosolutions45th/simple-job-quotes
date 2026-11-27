type ClientIdentity = { id: string; name: string; email: string };

type ClientDetails = ClientIdentity & {
  phone: string;
  address: string;
  city: string;
  province?: string;
  postalCode: string;
};

type CustomerDetails = Omit<ClientDetails, "id">;

const normalized = (value: string | undefined) => (value ?? "").trim().replace(/\s+/g, " ");
const normalizedPostal = (value: string | undefined) => normalized(value).toUpperCase();

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

/** Separate contact changes from job-location changes so the UI can explain both clearly. */
export function directoryClientChanges(saved: ClientDetails, current: CustomerDetails) {
  return {
    contact:
      normalized(saved.name) !== normalized(current.name)
      || normalized(saved.email).toLowerCase() !== normalized(current.email).toLowerCase()
      || normalized(saved.phone) !== normalized(current.phone),
    address:
      normalized(saved.address) !== normalized(current.address)
      || normalized(saved.city) !== normalized(current.city)
      || normalized(saved.province) !== normalized(current.province)
      || normalizedPostal(saved.postalCode) !== normalizedPostal(current.postalCode),
  };
}
