import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://toukatsu-yumeguri.sakuspace.workers.dev",
  output: "static",
  prefetch: {
    prefetchAll: false,
  },
});
