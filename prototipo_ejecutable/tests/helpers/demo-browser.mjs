import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveAppUrl } from "./app-url.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(TEST_DIR, "..", "..");
const SERVER_FILE = path.join(PROJECT_DIR, "server-static.js");

export const routes = [
  { id: "dashboard", title: "Radar comercial" },
  { id: "projects", title: "Proyectos comparables" },
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

export async function withDemoBrowser(run) {
  const port = Number(process.env.TEST_PORT ?? 4177);
  const baseUrl = process.env.BASE_URL ?? `http://127.0.0.1:${port}`;
  const ownsServer = !process.env.BASE_URL;
  const server = ownsServer
    ? spawn(process.execPath, [SERVER_FILE], {
        cwd: PROJECT_DIR,
        env: { ...process.env, PORT: String(port) },
        stdio: ["ignore", "pipe", "pipe"],
      })
    : null;

  try {
    if (server) await waitForServer(baseUrl, server);
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
    if (server && !server.killed) server.kill();
  }
}

export async function createObservedPage(context, baseUrl) {
  const page = await context.newPage();
  return {
    page,
    problems: observePage(page),
    externalRequests: await guardSameOrigin(page, baseUrl),
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
  const allowedOrigin = new URL(baseUrl).origin;

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
      requestUrl.origin !== allowedOrigin
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
