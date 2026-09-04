import { spawn } from "node:child_process";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveAppUrl } from "./app-url.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(TEST_DIR, "..");
const REPOSITORY_DIR = path.resolve(PROJECT_DIR, "..", "..");
const PUBLIC_DIR = path.join(PROJECT_DIR, "public");
const DOMAIN_DIR = path.join(REPOSITORY_DIR, "packages", "domain");
const SERVER_FILE = path.join(PROJECT_DIR, "server-static.js");
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

export const routes = [
  { id: "dashboard", title: "Radar comercial" },
  { id: "projects", title: "Proyectos comparables" },
  { id: "inspector", title: "Inspector de evidencia" },
  { id: "market", title: "Benchmark distrital" },
  { id: "compare", title: "Comparador estratégico" },
  { id: "trust", title: "Checklist comercial" },
  { id: "assistant", title: "Asistente de estrategia" },
  { id: "activity", title: "Señales del mercado" },
];

export const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1280, height: 720 },
  { name: "mobile", width: 390, height: 844 },
];

export async function withDemoBrowser(run, options = {}) {
  const port = Number(options.port ?? process.env.TEST_PORT ?? 4177);
  const basePath = normalizeBasePath(options.basePath ?? process.env.TEST_BASE_PATH ?? "");
  const origin = `http://127.0.0.1:${port}`;
  const baseUrl = process.env.BASE_URL ?? `${origin}${basePath}`;
  const ownsServer = !process.env.BASE_URL;
  const server = !ownsServer
    ? null
    : basePath
      ? await startPagesStyleServer({ port, basePath })
      : spawn(process.execPath, [SERVER_FILE], {
        cwd: PROJECT_DIR,
        env: { ...process.env, PORT: String(port) },
        stdio: ["ignore", "pipe", "pipe"],
      });

  try {
    if (server?.stderr) await waitForServer(baseUrl, server);
    const executablePath = [
      process.env.PLAYWRIGHT_CHROME_PATH,
      chromium.executablePath(),
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ].find((candidate) => candidate && fs.existsSync(candidate));
    const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true });
    try {
      await run({ browser, baseUrl });
    } finally {
      await browser.close();
    }
  } finally {
    await stopServer(server);
  }
}

export async function createObservedPage(context, baseUrl) {
  const page = await context.newPage();
  const requests = [];
  page.on("request", (request) => {
    requests.push({
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
    });
  });
  return {
    page,
    problems: observePage(page),
    externalRequests: await guardSameOrigin(page, baseUrl),
    requests,
  };
}

export function observePage(page) {
  const problems = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => {
    problems.push(`requestfailed: ${request.method()} ${request.url()} (${request.failure()?.errorText ?? "unknown"})`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) problems.push(`http ${response.status()}: ${response.url()}`);
  });
  return problems;
}

export async function guardSameOrigin(page, baseUrl) {
  const externalRequests = [];
  const allowedBaseUrl = new URL(baseUrl);
  const allowedOrigin = allowedBaseUrl.origin;
  const allowedPath = allowedBaseUrl.pathname.endsWith("/")
    ? allowedBaseUrl.pathname
    : `${allowedBaseUrl.pathname}/`;

  await page.route("**/*", async (route) => {
    const request = route.request();
    let requestUrl;
    try {
      requestUrl = new URL(request.url());
    } catch {
      await route.continue();
      return;
    }

    if (
      (requestUrl.protocol === "http:" || requestUrl.protocol === "https:") &&
      (requestUrl.origin !== allowedOrigin ||
        (allowedPath !== "/" &&
          !requestUrl.pathname.startsWith(allowedPath) &&
          !requestUrl.pathname.startsWith("/packages/domain/")))
    ) {
      externalRequests.push(`${request.method()} ${request.url()}`);
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });

  return externalRequests;
}

export async function openRoute(page, baseUrl, routeId) {
  await openPath(page, baseUrl, `/#${routeId}`);
}

export async function openPath(page, baseUrl, relativeUrl) {
  await page.goto(resolveAppUrl(baseUrl, relativeUrl), {
    waitUntil: "networkidle",
  });
  await page.locator("#main-content").waitFor({ state: "visible" });
  await page.evaluate(() => document.fonts?.ready);
  await page.addStyleTag({
    content: "*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }",
  });
}

function normalizeBasePath(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "/") return "";
  return `/${raw.replace(/^\/+|\/+$/gu, "")}/`;
}

async function startPagesStyleServer({ port, basePath }) {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const baseWithoutSlash = basePath.slice(0, -1);
      if (url.pathname !== baseWithoutSlash && !url.pathname.startsWith(basePath)) {
        return send(response, 404, "Not found", "text/plain; charset=utf-8");
      }
      const relativePath =
        url.pathname === baseWithoutSlash || url.pathname === basePath
          ? "index.html"
          : url.pathname.slice(basePath.length);
      const servesDomain = url.pathname.startsWith("/packages/domain/");
      const rootDirectory = servesDomain ? REPOSITORY_DIR : PUBLIC_DIR;
      const requestedPath = servesDomain
        ? url.pathname.replace(/^\/+/, "")
        : relativePath;
      const filePath = path.resolve(rootDirectory, requestedPath);
      const allowedDirectory = servesDomain ? DOMAIN_DIR : PUBLIC_DIR;
      const relativeToAllowed = path.relative(allowedDirectory, filePath);
      if (relativeToAllowed.startsWith("..") || path.isAbsolute(relativeToAllowed)) {
        return send(response, 403, "Forbidden", "text/plain; charset=utf-8");
      }
      const data = await fsPromises.readFile(filePath);
      return send(
        response,
        200,
        data,
        contentTypes.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream",
      );
    } catch (error) {
      if (error.code === "ENOENT") {
        return send(response, 404, "Not found", "text/plain; charset=utf-8");
      }
      return send(response, 500, error.message, "text/plain; charset=utf-8");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return server;
}

async function stopServer(server) {
  if (!server) return;
  if (typeof server.close === "function" && !server.kill) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    return;
  }
  if (server.exitCode !== null || server.killed) return;
  await new Promise((resolve) => {
    server.once("exit", resolve);
    server.kill();
  });
}

function send(response, status, body, contentType) {
  response.writeHead(status, { "content-type": contentType });
  response.end(body);
}

async function waitForServer(baseUrl, server) {
  const timeoutAt = Date.now() + 30_000;
  let stderr = "";
  server.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  while (Date.now() < timeoutAt) {
    if (server.exitCode !== null) throw new Error(`El servidor terminó antes de iniciar.\n${stderr}`);
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // El puerto todavía no está disponible.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`El servidor no respondió en ${baseUrl}.\n${stderr}`);
}
