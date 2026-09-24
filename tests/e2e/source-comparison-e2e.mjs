import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

// Real API + Vite, isolated from the user's demo. Run after data:build and builds.
const root = path.resolve(import.meta.dirname, "../..");
const outputDirectory = path.join(root, "test-results", "source-comparison");
const apiPort = Number(process.env.SOURCE_E2E_API_PORT ?? 4344);
const webPort = Number(process.env.SOURCE_E2E_WEB_PORT ?? 4345);
const baseUrl = `http://127.0.0.1:${webPort}`;
const districtCases = [
  { district: "150122", name: "miraflores", ids: ["3981", "3391", "4146"] },
  { district: "150113", name: "jesus-maria", ids: ["1940", "3485", "4174"] },
];
const allCases = [
  ...districtCases.flatMap((district) => district.ids.map((id) => ({ id, district: district.district }))),
  { id: "4157", district: "150122" }, { id: "3589", district: "150113" },
];
const details = new Map();
const failures = [];
let completed = 0;
let apiApp;
let viteServer;
let browser;
let restartApi;

try {
  await fs.mkdir(outputDirectory, { recursive: true });
  const [{ buildApp }, { readConfig }, { InMemorySnapshotRepository, loadAndValidateSnapshot }, { createServer }] = await Promise.all([
    import("../../apps/api/dist/app.js"), import("../../apps/api/dist/config.js"), import("@viva/snapshot"), import("vite"),
  ]);
  const config = readConfig({
    API_PORT: String(apiPort),
    SNAPSHOT_PATH: path.join(root, "data/generated/viva-platform-demo.json"),
    SNAPSHOT_SCHEMA_PATH: path.join(root, "packages/contracts/schemas/demo-v2.schema.json"),
  });
  const loaded = await loadAndValidateSnapshot({ snapshotPath: config.snapshotPath, schemaPath: config.schemaPath });
  restartApi = async () => {
    await apiApp?.close();
    apiApp = await buildApp({ repository: new InMemorySnapshotRepository(loaded), config, logger: false });
    await apiApp.listen({ host: "127.0.0.1", port: apiPort });
  };
  await restartApi();
  viteServer = await createServer({
    configFile: path.join(root, "apps/web/vite.config.mjs"), configLoader: "native",
    server: { host: "127.0.0.1", port: webPort, strictPort: true, proxy: { "/api": `http://127.0.0.1:${apiPort}`, "/health": `http://127.0.0.1:${apiPort}` } },
  });
  await viteServer.listen();
  const executablePath = [process.env.PLAYWRIGHT_CHROME_PATH, chromium.executablePath(),
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"]
    .find((candidate) => candidate && existsSync(candidate));
  browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true });

  await runCase("api-eight-projects", async (page) => {
    for (const item of allCases) {
      const detail = await apiJson(page.request, `/projects/${item.id}`);
      details.set(item.id, detail);
      assert.ok(detail.datasetVersion && detail.contractVersion, "Cada ficha identifica sus versiones");
      const official = detail.traceability.sources.filter((source) => source.type === "agency_website");
      assert.ok(official.length > 0, `${item.id}: debe existir una web propia con observaciones`);
      assert.ok(detail.traceability.sourceDecision?.headline, `${item.id}: falta la lectura comercial del contraste`);
      for (const source of official) {
        assert.match(source.sourceUrl, /^https:\/\//u);
        assert.ok(source.capturedAt, `${item.id}: falta fecha de captura`);
        assert.ok(source.review?.reviewedAt, `${item.id}: falta fecha de revisión`);
        assert.ok(["demo_reviewed", "historical_sanitized"].includes(source.review?.status));
        assert.equal(source.observedData.listPrice, null, `${item.id}: no inventar precio web`);
        assert.notEqual(source.observedData.unitCount, 6016, "El conteo mal extraído no puede publicarse");
      }
      assert.equal(detail.traceability.sourceComparison.comparisons.length, official.length, "Una comparación por página oficial");
      const json = JSON.stringify(detail.traceability);
      assert.doesNotMatch(json, /6016|Sobre el Proyecto Entr/u);
    }
    const versia = webSources("3981")[0];
    assert.equal(versia.review.status, "demo_reviewed");
    assert.match(versia.capturedAt, /^2026-09-09/u);
    assert.equal(versia.observedData.bedrooms, null, "Ambientes no deben publicarse como dormitorios");
    assert.match(versia.observedData.roomDescription, /2 y 3 ambs/u);
    assert.equal(versia.observedData.deliveryDate, "2028", "No inventar día/mes de entrega");
    const monterosso = webSources("1940")[0];
    assert.equal(monterosso.review.status, "demo_reviewed");
    assert.match(monterosso.observedData.bedrooms, /Hasta 2 dormitorios/u);
    assert.equal(monterosso.observedData.unitCount, null);
    const units = details.get("4157").traceability.sourceComparison.comparisons;
    assert.equal(units.length, 2);
    assert.equal(new Set(units.map((pair) => pair.sources.official.sourceUrl)).size, 2);
    for (const pair of units) {
      assert.equal(pair.sources.official.scope, "unit");
      assert.equal(pair.rows.find((row) => row.field === "totalArea").status, "additional", "Un departamento no contradice un agregado de proyecto");
    }
  });

  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    for (const district of districtCases) {
      await runCase(`${district.name}-flow-${viewport.width}`, async (page) => {
        await openProjects(page, district.district);
        for (const id of district.ids) {
          await searchProject(page, id);
          await openDetail(page, id);
          await assertDetailSources(page, id);
          await assertNoOverflow(page, `Ficha ${id} a ${viewport.width}px`);
          if (id === district.ids[0]) await screenshot(page, `${district.name}-detail-${viewport.width}`);
          await page.getByRole("button", { name: "Cerrar ficha", exact: true }).click();
          await page.locator("#project-detail-title").waitFor({ state: "detached" });
          const checkbox = page.locator(`[data-compare-id="project:nexo-${id}"]`);
          await checkbox.check();
          assert.equal(await checkbox.isChecked(), true);
        }
        await page.locator('[data-action="open-comparison"]').click();
        await page.waitForURL(/#compare$/u);
        await ready(page);
        await page.locator(".comparison-source-project").first().waitFor();
        assert.deepEqual(await page.locator(".comparison-source-project").evaluateAll((elements) => elements.map((element) => element.dataset.sourceProject)), district.ids.map((id) => `project:nexo-${id}`));
        assert.equal(await page.locator(".comparison-source-pair").count(), 3);
        for (const id of district.ids) {
          const card = page.locator(`[data-source-project="project:nexo-${id}"]`);
          assert.ok((await card.locator(".comparison-source-values").innerText()).includes("Nexo"));
          assert.ok((await card.locator(".comparison-source-values").innerText()).includes("Web oficial"));
          assert.ok(await card.locator(".source-decision__price").isVisible());
        }
        await assertNoOverflow(page, `Comparador ${district.name} a ${viewport.width}px`);
        await screenshot(page, `${district.name}-compare-${viewport.width}`);
      }, viewport);
    }
  }

  await runCase("separate-unit-pages-and-beyond", async (page) => {
    for (const id of ["4157", "3589"]) {
      const fixture = allCases.find((item) => item.id === id);
      await openProjects(page, fixture.district);
      await searchProject(page, id);
      await openDetail(page, id);
      await assertDetailSources(page, id);
      if (id === "4157") {
        const pairs = page.locator(".source-page-comparison");
        assert.equal(await pairs.count(), 2);
        const urls = await pairs.locator('a:has-text("Abrir página oficial")').evaluateAll((links) => links.map((link) => link.href));
        assert.equal(new Set(urls).size, 2);
        assert.ok(urls.some((url) => url.includes("duplex-801")));
        assert.ok(urls.some((url) => url.includes("tipico-2-502")));
        assert.equal(await pairs.locator(".source-scope-note").count(), 2);
        const unitText = (await pairs.allInnerTexts()).join("\n");
        assert.match(unitText, /245[.,]47/u);
        assert.match(unitText, /130[.,]83/u);
        await screenshot(page, "parquenu-independent-units");
      }
      await assertNoOverflow(page, `Ficha adicional ${id}`);
    }
  });

  await runCase("two-hundred-percent-layout", async (page) => {
    await openProjects(page, "150122");
    await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
    await searchProject(page, "3981");
    await openDetail(page, "3981");
    await assertDetailSources(page, "3981");
    await assertNoOverflow(page, "Ficha al 200% (zoom CSS de prueba)");
    await screenshot(page, "versia-detail-zoom-200");
  });

  if (failures.length) throw new AggregateError(failures, `${failures.length} pruebas multifuente fallaron`);
  console.log(`Source comparison E2E OK: ${completed} casos; 8 proyectos, 2 distritos, 3 tamaños y zoom 200%.`);
} finally {
  await browser?.close();
  await viteServer?.close();
  await apiApp?.close();
}

async function runCase(name, run, viewport = { width: 1440, height: 900 }) {
  await restartApi(); // Respect the production limiter; cases get independent budgets.
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(12_000);
  const errors = [];
  const requests = [];
  const httpErrors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  page.on("response", (response) => { if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`); });
  try {
    await run(page);
    assert.deepEqual(errors, [], "Sin excepciones JavaScript");
    assert.deepEqual(httpErrors, [], "Sin solicitudes fallidas");
    assert.equal(requests.some((url) => !url.startsWith(`${baseUrl}/`)), false, "La vista no depende de hosts externos");
    assert.equal(requests.some((url) => /demo-data|viva-platform-demo\.json/u.test(url)), false, "El navegador no recibe el snapshot");
    completed++;
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(new Error(`${name}: ${error.message}`, { cause: error }));
    console.error(`FAIL ${name}: ${error.stack}`);
    if (httpErrors.length) console.error(JSON.stringify(httpErrors));
    await screenshot(page, `${name}-failure`).catch(() => {});
  } finally { await context.close(); }
}

function webSources(id) { return details.get(id).traceability.sources.filter((source) => source.type === "agency_website"); }
async function apiJson(request, route) {
  const response = await request.get(`${baseUrl}/api/v1${route}`);
  assert.equal(response.status(), 200, `${route}: ${await response.text()}`);
  return response.json();
}
async function openProjects(page, district) {
  const query = new URLSearchParams({ sv: "1", district, scope: "district", typology: "all", bedrooms: "all", delivery: "all" });
  await page.goto(`${baseUrl}/?${query}#projects`, { waitUntil: "networkidle" });
  await ready(page);
  await page.locator("#project-filter-form").waitFor();
}
async function ready(page) {
  await page.waitForFunction(() => document.querySelector('.product-nav a[aria-current="page"]')?.getAttribute("href") === window.location.hash);
  await page.locator(".page-header h1").waitFor();
  await page.locator(".busy").waitFor({ state: "detached" });
}
async function searchProject(page, id) {
  const detail = details.get(id);
  assert.ok(detail, `Falta fixture API ${id}`);
  await page.locator('#project-filter-form [name="query"]').fill(detail.project.name);
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/v1/projects/query") && response.request().method() === "POST"),
    page.getByRole("button", { name: "Aplicar filtros", exact: true }).click(),
  ]);
  await page.locator(`.project-table [data-project-detail="${detail.project.id}"]`).waitFor();
  await ready(page);
}
async function openDetail(page, id) {
  await page.locator(`.project-table [data-project-detail="${details.get(id).project.id}"]`).click();
  await page.locator("#project-detail-title").waitFor();
  assert.equal(await page.locator("#project-detail-title").innerText(), details.get(id).project.name);
  await page.locator(".source-page-comparison").first().waitFor();
}
async function assertDetailSources(page, id) {
  const ledger = page.locator(".source-ledger");
  assert.match(await ledger.innerText(), /Nexo vs web oficial/u);
  assert.match(await ledger.innerText(), /Qué aporta la web oficial/u);
  assert.doesNotMatch(await ledger.innerText(), /6016|Sobre el Proyecto Entr/u);
  assert.equal(await ledger.locator(".source-page-comparison").count(), webSources(id).length);
  const officialCells = ledger.locator('td[data-source="Web oficial"]');
  assert.ok(await officialCells.count() > 0);
  for (const source of webSources(id)) {
    assert.equal(await ledger.locator(`a[href=${JSON.stringify(source.sourceUrl)}]`).count() > 0, true);
  }
  if (id === "3981") {
    const bedroom = ledger.locator(".source-matrix tr").filter({ has: page.locator("th > span:first-child", { hasText: /^Dormitorios$/u }) });
    assert.match(await bedroom.locator('td[data-source="Web oficial"]').innerText(), /Sin dato/u);
    assert.match(await ledger.innerText(), /2 y 3 ambs/u);
    assert.match(await ledger.innerText(), /Revisada para demo/u);
  } else if (id === "1940") {
    assert.match(await ledger.innerText(), /Hasta 2 dormitorios/u);
    assert.match(await ledger.innerText(), /Revisada para demo/u);
  } else {
    assert.match(await ledger.innerText(), /Referencia histórica/u);
  }
}
async function assertNoOverflow(page, message) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false, message);
}
async function screenshot(page, name) {
  await page.screenshot({ path: path.join(outputDirectory, `${name}.png`), fullPage: true });
}
