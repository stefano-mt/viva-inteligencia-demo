import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const REPOSITORY_DIR = path.resolve(__dirname, "..", "..");
const DOMAIN_DIR = path.join(REPOSITORY_DIR, "packages", "domain");
const GENERATED_DATA_DIR = path.join(REPOSITORY_DIR, "data", "generated");
const PORT = Number(process.env.PORT ?? 4173);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const servesDomain = pathname.startsWith("/packages/domain/");
    const servesGeneratedData = pathname.startsWith("/demo-data/");
    const rootDirectory = servesDomain ? REPOSITORY_DIR : servesGeneratedData ? GENERATED_DATA_DIR : PUBLIC_DIR;
    const requestedPath = servesGeneratedData
      ? pathname.replace(/^\/demo-data\//u, "")
      : pathname.replace(/^\/+/, "");
    const filePath = path.resolve(rootDirectory, requestedPath);
    const allowedDirectory = servesDomain ? DOMAIN_DIR : servesGeneratedData ? GENERATED_DATA_DIR : PUBLIC_DIR;
    const relativePath = path.relative(allowedDirectory, filePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    }

    const data = await fs.readFile(filePath);
    const type = contentTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
    return send(res, 200, data, type);
  } catch (error) {
    if (error.code === "ENOENT") return send(res, 404, "Not found", "text/plain; charset=utf-8");
    return send(res, 500, error.message, "text/plain; charset=utf-8");
  }
});

server.listen(PORT, () => {
  console.log(`Prototipo Viva disponible en http://localhost:${PORT}`);
});

function send(res, status, body, contentType) {
  res.writeHead(status, { "content-type": contentType });
  res.end(body);
}
