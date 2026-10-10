<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Treat the AI quote result as one structured object containing synchronized line items and client details; scope summaries are intentionally excluded.
- Access device storage through the browser-safe storage helpers from effects or event handlers; defer persistence until restoration finishes to avoid overwriting saved state during hydration.
- Keep saved-quote device caches scoped to the signed-in user, with Cloud as the authoritative store, so history survives restarts without exposing another user's records.
- Clone quotes through the shared duplication helper before inserting a new Cloud record, so identity and private client data never carry into duplicates.
- Treat the Capacitor root configuration as packaging preparation only; preserve the TanStack Start server runtime and do not assume its output is a standalone native web bundle.
