/** Clone quote content, never its identity, status, or client contact information. */
export function duplicateQuoteRecord(row: any, quoteNo: string, userId: string) {
  const payload = structuredClone(row.line_items ?? {});
  return {
    user_id: userId,
    client_name: null,
    client_email: null,
    status: "draft",
    total_amount: row.total_amount,
    currency: row.currency ?? payload.currency ?? "USD",
    line_items: {
      ...payload,
      quoteNo,
      notes: "",
      customer: {
        name: "", email: "", phone: "", address: "", city: "", province: "", postalCode: "",
        terms: payload.customer?.terms ?? "",
      },
    },
  };
}