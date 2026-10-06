# Fix PDF Header, Scope, and Item Text

## Changes
- Rebuild the quote document header as a stable two-column grid containing business/client details on the left and quote/job/payment details on the right.
- Keep that header and the Scope of Work block above the line-item table at preview and print sizes.
- Show the generated scope summary directly in the PDF and printable email, removing the generic scope sentence.
- Pass `scopeSummary` into the email send action and validate it with the rest of the quote.
- Clean currency annotations from every item description again at PDF and email rendering time.
- Use fixed, wrapping table columns and non-wrapping money values so totals and currency symbols stay aligned without horizontal clipping.

## Verification
- Generate a quote containing a real scope summary and currency-labelled item descriptions.
- Inspect the narrow preview and rendered Letter PDF for header, table, scope, and total alignment.
- Confirm the email content path receives the same scope and cleaned descriptions.
- Check current diagnostics for errors.
