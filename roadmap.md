# Roadmap
- [ ] Polish header, confirm-password signup, Apple sign-in, and signup return behavior
- [ ] Show first-visit onboarding before signup and fit sticky iPhone actions
- [ ] Activate native RevenueCat purchases without payment bypass
- [ ] Add editable amounts, province, postal formatting, and synchronized document addresses
- [ ] Prevent email autofocus and embed PDF logos; verify flows
- [x] Verify connected Resend sending (real 200 response), clear failure messages, and automatic Mail composer fallback (browser launch verified; native Mail requires iPhone testing)
- [x] Persist account onboarding and check native pro_access before showing paywalls
- [x] Add restore purchases, subscription disclosures, and requested external legal links
- [x] Add confirmed self-account deletion and clear device data
- [x] Verify real temporary-account onboarding, fresh-device completion, deletion, and simulated native entitlement/restore flows (18 tests pass)
- [ ] Verify actual Apple purchase restoration on a packaged iPhone app — requires native iOS device and configured App Store/RevenueCat products
- [x] Finalize branded direct quote email, contractor reply routing, and verify provider responses (real signed-in email send accepted with 200; 12 tests pass)
- [x] Email always attempts real send via direct endpoint (reachable from iOS app), exact error toasts, no auto Mail fallback, restyled HTML email

- [x] Add mobile safe-area spacing and branded startup loading
- [x] Duplicate saved quotes with fresh numbers and blank client details
- [x] Harden device storage restoration and quote caching
- [x] Add requested Capacitor configuration and document release limitations
- [x] Verify duplication rules, restart persistence, and mobile layout

- [x] Enable Lovable Cloud
- [x] Create `quotes` and `user_profiles` tables with RLS + grants
- [x] Email + Google sign-in, sign-in page, account strip
- [x] Save quotes to the cloud, saved-quotes list, load back into editor
- [x] Verified end-to-end in preview (sign up, save, list, reload)
- [x] Add structured city and postal/ZIP fields throughout quote creation and delivery
- [x] Keep line-item descriptions currency-neutral; scope summaries removed as requested
- [x] Relabel and restyle bottom action bar: Save Quote, View PDF, Email PDF, Send
- [x] Add Privacy Policy and Terms of Service pages with back-to-settings navigation

- [x] Pre-select annual plan, add trial subtext, and save onboarding trade into Business Settings
