# Remove Scope of Work

## Changes
- Remove `scopeSummary` from the AI result schema, parser instructions, and client-side quote state.
- Remove the Scope of Work block from the printable quote so line items follow the client/job header directly.
- Remove scope content from the email request and email template.
- Stop saving scope data in new quote records; silently ignore the old field when opening existing saved quotes.
- Remove the superseded scope synchronization architecture rules.

## Verification
- Confirm generated quote data contains items and client details without scope.
- Preview and print a quote to verify the header flows directly into the line-item table.
- Confirm the email template has no scope section.
- Check mobile layout and build diagnostics.
