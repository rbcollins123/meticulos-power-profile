import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const repoName = "meticulos-power-profile";

export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  base: mode === "production" ? `/${repoName}/` : "/",
}));
