import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "https://docs.github.com/articles/configuring-a-publishing-source-for-github-pages/",   // 🔥 Required for GitHub Pages
});
