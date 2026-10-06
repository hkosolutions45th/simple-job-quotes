# Refine generated quote wording

## Goal
Generate a clean scope summary for the PDF and keep line-item descriptions independent of the selected currency.

## Changes
- Extend the AI quote response with a concise `scopeSummary` containing only the work to be performed.
- Instruct the parser to omit client contact details, job addresses, dictation commands, filler speech, prices, and currency labels from the summary.
- Normalize generated line-item descriptions so currency annotations such as “(estimated CAD)” are removed while preserving legitimate work descriptions.
- Store the generated scope summary with saved quotes, restore it when reopening a quote, and clear it for a new quote or fresh dictation.
- Pass `scopeSummary` to both the on-screen preview and print-only PDF, replacing raw notes under “Scope of work.”

## Verification
- Generate a quote from notes containing client details, an address, dictation phrases, and work instructions.
- Confirm the PDF scope is concise and contains only work details.
- Switch between USD and CAD and confirm descriptions remain currency-neutral while all monetary columns use the selected currency.
- Confirm saved quotes retain their generated scope summary after reopening.
