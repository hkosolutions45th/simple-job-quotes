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
- Account access uses a Cloud profile completion flag and serialized RevenueCat identity checks before rendering onboarding; entitlement state is account-scoped and never inferred from device completion caches, preventing cross-account access and repeat paywalls.
- Self-account deletion revalidates the authenticated caller before lazily loading the privileged client, clears owned rows through a service-only SQL function, then deletes that caller's auth account; never accept a target user ID from the browser.
- Quote emails go through the plain HTTP route `/api/public/send-quote-email` (bearer token verified in the handler, CORS enabled) using shared payload/response helpers; the browser calls it via an absolute published URL on native so the iOS app can reach it, and every failure returns readable JSON instead of a sanitized RPC error. Reply routing comes from the verified user only.
