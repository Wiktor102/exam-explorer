import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import { developmentResourceDownloads } from "./scripts/development-resources";
import { SITE_URL } from "./src/lib/site";
export default defineConfig({
  site: SITE_URL,
  output: "static",
  trailingSlash: "always",
  integrations: [react()],
  vite: { plugins: [developmentResourceDownloads()] },
});
