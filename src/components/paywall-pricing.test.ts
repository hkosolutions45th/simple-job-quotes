import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./OnboardingFlow.tsx", import.meta.url), "utf8");

test("paywall shows the App Store annual price of $89.99 everywhere", () => {
  // Plan card, trial subtext, and subscription disclosure all name $89.99.
  assert.equal(source.split("$89.99").length - 1 >= 3, true);
  // The old $89.00/year price is gone.
  assert.ok(!source.includes("$89.00/year"));
  // No bare "$89" remains once the $89.99 matches are removed.
  const withoutNewPrice = source.split("$89.99").join("");
  assert.ok(!/\$89(?!\d)/.test(withoutNewPrice));
});

test("paywall offers an escape to the sign-in screen", () => {
  assert.ok(source.includes("Already have an account? Sign in"));
  assert.ok(source.includes("onSignIn"));
});
