import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  createObservedPage,
  observePage,
  openPath,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";

const publicData = JSON.parse(
  await fs.readFile(
    new URL("../public/demo-data/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const ctG = JSON.parse(
  await fs.readFile(new URL("./e2e-scenarios/ct-g-benchmark.json", import.meta.url), "utf8"),
);
const targetComparePath = "/?sv=1&area=80&price=650000#compare";

function assertClean(problems, externalRequests, label) {
  assert.deepEqual(
    problems,
    [],
    `Errores de consola, página, red o HTTP durante ${label}:\n${problems.join("\n")}`,
  );
  assert.deepEqual(
    externalRequests,
    [],
    `Solicitudes externas durante ${label}:\n${externalRequests.join("\n")}`,
  );
}

async function waitForMarketCount(page, count) {
  await page.waitForFunction(
    (expected) =>
      document.querySelector(".comparison-hero__status strong")?.textContent?.trim() ===
      `${expected}/3`,
    count,
  );
}

async function createFixturePage(context, baseUrl, data) {
  const page = await context.newPage();
  const problems = observePage(page);
  const externalRequests = [];
  const allowed = new URL(baseUrl);
  await page.route("**/*", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    if (
      ["http:", "https:"].includes(requestUrl.protocol) &&
      requestUrl.origin !== allowed.origin
    ) {
      externalRequests.push(`${request.method()} ${request.url()}`);
      await route.abort("blockedbyclient");
      return;
    }
    if (requestUrl.pathname.endsWith("/demo-data/viva-platform-demo.json")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify(data),
      });
      return;
    }
    await route.continue();
  });
  return { page, problems, externalRequests };
}

await withDemoBrowser(async ({ browser, baseUrl }) => {
  const context = await browser.newContext({ viewport: viewports[0] });
  const observed = await createObservedPage(context, baseUrl);
  const { page } = observed;
  await openPath(page, baseUrl, "/#compare");

  assert.equal(await page.locator("h1").first().textContent(), "Comparador comercial");
  assert.equal(await page.locator('[data-comparison-status="ready"]').count(), 1);
  assert.equal(await page.locator("[data-comparison-group]").count(), 9);
  assert.equal(await page.locator("[data-comparison-row]").count(), 10);
  assert.equal(await page.locator(".comparison-chip:not(.is-target)").count(), 3);
  const territorialPriceText = await page
    .locator(".scenario-summary")
    .textContent();
  assert.match(territorialPriceText, /Referencia de precio no demostrada/u);
  assert.match(
    territorialPriceText,
    /69 publicaciones declaran precio y área total; no prueban que ambos valores pertenezcan a la misma oferta/u,
  );
  assert.doesNotMatch(
    territorialPriceText,
    /Referencia de precio lista|precios publicados compatibles/iu,
    "El shell no debe contradecir la conclusión de precio no elegible",
  );
  assert.match(
    await page.locator(".comparison-conclusion").innerText(),
    /No hay precio por m² elegible para posicionamiento/u,
  );
  assert.ok(
    (await page.locator(".comparison-findings > li").count()) <= 3,
    "La conclusión nunca debe superar tres hallazgos",
  );
  assert.ok(
    (await page.locator(".comparison-cell.is-unknown").count()) > 0,
    "No informado debe conservarse como estado explícito",
  );

  const firstRemove = page.locator("[data-compare-remove]").first();
  await firstRemove.click();
  await waitForMarketCount(page, 2);
  assert.equal(await page.locator(".comparison-chip:not(.is-target)").count(), 2);
  assert.equal(
    await page.locator('[data-comparison-status="ready"]').count(),
    1,
    "Dos proyectos deben mantener el comparador listo",
  );
  assert.match(await page.locator("#scenario-live").textContent(), /se quitó de la comparación/u);

  const selector = page.locator("details.comparison-selector");
  const selectorSummary = selector.locator(":scope > summary");
  await selectorSummary.click();
  const query = page.locator("#compare-query");
  await query.fill("Pardo Coast");
  assert.match(await page.locator("#scenario-live").textContent(), /1 proyecto coincide/u);
  const pardoToggle = page.locator(
    `[data-compare-toggle][value="${ctG.input.project_id}"]`,
  );
  assert.equal(await pardoToggle.count(), 1, "CT-G debe permanecer seleccionable territorialmente");
  await pardoToggle.check();
  await waitForMarketCount(page, 3);
  assert.equal(await selector.getAttribute("open"), "", "Añadir un proyecto debe conservar abierto el selector");
  assert.equal(
    await page.locator(`[data-compare-remove="${ctG.input.project_id}"]`).count(),
    1,
    "Pardo Coast debe entrar como proyecto, no como tipología certificada",
  );

  await page.keyboard.press("Escape");
  assert.equal(await selector.getAttribute("open"), null, "Escape debe cerrar el selector");
  assert.equal(
    await selectorSummary.evaluate((element) => document.activeElement === element),
    true,
    "Escape debe devolver foco al summary",
  );

  const pardoCells = page.locator(`[data-project-id="${ctG.input.project_id}"]`);
  assert.ok(await pardoCells.count(), "CT-G debe conservar una columna territorial visible");
  const pardoCellStates = await pardoCells.evaluateAll((cells) =>
    cells.map((cell) => ({ className: cell.className, text: cell.textContent?.trim() })),
  );
  assert.equal(
    pardoCellStates.slice(0, 4).every(({ className }) => className.includes("is-unknown")),
    true,
    "Precio y áreas CT-G deben quedar ocultos como no informados, nunca certificados",
  );
  assert.doesNotMatch(
    pardoCellStates.map(({ text }) => text).join(" "),
    /104[.,]15|53[.,]37/u,
    "El comparador no debe elegir ninguno de los dos valores incompatibles de CT-G",
  );
  const pardoInspector = page.locator(
    `[data-project-id="${ctG.input.project_id}"] a[href="${ctG.expected.inspector_path}"]`,
  );
  assert.ok(await pardoInspector.count(), "CT-G debe ofrecer enlace al inspector autorizado");
  assert.doesNotMatch(
    await page.locator("#main-content").innerHTML(),
    /AppData\\Local|[A-F]:\\|restricted-secret|sha256.{0,30}[a-f0-9]{32}/iu,
    "El comparador no debe filtrar rutas locales, secretos o hashes completos",
  );

  const conclusionLinks = page.locator(".comparison-findings [data-comparison-row-target]");
  if (await conclusionLinks.count()) {
    const targetRowId = await conclusionLinks.first().getAttribute("data-comparison-row-target");
    await conclusionLinks.first().click();
    const targetRow = page.locator(`[data-comparison-row="${targetRowId}"]`);
    assert.equal(
      await targetRow.evaluate((element) => document.activeElement === element),
      true,
      "La conclusión debe enfocar la fila que sustenta el hallazgo",
    );
    assert.equal(await targetRow.locator("xpath=ancestor::details[1]").getAttribute("open"), "");
    assert.match(await page.locator("#scenario-live").textContent(), /Criterio .+ evidencia/u);
  }

  assertClean(observed.problems, observed.externalRequests, "comparador 2/3 y CT-G");
  await context.close();

  const targetContext = await browser.newContext({ viewport: viewports[0] });
  const targetObserved = await createObservedPage(targetContext, baseUrl);
  await openPath(targetObserved.page, baseUrl, targetComparePath);
  assert.equal(
    await targetObserved.page.locator(".comparison-target-action").textContent(),
    "Incluir escenario Viva",
  );
  await targetObserved.page.locator(".comparison-target-action").click();
  assert.equal(await targetObserved.page.locator(".comparison-chip.is-target").count(), 1);
  assert.equal(await targetObserved.page.locator(".comparison-cell.is-viva-target").count(), 10);
  assert.equal(
    await targetObserved.page.locator(".comparison-target-action").getAttribute("aria-pressed"),
    "true",
  );
  assert.match(
    await targetObserved.page.locator("#scenario-live").textContent(),
    /Escenario Viva incluido/u,
  );

  await targetObserved.page.locator(".comparison-chip.is-target [data-compare-target-toggle]").click();
  assert.equal(await targetObserved.page.locator(".comparison-chip.is-target").count(), 0);
  assert.equal(
    await targetObserved.page.locator(".comparison-target-action").textContent(),
    "Incluir escenario Viva",
  );
  const deepLinkBeforeReload = new URL(targetObserved.page.url());
  await targetObserved.page.reload({ waitUntil: "networkidle" });
  await targetObserved.page.locator("#main-content").waitFor({ state: "visible" });
  const deepLinkAfterReload = new URL(targetObserved.page.url());
  assert.equal(deepLinkAfterReload.hash, "#compare");
  assert.equal(deepLinkAfterReload.search, deepLinkBeforeReload.search);
  assert.equal(await targetObserved.page.locator(".comparison-target-action").count(), 1);
  assertClean(
    targetObserved.problems,
    targetObserved.externalRequests,
    "comparador 3 + Viva y reload",
  );
  await targetContext.close();

  for (const [status, data] of [
    [
      "contract_unavailable",
      { ...structuredClone(publicData), metadata: { ...publicData.metadata, contract_version: "2.2.0" } },
    ],
    [
      "error",
      { ...structuredClone(publicData), benchmark: { ...publicData.benchmark, version: 99 } },
    ],
  ]) {
    const fixtureContext = await browser.newContext({ viewport: viewports[0] });
    const fixtureObserved = await createFixturePage(fixtureContext, baseUrl, data);
    await openPath(fixtureObserved.page, baseUrl, "/#compare");
    assert.equal(
      await fixtureObserved.page.locator(`[data-comparison-status="${status}"]`).count(),
      1,
      `El comparador debe degradar a ${status}`,
    );
    assert.equal(
      await fixtureObserved.page.locator("[data-comparison-row]").count(),
      0,
      `${status} no debe renderizar una matriz parcial`,
    );
    assertClean(fixtureObserved.problems, fixtureObserved.externalRequests, `comparador ${status}`);
    await fixtureContext.close();
  }
});

console.log(
  "Comparison E2E OK: 2/3/3+Viva, CT-G, unknown, evidencia, foco, Escape, deep-link/reload, legacy/error y red cerrada.",
);
