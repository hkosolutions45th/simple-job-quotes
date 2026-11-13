import { defineNitroConfig } from "nitro/config";

export default defineNitroConfig({
  routeRules: {
    "/.well-known/apple-app-site-association": {
      headers: { "Content-Type": "application/json" },
    },
  },
});