import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://toukatsu-yumeguri.sakuspace.workers.dev",
  output: "static",
  cacheDir: ".astro-cache",
  integrations: [sitemap()],
  prefetch: {
    prefetchAll: false,
  },
});
