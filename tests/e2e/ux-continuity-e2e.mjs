import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

// Run after data:build, build:packages and the API build. This suite deliberately
// starts its own servers and never changes an existing development server.
const root = path.resolve(import.meta.dirname, "../..");
const outputDirectory = path.join(root, "test-results", "ux-continuity");
const apiPort = Number(process.env.UX_E2E_API_PORT ?? 4332);
const webPort = Number(process.env.UX_E2E_WEB_PORT ?? 4333);
const baseUrl = `http://127.0.0.1:${webPort}`;
const failures = [];
let apiApp = null;
let viteServer = null;
let browser = null;
let fixture;
let completed = 0;
let restartApi;

try {
  await fs.mkdir(outputDirectory, { recursive: true });
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
  restartApi = async () => {
    await apiApp?.close();
    apiApp = await buildApp({ repository: new InMemorySnapshotRepository(loaded), config, logger: false });
    await apiApp.listen({ host: "127.0.0.1", port: apiPort });
  };
  await restartApi();
  viteServer = await createServer({
    configFile: path.join(root, "apps/web/vite.config.mjs"),
    configLoader: "native",
    server: {
      host: "127.0.0.1", port: webPort, strictPort: true,
      proxy: { "/api": `http://127.0.0.1:${apiPort}`, "/health": `http://127.0.0.1:${apiPort}` },
    },
  });
  await viteServer.listen();
  const executablePath = [
    process.env.PLAYWRIGHT_CHROME_PATH,
    chromium.executablePath(),
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].find((candidate) => candidate && existsSync(candidate));
  browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true });
  const setup = await browser.newContext();
  fixture = await discoverScenario(setup.request);
  await setup.close();

  await runCase("navigation-during-initial-load", async (page, gates) => {
    const held = await holdRequest(page, gates, "**/api/v1/workspace/evaluate", () => true);
    await page.goto(scenarioUrl("projects"), { waitUntil: "domcontentloaded" });
    await waitForHeld(held);
    await page.evaluate(() => { window.location.hash = "#activity"; });
    await page.waitForURL(/#activity$/u);
    await releaseAndSettle(page, held);
    await ready(page);
    assert.match(await page.locator(".page-header h1").innerText(), /Seguimiento/u, "Cambiar de ruta durante el arranque no debe invalidar la carga inicial");
    assert.match(page.url(), /#activity$/u, "La carga inicial debe respetar el último destino elegido");
    assert.equal(await page.locator(".route-error").count(), 0);
  });

  await runCase("command-palette-and-skip-link", async (page) => {
    await openProjects(page);
    const currentUrl = page.url();
    await page.locator(".skip-link").focus();
    await page.keyboard.press("Enter");
    assert.equal(page.url(), currentUrl, "Saltar al contenido no debe cambiar la ruta");
    await assertFocused(page.locator("#main-content"), "El salto debe enfocar el contenido actual");
    await page.keyboard.press("Control+k");
    await page.locator("#command-dialog[open]").waitFor();
    await assertFocused(page.locator("#command-input"), "La paleta debe enfocar el buscador");
    await page.locator("#command-input").fill("  catalogo  ");
    assert.deepEqual(await visibleCommandRoutes(page), ["#projects"], "La búsqueda sin tilde debe filtrar por Catálogo");
    await page.keyboard.press("Enter");
    await page.locator("#command-dialog").waitFor({ state: "hidden" });
    assert.equal(page.url(), currentUrl, "Elegir el destino actual debe cerrar sin navegar a otro destino");
    await page.keyboard.press("Control+k");
    await page.locator("#command-input").fill("destino-inexistente-zzzz");
    assert.equal((await visibleCommandRoutes(page)).length, 0, "La consulta desconocida no debe dejar destinos visibles");
    await page.locator("#command-empty").waitFor();
    assert.match(await page.locator("#command-empty").innerText(), /no hay|sin resultados|no encontramos/iu, "El vacío debe explicar que no hay destinos");
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#command-dialog").evaluate((dialog) => dialog.open), true, "Enter sin resultados no debe cerrar ni navegar");
    await page.locator("#command-input").fill("seguimiento");
    assert.deepEqual(await visibleCommandRoutes(page), ["#activity"]);
    await page.keyboard.press("Enter");
    await page.waitForURL(/#activity$/u);
    await ready(page);
    await page.keyboard.press("Control+k");
    await page.locator("#command-dialog[open]").waitFor();
    await page.keyboard.press("Escape");
    await page.locator("#command-dialog").waitFor({ state: "hidden" });
    assert.match(page.url(), /#activity$/u, "Escape debe conservar el destino");
  });

  await runCase("checkbox-focus-and-filter-drafts", async (page, gates) => {
    await openProjects(page);
    const query = page.locator('#project-filter-form [name="query"]');
    await query.fill("borrador sin aplicar");
    const checkbox = page.locator(".project-select-checkbox:not(:disabled)").first();
    const id = await checkbox.getAttribute("data-compare-id");
    await checkbox.focus();
    await page.keyboard.press("Space");
    const selected = page.locator(`[data-compare-id=${JSON.stringify(id)}]`);
    assert.equal(await selected.isChecked(), true);
    await assertFocused(selected, "Seleccionar con Espacio debe conservar el foco en el checkbox");
    assert.equal(await query.inputValue(), "borrador sin aplicar", "Seleccionar no debe borrar filtros pendientes");
    await query.fill("");
    const held = await holdRequest(page, gates, "**/api/v1/projects/query", () => true);
    await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
    await waitForHeld(held);
    await query.fill("texto escrito durante la consulta");
    await query.evaluate((input) => { input.focus(); input.setSelectionRange(6, 13, "backward"); });
    await releaseAndSettle(page, held);
    assert.equal(await query.inputValue(), "texto escrito durante la consulta", "La respuesta no debe sustituir el borrador posterior");
    await assertFocused(query, "Una respuesta de fondo no debe quitar foco al buscador");
    assert.deepEqual(await query.evaluate((input) => [input.selectionStart, input.selectionEnd, input.selectionDirection]), [6, 13, "backward"]);
  });

  await runCase("scenario-draft-survives-background-response", async (page, gates) => {
    await openProjects(page);
    const held = await holdRequest(page, gates, "**/api/v1/projects/query", () => true);
    await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
    await waitForHeld(held);
    await page.getByRole("button", { name: "Editar escenario", exact: true }).click();
    const price = page.locator('#scenario-form [name="target_price_pen"]');
    await price.fill("654321");
    await releaseAndSettle(page, held);
    assert.equal(await page.locator("#scenario-dialog").evaluate((dialog) => dialog.open), true, "Una respuesta de fondo no debe cerrar el escenario");
    assert.equal(await price.inputValue(), "654321", "El borrador del escenario debe conservarse");
    await assertFocused(price, "La edición del escenario debe conservar el foco");
    await page.keyboard.press("Escape");
    await page.locator("#scenario-dialog").waitFor({ state: "hidden" });
    await assertFocused(page.locator('[data-action="scenario"]'), "Cerrar el escenario debe devolver foco a su invocador");
  });

  await runCase("selection-across-pages-and-comparison", async (page) => {
    await openProjects(page);
    const selectedIds = [];
    assert.equal(await page.locator('[data-action="open-comparison"]').isDisabled(), true);
    for (let count = 0; count < 2; count++) {
      const checkbox = page.locator(".project-select-checkbox:not(:disabled):not(:checked)").first();
      selectedIds.push(await checkbox.getAttribute("data-compare-id"));
      await checkbox.click();
    }
    assert.equal(await page.locator('[data-action="open-comparison"]').isEnabled(), true);
    assert.match(await page.locator('[data-action="open-comparison"]').innerText(), /Comparar 2 proyectos/u);
    await nextPage(page);
    assert.deepEqual(await selectionIds(page), selectedIds, "Paginar no debe perder la selección");
    assert.deepEqual(await tableIds(page), canonicalIds(fixture.secondPage.items), "Página 2 debe corresponder al universo evaluado, no a filtrado local");
    const third = page.locator(".project-select-checkbox:not(:disabled):not(:checked)").first();
    selectedIds.push(await third.getAttribute("data-compare-id"));
    await third.click();
    assert.deepEqual(await selectionIds(page), selectedIds);
    assert.equal(await page.locator(".project-select-checkbox:not(:checked):not(:disabled)").count(), 0, "No debe admitirse un cuarto proyecto");
    assert.match(await page.locator('[data-action="open-comparison"]').innerText(), /Comparar 3 proyectos/u);
    await page.locator('[data-action="open-comparison"]').click();
    await page.locator(".comparison-project-card").first().waitFor();
    await ready(page);
    assert.deepEqual(await page.locator(".comparison-project-card [data-project-remove]").evaluateAll((buttons) => buttons.map((button) => button.dataset.projectRemove)), selectedIds, "La comparación debe preservar orden e identidades");
    await page.getByRole("link", { name: "Cambiar selección", exact: true }).click();
    await ready(page);
    assert.match(await page.locator(".pagination").innerText(), /Página 2 de/u, "Volver de Comparar debe conservar la página");
    assert.deepEqual(await selectionIds(page), selectedIds);
    await page.locator('[data-action="open-comparison"]').click();
    await page.locator(".comparison-project-card").first().waitFor();
    await ready(page);
    await page.locator(".comparison-project-card [data-project-remove]").last().click();
    await page.waitForFunction(() => document.querySelectorAll(".comparison-project-card").length === 2);
    await page.locator(".comparison-project-card [data-project-remove]").last().click();
    await page.getByRole("link", { name: "Elegir proyectos", exact: true }).waitFor();
    assert.equal(await page.locator(".comparison-project-card").count(), 0, "Con un proyecto debe regresar a orientación");
  });

  await runCase("reset-clears-session-context-and-assistant-draft", async (page) => {
    await openProjects(page);
    await page.locator(".project-select-checkbox:not(:disabled)").first().click();
    await page.locator(".project-select-checkbox:not(:disabled):not(:checked)").first().click();
    await navigate(page, "#assistant");
    await ready(page);
    const draft = "Pregunta pendiente sobre los proyectos elegidos";
    await page.locator("#assistant-input").fill(draft);
    await navigate(page, "#projects");
    await ready(page);
    assert.equal((await selectionIds(page)).length, 2, "Navegar a Decidir y volver no debe perder selección");
    await navigate(page, "#assistant");
    await ready(page);
    assert.equal(await page.locator("#assistant-input").inputValue(), draft, "La navegación ordinaria debe preservar borrador del asistente");
    await page.getByRole("button", { name: "Editar escenario", exact: true }).click();
    await page.getByRole("button", { name: "Reiniciar demo", exact: true }).click();
    await page.waitForURL(/#journey\/scale$/u);
    await ready(page);
    assert.equal(new URL(page.url()).search, "", "El reinicio debe recuperar la URL del escenario inicial");
    await navigate(page, "#assistant");
    await ready(page);
    assert.equal(await page.locator("#assistant-input").inputValue(), "", "Reiniciar debe borrar el borrador del asistente");
    await navigate(page, "#projects");
    await ready(page);
    assert.deepEqual(await selectionIds(page), [], "Reiniciar debe borrar la selección de sesión");
  });

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await runCase(`detail-return-${viewport.width}`, async (page) => {
      await openProjects(page);
      await nextPage(page);
      const beforeIds = await tableIds(page);
      const opener = page.locator(".project-table [data-project-detail]").nth(1);
      const id = await opener.getAttribute("data-project-detail");
      const name = await opener.locator("xpath=ancestor::tr").locator(".project-cell-value strong").first().innerText();
      await opener.scrollIntoViewIfNeeded();
      await opener.evaluate((button) => button.addEventListener("click", () => { window.__uxDetailClickScroll = window.scrollY; }, { capture: true, once: true }));
      await opener.click();
      const beforeScroll = await page.evaluate(() => window.__uxDetailClickScroll);
      assert.equal(typeof beforeScroll, "number", "La prueba debe medir el scroll en el click real, después del auto-scroll del navegador");
      await page.locator("#project-detail-title").waitFor();
      assert.equal(await page.locator("#project-detail-title").innerText(), name);
      await assertFocused(page.locator("#project-detail-title"), "Abrir la ficha debe enfocar su título");
      assert.equal(await hasHorizontalOverflow(page), false, "La ficha no debe desbordar el viewport");
      await page.getByRole("button", { name: "Cerrar ficha", exact: true }).click();
      await page.locator("#project-detail-title").waitFor({ state: "detached" });
      const returned = page.locator(`.project-table [data-project-detail=${JSON.stringify(id)}]`);
      await assertFocused(returned, "Cerrar ficha debe devolver el foco al invocador exacto");
      assert.match(await page.locator(".pagination").innerText(), /Página 2 de/u);
      assert.deepEqual(await tableIds(page), beforeIds, "Cerrar ficha debe conservar página y filas");
      await page.waitForFunction((expected) => Math.abs(window.scrollY - expected) <= 3, beforeScroll, { timeout: 2_000 }).catch(() => {});
      const afterScroll = await page.evaluate(() => window.scrollY);
      assert.ok(Math.abs(afterScroll - beforeScroll) <= 3, `Cerrar ficha debe conservar la posición de lectura: antes=${beforeScroll}, después=${afterScroll}`);
    }, viewport);
  }

  await runCase("scenario-failure-is-atomic-and-retryable", async (page) => {
    await openProjects(page);
    await page.locator(".project-select-checkbox:not(:disabled)").first().click();
    await page.locator(".project-select-checkbox:not(:disabled):not(:checked)").first().click();
    const before = {
      url: page.url(), ribbon: await page.locator(".scenario-ribbon").innerText(),
      ids: await tableIds(page), selection: await selectionIds(page),
    };
    let failuresSent = 0;
    const failWorkspace = async (route) => {
      failuresSent++;
      await fulfillUnavailable(route, "La evaluación temporalmente no está disponible.");
    };
    await page.route("**/api/v1/workspace/evaluate", failWorkspace);
    await page.getByRole("button", { name: "Editar escenario", exact: true }).click();
    const nextDistrict = fixture.bootstrap.districts.find((district) => district.id !== fixture.scenario.district_id);
    assert.ok(nextDistrict, "La fixture debe permitir cambiar distrito");
    await page.locator('#scenario-form [name="district_id"]').selectOption(nextDistrict.id);
    await page.locator('#scenario-form [name="target_price_pen"]').fill("765432");
    await page.getByRole("button", { name: "Aplicar escenario", exact: true }).click();
    await page.locator('#scenario-dialog [role="alert"]').waitFor();
    assert.equal(failuresSent, 1);
    assert.equal(page.url(), before.url, "El fallo no debe publicar un escenario nuevo en la URL");
    assert.equal(await page.locator(".scenario-ribbon").innerText(), before.ribbon, "El fallo no debe combinar nuevo contexto con métricas anteriores");
    assert.deepEqual(await tableIds(page), before.ids);
    assert.deepEqual(await selectionIds(page), before.selection, "La selección solo debe reiniciarse al confirmar el nuevo escenario");
    assert.equal(await page.locator('#scenario-form [name="district_id"]').inputValue(), nextDistrict.id);
    assert.equal(await page.locator('#scenario-form [name="target_price_pen"]').inputValue(), "765432");
    await page.unroute("**/api/v1/workspace/evaluate", failWorkspace);
    await page.getByRole("button", { name: "Aplicar escenario", exact: true }).click();
    await page.locator("#scenario-dialog").waitFor({ state: "hidden" });
    await ready(page);
    assert.deepEqual(await selectionIds(page), [], "Confirmar otro escenario debe reiniciar selección");
    assert.notEqual(await page.locator(".scenario-ribbon").innerText(), before.ribbon);
    assert.equal(new URL(page.url()).searchParams.get("district") ?? fixture.bootstrap.initialScenario.district_id, nextDistrict.id);
  });

  await runCase("projects-post-error-retry-and-navigation", async (page) => {
    await openProjects(page);
    await page.locator(".project-select-checkbox:not(:disabled)").first().click();
    const selected = await selectionIds(page);
    let attempts = 0;
    await page.route("**/api/v1/projects/query", async (route) => {
      attempts++;
      if (attempts === 1) await fulfillUnavailable(route, "No fue posible cargar los proyectos.");
      else await route.continue();
    });
    await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
    await page.locator('.route-error[role="alert"]').waitFor();
    assert.equal(await page.locator(".startup-state--error").count(), 0, "Un fallo operativo no debe destruir el workspace");
    await page.getByRole("button", { name: "Reintentar consulta", exact: true }).click();
    await ready(page);
    await page.locator(".project-select-checkbox").first().waitFor();
    assert.equal(attempts, 2, "Reintentar debe repetir la consulta POST fallida");
    assert.equal(await page.locator(".route-error").count(), 0);
    assert.deepEqual(await tableIds(page), canonicalIds(fixture.firstPage.items));
    assert.deepEqual(await selectionIds(page), selected);
    const historyResponse = page.waitForResponse((response) => response.url().endsWith("/api/v1/history/query") && response.request().method() === "POST");
    await navigate(page, "#activity");
    assert.equal((await historyResponse).status(), 200, "La navegación posterior al fallo debe seguir consultando");
    await ready(page);
    assert.match(await page.locator("h1").innerText(), /seguimiento/iu);
  });

  for (const lateError of [false, true]) {
    await runCase(`projects-request-race-${lateError ? "error" : "success"}`, async (page, gates) => {
      await openProjects(page);
      const firstName = fixture.firstPage.items[0].name;
      const nextName = fixture.firstPage.items.find((project) => project.name !== firstName)?.name;
      assert.ok(nextName, "La fixture debe contener nombres diferentes para comprobar respuestas obsoletas");
      const expected = await apiJson(page.request, "/projects/query", { scenario: fixture.scenario, query: nextName, page: 1, pageSize: 18, sort: "name" });
      const held = await holdRequest(page, gates, "**/api/v1/projects/query", (request) => request.postDataJSON()?.query === firstName, lateError);
      await page.locator('#project-filter-form [name="query"]').fill(firstName);
      await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
      await waitForHeld(held);
      await page.locator('#project-filter-form [name="query"]').fill(nextName);
      await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
      await page.waitForFunction((ids) => JSON.stringify([...document.querySelectorAll(".project-table [data-compare-id]")].map((input) => input.dataset.compareId)) === JSON.stringify(ids), canonicalIds(expected.items));
      await releaseAndSettle(page, held);
      assert.deepEqual(await tableIds(page), canonicalIds(expected.items), "La respuesta anterior no debe sustituir los resultados de la última búsqueda");
      assert.equal(await page.locator('#project-filter-form [name="query"]').inputValue(), nextName);
      assert.equal(await page.locator(".route-error").count(), 0, "Un error obsoleto no debe invalidar la consulta vigente");
    });
  }

  await runCase("map-late-detail-cannot-replace-selected-project", async (page, gates) => {
    await page.goto(scenarioUrl("dashboard"), { waitUntil: "networkidle" });
    await ready(page);
    const points = page.locator("[data-map-project]");
    assert.ok(await points.count() >= 2, "El escenario amplio debe tener dos puntos para probar la carrera");
    const firstId = await points.nth(0).getAttribute("data-map-project");
    const nextId = await points.nth(1).getAttribute("data-map-project");
    const expected = await apiJson(page.request, `/projects/${encodeURIComponent(nextId)}`);
    const held = await holdRequest(page, gates, "**/api/v1/projects/*", (request) => request.method() === "GET" && decodeURIComponent(new URL(request.url()).pathname.split("/").at(-1)) === firstId);
    await page.locator(`[data-map-project=${JSON.stringify(firstId)}]`).focus();
    await page.keyboard.press("Enter");
    await waitForHeld(held);
    await page.locator(`[data-map-project=${JSON.stringify(nextId)}]`).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Abrir ficha completa", exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('[data-action="map-open-detail"]')?.disabled === false);
    await releaseAndSettle(page, held);
    assert.equal(await page.locator(".map-project-panel--selected h3").innerText(), expected.project.name);
    await page.getByRole("button", { name: "Abrir ficha completa", exact: true }).click();
    await page.locator("#project-detail-title").waitFor();
    assert.equal(await page.locator("#project-detail-title").innerText(), expected.project.name, "La ficha debe pertenecer al punto vigente, no a la respuesta tardía");
  });

  if (failures.length) throw new AggregateError(failures, `${failures.length} pruebas de continuidad fallaron`);
  console.log(`UX continuity E2E OK: ${completed} casos; escenario real ${fixture.scenario.district_id}, ${fixture.firstPage.total} comparables.`);
} finally {
  await browser?.close();
  await viteServer?.close();
  await apiApp?.close();
}

async function runCase(name, run, viewport = { width: 1440, height: 900 }) {
  // Independent browser cases must not exhaust a shared minute's API rate budget.
  // Keep the real production rate limiter unchanged, with a fresh server per case.
  await restartApi();
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(12_000);
  const gates = [];
  const errors = [];
  const requests = [];
  const httpFailures = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  page.on("response", (response) => {
    if (response.status() >= 400) httpFailures.push({ status: response.status(), url: response.url() });
  });
  try {
    await run(page, gates);
    assert.deepEqual(errors, [], "No debe haber excepciones JavaScript sin manejar");
    assert.equal(requests.some((url) => !url.startsWith(`${baseUrl}/`)), false, "La prueba no debe depender de hosts externos");
    assert.equal(requests.some((url) => /demo-data|viva-platform-demo\.json/u.test(url)), false, "El navegador no debe descargar el snapshot");
    console.log(`PASS ${name}`);
    completed++;
  } catch (error) {
    failures.push(new Error(`${name}: ${error.message}`, { cause: error }));
    console.error(`FAIL ${name}: ${error.message}`);
    if (httpFailures.length) console.error(`HTTP ${name}: ${JSON.stringify(httpFailures)}`);
    if (errors.length) console.error(`JS ${name}: ${JSON.stringify(errors)}`);
    await page.screenshot({ path: path.join(outputDirectory, `${name}.png`), fullPage: true }).catch(() => {});
  } finally {
    gates.forEach((gate) => gate.release());
    await page.unrouteAll({ behavior: "wait" });
    await context.close();
  }
}

async function discoverScenario(request) {
  const bootstrap = await apiJson(request, "/bootstrap");
  for (const district of [...bootstrap.districts].sort((a, b) => b.projectCount - a.projectCount)) {
    const candidate = {
      ...bootstrap.initialScenario, district_id: district.id, scope_mode: "district", quadrant_id: null,
      center_latitude: null, center_longitude: null, radius_meters: null,
      typology: "all", bedrooms: "all", delivery_year: "all", target_area_m2: null, target_price_pen: null, source: "url",
    };
    const workspace = await apiJson(request, "/workspace/evaluate", { scenario: candidate });
    const scenario = workspace.scenario;
    const firstPage = await apiJson(request, "/projects/query", { scenario, page: 1, pageSize: 18, sort: "name" });
    if (firstPage.total <= 18) continue;
    const secondPage = await apiJson(request, "/projects/query", { scenario, page: 2, pageSize: 18, sort: "name" });
    assert.equal(firstPage.total, workspace.comparableProjectIds.length, "La consulta debe paginar el conjunto canónico antes de probar la UI");
    assert.ok(secondPage.items.length > 0, "El escenario de prueba debe tener una segunda página real");
    return { bootstrap, scenario, firstPage, secondPage };
  }
  throw new Error("Fixture insuficiente: se requiere un escenario distrital con más de 18 comparables reales. No se omiten las pruebas de paginación.");
}

async function apiJson(request, route, data) {
  const response = data === undefined
    ? await request.get(`${baseUrl}/api/v1${route}`)
    : await request.post(`${baseUrl}/api/v1${route}`, { data });
  assert.equal(response.status(), 200, `${route} no está listo; reconstruye API/contratos antes de ejecutar esta suite: ${await response.text()}`);
  return response.json();
}

function scenarioUrl(route) {
  const scenario = fixture.scenario;
  const query = new URLSearchParams({ sv: "1", district: scenario.district_id, scope: "district", typology: String(scenario.typology), bedrooms: String(scenario.bedrooms), delivery: String(scenario.delivery_year) });
  return `${baseUrl}/?${query}#${route}`;
}

async function openProjects(page) {
  await page.goto(scenarioUrl("projects"), { waitUntil: "networkidle" });
  await ready(page);
  await page.locator(".project-select-checkbox:not(:disabled)").first().waitFor();
  assert.deepEqual(await tableIds(page), canonicalIds(fixture.firstPage.items), "La tabla debe iniciar en la primera página del universo canónico");
}

async function ready(page) {
  // A hash update is observable before the browser dispatches hashchange. The
  // prior route can still have a heading and no spinner during that interval.
  await page.waitForFunction(() => {
    const expected = window.location.hash.startsWith("#journey/") ? "#journey/scale" : window.location.hash;
    return document.querySelector('.product-nav a[aria-current="page"]')?.getAttribute("href") === expected;
  });
  await page.locator(".page-header h1").waitFor();
  await page.locator(".busy").waitFor({ state: "detached" });
}

async function nextPage(page) {
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await page.locator(".pagination").getByText(/Página 2 de/u).waitFor();
  await ready(page);
}

async function navigate(page, hash) {
  await page.locator(`.product-nav a[href=${JSON.stringify(hash)}]`).click();
  await page.waitForURL((url) => url.hash === hash);
}

async function assertFocused(locator, message) {
  const deadline = Date.now() + 4_000;
  while (Date.now() < deadline) {
    if (await locator.evaluate((element) => element === document.activeElement)) return;
    await locator.page().evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  }
  assert.fail(message);
}

function canonicalId(id) { return id.startsWith("project:") ? id : `project:nexo-${id.replace(/^observed:nexo-/u, "")}`; }
function canonicalIds(items) { return items.map((item) => canonicalId(item.id)); }
async function tableIds(page) { return page.locator(".project-table [data-compare-id]").evaluateAll((inputs) => inputs.map((input) => input.dataset.compareId)); }
async function selectionIds(page) { return page.locator(".selection-chip [data-project-remove]").evaluateAll((buttons) => buttons.map((button) => button.dataset.projectRemove)); }
async function visibleCommandRoutes(page) { return page.locator("#command-dialog [data-command-option]:visible").evaluateAll((links) => links.map((link) => link.getAttribute("href"))); }
async function hasHorizontalOverflow(page) { return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1); }

async function fulfillUnavailable(route, message = "Fallo temporal controlado para validar recuperación.") {
  await route.fulfill({ status: 503, contentType: "application/json", json: { code: "API_UNAVAILABLE", message, requestId: "ux-continuity-controlled", details: [] } });
}

async function holdRequest(page, gates, matcher, matches, lateError = false) {
  let reportIntercepted;
  let release;
  let completed;
  const intercepted = new Promise((resolve) => { reportIntercepted = resolve; });
  const unlocked = new Promise((resolve) => { release = resolve; });
  const finished = new Promise((resolve) => { completed = resolve; });
  let claimed = false;
  const handler = async (route) => {
    if (claimed || !matches(route.request())) return route.continue();
    claimed = true;
    const response = lateError ? null : await route.fetch();
    reportIntercepted(route.request());
    await unlocked;
    if (lateError) await fulfillUnavailable(route, "Error tardío que ya no corresponde a la vista.");
    else await route.fulfill({ response });
    completed();
  };
  await page.route(matcher, handler);
  const gate = { intercepted, release, finished, matcher, handler };
  gates.push(gate);
  return gate;
}

async function releaseAndSettle(page, held) {
  held.release();
  await held.finished;
  await page.waitForLoadState("networkidle");
  await page.unroute(held.matcher, held.handler);
}

async function waitForHeld(held) {
  let timeout;
  try {
    await Promise.race([
      held.intercepted,
      new Promise((_resolve, reject) => { timeout = setTimeout(() => reject(new Error(`No se interceptó la solicitud esperada: ${held.matcher}`)), 12_000); }),
    ]);
  } finally { clearTimeout(timeout); }
}
