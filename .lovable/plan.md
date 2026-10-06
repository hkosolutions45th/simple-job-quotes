# Clean Active Items and Guarantee Scope Text

## Changes
- Expand the shared item-title sanitizer to remove any parenthetical group containing a currency or measurement/unit note, including mixed notes such as `(linear feet; estimated CAD)`.
- Normalize the active line-item state so existing visible rows are cleaned immediately, while keeping ordinary descriptive parentheses intact.
- Strengthen the estimator instructions so generated item titles contain only the work/material name; quantities, units, prices, and currency metadata remain in their dedicated fields.
- Add a deterministic one-sentence fallback derived from job notes when the AI scope summary is empty.
- Remove contact details and job-location details from that fallback before it reaches PDF or email.
- Use the same resolved scope summary for preview, print, saved quote data, and email.

## Verification
- Check standalone and mixed currency/unit annotations are removed from active rows and output documents.
- Force or simulate an empty AI summary and confirm the Scope of Work contains a clean sentence rather than a dash.
- Verify generated scope remains preferred when present.
- Inspect the mobile preview and Letter PDF, then confirm current diagnostics are clean.
