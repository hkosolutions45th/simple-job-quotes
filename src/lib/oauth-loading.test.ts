import { test } from "node:test";
import assert from "node:assert/strict";
import { OAUTH_CALLBACK_EVENT, OAUTH_LOADING_TIMEOUT, watchOAuthLoading } from "./oauth-loading";

test("OAuth loading expires after 15 seconds without a callback or settled browser promise", { timeout: 20_000 }, async () => {
  assert.equal(OAUTH_LOADING_TIMEOUT, 15_000);
  let done = 0; let timeouts = 0;
  const target = new EventTarget();
  watchOAuthLoading(target, () => done++, () => timeouts++);
  await new Promise((resolve) => setTimeout(resolve, 14_800));
  assert.equal(done, 0);
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(done, 1); assert.equal(timeouts, 1);
  target.dispatchEvent(new Event(OAUTH_CALLBACK_EVENT));
  assert.equal(done, 1);
});
test("callback immediately finishes loading once, independently of redirect promises", () => {
  const target = new EventTarget(); let done = 0; let timeouts = 0;
  const cancel = watchOAuthLoading(target, () => done++, () => timeouts++);
  target.dispatchEvent(new Event(OAUTH_CALLBACK_EVENT)); cancel();
  assert.equal(done, 1); assert.equal(timeouts, 0);
});
test("browser cancellation and cleanup clear loading without a timeout warning", () => {
  let done = 0; let timeouts = 0;
  const cancel = watchOAuthLoading(new EventTarget(), () => done++, () => timeouts++);
  cancel(); cancel(); assert.equal(done, 1); assert.equal(timeouts, 0);
});