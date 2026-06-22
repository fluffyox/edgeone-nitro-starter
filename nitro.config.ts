import { defineConfig } from "nitro";

export default defineConfig({
  compatibilityDate: "2025-12-01",
  serverDir: ".",
  rollupConfig: {
    external: ["@edgeone/pages-blob"],
  },
});
