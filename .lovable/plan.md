# Restore PDF Scope and Clean Item Descriptions

## What will change
- Keep the **SCOPE OF WORK** block visible in the quote preview and printed PDF, positioned after client/job details and before line items.
- Render the generated `scopeSummary` in that block, with a restrained fallback for older quotes that do not yet contain a summary.
- Strengthen the shared line-item description cleaner to remove parenthesized or bracketed currency annotations such as `(estimated CAD)`, `(CAD)`, and `(USD)`.
- Apply the same cleanup consistently to AI-generated, fallback-generated, manually edited, saved, reopened, previewed, and emailed line items.

## Verification
- Generate or prepare a quote with a scope summary and currency-tagged descriptions.
- Confirm the preview and print layout show the scope block in the correct position.
- Confirm descriptions remain clean after generation, editing, saving/reopening paths, and currency changes.
- Check the narrow mobile preview and current build diagnostics for clipping or errors.

## Technical details
- Use one shared sanitization helper as the client-side source of truth, while preserving server-side output validation.
- Keep currency amounts and conversion behavior unchanged; only description text and PDF scope presentation are affected.
