# InstaQuote Pro mobile packaging preparation

The root `capacitor.config.json` contains the requested app identity and `dist` web directory. This is configuration preparation, not a signed App Store or Google Play release.

## Remaining native release work

- Install Capacitor tooling and create the iOS and Android projects on an appropriate native development machine.
- Prepare and inspect a static web shell containing `dist/index.html`. The current TanStack Start output also needs its hosted server; copying the SSR bundle into a native app is insufficient.
- Configure native-to-hosted-server requests, authentication redirects, microphone permission declarations, signing, app icons and native launch screens. Keep server secrets on the hosted server.
- Test voice recognition, safe areas, PDF sharing, authentication, and storage persistence on real iOS and Android devices before store submission.
- Build and sign native packages using Xcode/Android Studio, then complete each store's listing and review requirements.

The in-app branded startup screen is separate from the native launch screen. Device settings and account-scoped quote caches use persistent local storage; uninstalling the app, clearing site data, or blocked/full storage can remove or prevent device persistence. Cloud-saved quotes remain available after sign-in. Quote cache storage does not add offline editing or offline saving.