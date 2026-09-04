import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

let baseUrl = process.env.E2E_BASE_URL ?? "";
const outputDirectory = path.resolve("test-results", "productized");
await fs.mkdir(outputDirectory, { recursive: true });

let apiApp = null;
let viteServer = null;
if (!baseUrl) {
  const apiPort = 4310;
  const webPort = 4311;
  const root = path.resolve(import.meta.dirname, "../..");
  const [{ buildApp }, { readConfig }, { InMemorySnapshotRepository, loadAndValidateSnapshot }, { createServer }] = await Promise.all([
    import("../../apps/api/dist/app.js"),
    import("../../apps/api/dist/config.js"),
    import("@viva/snapshot"),
    import("vite"),
  ]);
  const config = readConfig({
    API_PORT: String(apiPort),
    SNAPSHOT_PATH: path.join(root, "data/generated/viva-platform-demo.json"),
    SNAPSHOT_SCHEMA_PATH: path.join(root, "packages/contracts/schemas/demo-v2.schema.json"),
  });
  const loaded = await loadAndValidateSnapshot({ snapshotPath: config.snapshotPath, schemaPath: config.schemaPath });
  apiApp = await buildApp({ repository: new InMemorySnapshotRepository(loaded), config, logger: false });
  await apiApp.listen({ host: "127.0.0.1", port: apiPort });
  viteServer = await createServer({
    configFile: path.join(root, "apps/web/vite.config.mjs"),
    configLoader: "native",
    server: {
      host: "127.0.0.1",
      port: webPort,
      strictPort: true,
      proxy: { "/api": `http://127.0.0.1:${apiPort}`, "/health": `http://127.0.0.1:${apiPort}` },
    },
  });
  await viteServer.listen();
  baseUrl = `http://127.0.0.1:${webPort}`;
}

const executablePath = [
  process.env.PLAYWRIGHT_CHROME_PATH,
  chromium.executablePath(),
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate) => candidate && existsSync(candidate));
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const consoleErrors = [];
const observedRequests = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("request", (request) => observedRequests.push(request.url()));

try {
  await page.goto(`${baseUrl}/#dashboard`, { waitUntil: "networkidle" });
  await page.locator("h1").waitFor();
  assert.match(await page.locator("h1").innerText(), /lectura comercial/i);
  await page.screenshot({ path: path.join(outputDirectory, "dashboard-1280x720.png"), fullPage: true });

  const routes = [
    "dashboard", "projects", "inspector", "market", "compare", "trust", "assistant", "activity",
    "journey/scale", "journey/geography", "journey/quality", "journey/depth", "journey/movement", "journey/decision",
  ];
  for (const route of routes) {
    await page.goto(`${baseUrl}/#${route}`, { waitUntil: "networkidle" });
    await page.locator("h1").waitFor();
    assert.ok((await page.locator("h1").innerText()).trim(), `${route} debe tener h1 visible`);
  }

  await page.goto(`${baseUrl}/#projects`, { waitUntil: "networkidle" });
  assert.ok(await page.locator("tbody tr").count() > 0, "Proyectos debe presentar filas");
  await page.goto(`${baseUrl}/#dashboard`, { waitUntil: "networkidle" });
  assert.ok(await page.locator("svg.map-chart").count() === 1, "El mapa debe tener ejes y puntos accesibles");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/#assistant`, { waitUntil: "networkidle" });
  await page.locator("h1").waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.screenshot({ path: path.join(outputDirectory, "assistant-390x844.png"), fullPage: true });

  assert.equal(consoleErrors.length, 0, `Errores de consola: ${consoleErrors.join(" | ")}`);
  assert.equal(observedRequests.some((url) => url.includes("demo-data")), false, "El navegador no debe pedir el snapshot");
  assert.equal(
    observedRequests.some((url) => !url.startsWith(baseUrl) && !url.startsWith("http://127.0.0.1:3000")),
    false,
    "El recorrido no debe depender de hosts externos",
  );
  console.log(`Productized E2E OK: ${routes.length} superficies, sin snapshot ni hosts externos.`);
} finally {
  await browser.close();
  await viteServer?.close();
  await apiApp?.close();
}
