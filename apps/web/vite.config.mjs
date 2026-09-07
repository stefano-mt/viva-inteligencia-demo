import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: appDirectory,
  publicDir: false,
  plugins: [
    {
      name: "copy-approved-assets",
      configureServer(server) {
        const assetRoot = path.resolve(appDirectory, "public", "assets");
        server.middlewares.use("/assets", async (request, response, next) => {
          const relativePath = decodeURIComponent((request.url ?? "").split("?")[0]).replace(/^\/+/, "");
          const filePath = path.resolve(assetRoot, relativePath);
          if (!filePath.startsWith(`${assetRoot}${path.sep}`)) return next();
          try {
            const file = await stat(filePath);
            if (!file.isFile()) return next();
            const extension = path.extname(filePath).toLowerCase();
            response.setHeader("content-type", extension === ".webp" ? "image/webp" : extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "application/octet-stream");
            createReadStream(filePath).pipe(response);
          } catch {
            next();
          }
        });
      },
      async closeBundle() {
        const { cp } = await import("node:fs/promises");
        await cp(
          path.join(appDirectory, "public", "assets"),
          path.join(appDirectory, "dist", "assets"),
          { recursive: true },
        );
      },
    },
  ],
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
