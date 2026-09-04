import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: appDirectory,
  publicDir: path.join(appDirectory, "public", "assets"),
  build: {
    outDir: path.join(appDirectory, "dist"),
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/health": "http://localhost:3000",
    },
  },
  preview: {
    proxy: {
      "/api": "http://localhost:3000",
      "/health": "http://localhost:3000",
    },
  },
});
