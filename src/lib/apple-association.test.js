import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import nitroConfig from "../../nitro.config";

test("Apple links and web credentials use the same requested application identifier", async () => {
  const association = JSON.parse(await readFile(new URL("../../public/.well-known/apple-app-site-association", import.meta.url), "utf8"));
  expect(association.applinks.apps).toEqual([]);
  expect(association.applinks.details).toEqual([{ appID: "L8TQ75YMT5.app.lovable.simplejobquotes", paths: ["*"] }]);
  expect(association.webcredentials.apps).toEqual(["L8TQ75YMT5.app.lovable.simplejobquotes"]);
});

test("the extensionless Apple association is served as JSON in production", () => {
  expect(nitroConfig.routeRules?.["/.well-known/apple-app-site-association"]?.headers?.["Content-Type"]).toBe("application/json");
});