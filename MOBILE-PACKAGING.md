# InstaQuote Pro mobile packaging preparation

The root `capacitor.config.json` contains the requested app identity and `dist` web directory. This is configuration preparation, not a signed App Store or Google Play release.

## Remaining native release work

- The extensionless Apple association file is at `public/.well-known/apple-app-site-association`, with JSON content-type configured for preview and hosting. It uses the real Apple application identifier `L8TQ75YMT5.app.lovable.simplejobquotes` (Team ID `L8TQ75YMT5` plus the signed bundle ID `app.lovable.simplejobquotes`, matching the Capacitor `appId`). If the signed bundle ID ever changes, update the association file, its test, and `capacitor.config.json` together.
- In the signed iOS target, enable Associated Domains and add `applinks:simple-job-quotes.lovable.app` and `webcredentials:simple-job-quotes.lovable.app`. Publish the association file, confirm a public HTTPS 200 response with `Content-Type: application/json` and no redirect, then verify autofill and links on an iPhone; Apple caches association files.
- Auth already explicitly enables `persistSession: true` and `autoRefreshToken: true`. The generated storage adapter uses persistent localStorage outside the editor preview, including the Capacitor origin; preserve this setup. Verify a signed-in app survives a force-close/relaunch on the same native origin. Clearing app data, uninstalling, or revoked sessions still requires sign-in.

- Install Capacitor tooling and create the iOS and Android projects on an appropriate native development machine.
- Prepare and inspect a static web shell containing `dist/index.html`. The current TanStack Start output also needs its hosted server; copying the SSR bundle into a native app is insufficient.
- Configure native-to-hosted-server requests, authentication redirects, microphone permission declarations, signing, app icons and native launch screens. Keep server secrets on the hosted server.
- Test voice recognition, safe areas, PDF sharing, authentication, and storage persistence on real iOS and Android devices before store submission.
- After installing the Browser plugin, sync/rebuild the native project. Register the `instaquote` URL scheme in Xcode (URL Types); the hosted auth allow-list already includes `instaquote://**`. Google/Apple open the published `/~oauth/initiate` in Capacitor Browser and return to `instaquote://auth-callback`.
- Keychain hints are present on standard submit forms. Native password saving/autofill still depends on iOS/WKWebView and the packaged app's Associated Domains/webcredentials setup; verify on a signed iPhone build rather than assuming HTML hints alone guarantee a prompt.
- Native deletion calls the published `/api/public/delete-account`; publish the server changes before testing the rebuilt app.
- Build and sign native packages using Xcode/Android Studio, then complete each store's listing and review requirements.

The in-app branded startup screen is separate from the native launch screen. Device settings and account-scoped quote caches use persistent local storage; uninstalling the app, clearing site data, or blocked/full storage can remove or prevent device persistence. Cloud-saved quotes remain available after sign-in. Quote cache storage does not add offline editing or offline saving.