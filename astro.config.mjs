import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://toukatsu-yumeguri.sakuspace.workers.dev",
  output: "static",
  cacheDir: ".astro-cache",
  integrations: [sitemap()],
  prefetch: {
    prefetchAll: false,
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Zen Kaku Gothic New",
      cssVariable: "--font-sans",
      weights: [500, 700, 900],
      styles: ["normal"],
      subsets: ["latin", "japanese"],
      fallbacks: ["sans-serif"],
    },
  ],
});
