import { beforeEach, mock, test, expect } from "bun:test";

let native = false;
const opened = [];
const webCalls = [];
mock.module("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => native } }));
mock.module("@capacitor/browser", () => ({ Browser: { open: async (options) => opened.push(options), close: async () => {} } }));
mock.module("@/integrations/lovable", () => ({ lovable: { auth: { signInWithOAuth: async (...args) => { webCalls.push(args); return { error: null }; } } } }));
mock.module("./auth-deep-link", () => ({ APP_AUTH_CALLBACK: "instaquote://auth-callback" }));
const { signInWithProvider } = await import("./native-oauth");
beforeEach(() => {
  native = false; opened.length = 0; webCalls.length = 0;
  globalThis.window = { location: { origin: "https://example.test" } };
});
for (const provider of ["google", "apple"]) {
  test(`native ${provider} opens the published broker and returns to the app, never localhost`, async () => {
    native = true;
    await signInWithProvider(provider);
    const url = new URL(opened[0].url);
    expect(url.origin).toBe("https://simple-job-quotes.lovable.app");
    expect(url.pathname).toBe("/~oauth/initiate");
    expect(url.searchParams.get("redirect_uri")).toBe("instaquote://auth-callback");
    expect(url.searchParams.get("provider")).toBe(provider);
    expect(url.searchParams.get("state").length).toBeGreaterThan(20);
    expect(webCalls.length).toBe(0);
  });
}
test("web OAuth continues through the managed preview-safe helper", async () => {
  await signInWithProvider("google");
  expect(webCalls).toEqual([["google", { redirect_uri: "https://example.test" }]]);
  expect(opened.length).toBe(0);
});