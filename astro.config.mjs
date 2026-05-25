import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  prefetch: {
    prefetchAll: false,
  },
});
