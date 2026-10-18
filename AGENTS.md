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
- Saved clients and business profile sync to the signed-in user's account (Cloud authoritative on load) with device storage as offline cache — so data follows the user across domains and devices.
- Long-form legal/policy pages render through the shared legal document shell and their back control deep-links to the dashboard with a settings query flag that opens Business Settings once the account profile has loaded; keep that flag's search validation on the index route so the return path works from any entry point.

- RevenueCat: `src/lib/revenuecat.ts` owns Purchases setup; it lazy-imports `@revenuecat/purchases-capacitor` and configures only when `Capacitor.getPlatform() === "ios"`, so the web/SSR bundle never loads the SDK. Call `initRevenueCat()` once at app launch; never statically import the SDK from a route.
- Quote emails use an authenticated server function and shared payload/response helpers; derive reply routing from verified session claims and return provider failures as data so production error sanitization does not hide them.
