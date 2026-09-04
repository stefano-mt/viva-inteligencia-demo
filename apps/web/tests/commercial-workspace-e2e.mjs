import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createObservedPage,
  openPath,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";
import { resolveAppUrl } from "./helpers/app-url.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const claimsUrl = new URL("./fixtures/commercial-claims.json", import.meta.url);
const claimsSource = await fs.readFile(claimsUrl, "utf8");
const claimsFixture = JSON.parse(claimsSource);
const publicData = JSON.parse(
  await fs.readFile(new URL("../public/demo-data/viva-platform-demo.json", import.meta.url), "utf8"),
);
const ctFixtures = await Promise.all(
  ["a", "b", "c", "d", "e", "f", "g", "h", "i", "p"].map(async (id) =>
    JSON.parse(await fs.readFile(path.join(testDirectory, "e2e-scenarios", `ct-${id}-journey.json`), "utf8")),
  ),
);
const allPaths = claimsFixture.all_surfaces.map((route) => `/${route}`);
const coveredClaims = new Set();
const integrationGaps = [];

function cover(...ids) {
  for (const id of ids) coveredClaims.add(id);
}

function assertClean(observed, label) {
  assert.deepEqual(observed.problems, [], `${label}: errores de navegador\n${observed.problems.join("\n")}`);
  assert.deepEqual(observed.externalRequests, [], `${label}: solicitudes externas\n${observed.externalRequests.join("\n")}`);
}

async function visibleText(page, selector = "#main-content") {
  return page.locator(selector).innerText();
}

async function fulfillPayload(page, payload) {
  await page.route("**/demo-data/viva-platform-demo.json", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(payload),
    }),
  );
}

function legacyPayload(version) {
  const payload = structuredClone(publicData);
  payload.metadata.contract_version = version;
  if (["2.0.0", "2.1.0", "2.2.0", "2.3.0"].includes(version)) {
    delete payload.history;
    delete payload.assistant;
  }
  if (["2.0.0", "2.1.0", "2.2.0"].includes(version)) delete payload.benchmark;
  if (["2.0.0", "2.1.0"].includes(version)) delete payload.inspector;
  return payload;
}

async function assertGlobalFailure(page, baseUrl, relativePath, expectedPattern) {
  await page.goto(resolveAppUrl(baseUrl, relativePath), { waitUntil: "networkidle" });
  const error = page.locator(".error-box");
  await error.waitFor({ state: "visible" });
  assert.match(await error.innerText(), expectedPattern, `${relativePath}: mensaje global`);
  assert.equal(await page.locator("[data-view-root], [data-journey-stage]").count(), 0, `${relativePath}: sin contenido parcial`);
  if (await page.getByRole("button", { name: "Reintentar", exact: true }).count() !== 1) {
    integrationGaps.push(`${relativePath}: falta la acción Reintentar`);
  }
  assert.doesNotMatch(await page.locator("body").innerText(), /NaN|Infinity|∞/u);
}

await withDemoBrowser(async ({ browser, baseUrl }) => {
  const context = await browser.newContext({ viewport: viewports[1] });
  const observed = await createObservedPage(context, baseUrl);
  const page = observed.page;

  await openPath(page, baseUrl, "/#journey/scale");
  let text = await visibleText(page);
  assert.match(text, /184/u);
  assert.match(text, /30\s*\/\s*22\s*\/\s*5/u);
  cover("C01");

  await openPath(page, baseUrl, "/#journey/geography");
  text = await visibleText(page);
  assert.match(text, /90 observados/iu);
  assert.match(text, /85 comparables/iu);
  assert.match(text, /no reconciliados[^]*\b5\b/iu);
  assert.doesNotMatch(text, /5 fuera/iu);
  cover("C02");

  await openPath(page, baseUrl, "/?sv=1&area=80&price=650000#dashboard");
  text = await visibleText(page);
  assert.match(text, /simulado/iu);
  assert.match(text, /pairing certificado por unidad/iu);
  assert.match(text, /0 tienen pairing certificado/iu);
  assert.match(text, /no representan precios reales de cierre/iu);
  cover("C03", "C04");

  await page.locator("#scenario-editor-trigger").click();
  await page.locator("#top-district").selectOption("150140");
  assert.match(new URL(page.url()).search, /district=150140/u, "El escenario debe serializarse en la URL");
  await page.keyboard.press("Escape");
  await page.locator("#scenario-editor-trigger").click();
  await page.locator("#reset-scenario").click();
  await page.waitForFunction(() => window.location.hash === "#journey/scale");
  assert.equal(new URL(page.url()).search, "", "Reiniciar debe volver al escenario canónico");

  await openPath(page, baseUrl, "/#projects");
  const projectsConclusion = page.locator("[data-projects-conclusion]");
  assert.deepEqual(
    await projectsConclusion.evaluate((element) => ({
      comparable: element.dataset.comparableCount,
      eligible: element.dataset.eligiblePricePerM2,
    })),
    { comparable: "85", eligible: "0" },
  );
  text = await projectsConclusion.innerText();
  assert.match(text, /no vuelve utilizables todos sus campos/iu);
  cover("C04", "C05");

  await openPath(page, baseUrl, "/#inspector/case/f3-ct-g-pardo");
  text = await visibleText(page);
  for (const value of ["104.15", "53.37", "50.78"]) assert.match(text, new RegExp(value.replace(".", "\\."), "u"));
  assert.match(text, /excluid|no elegible/iu);
  cover("C06");

  await openPath(page, baseUrl, "/#market");
  const benchmark = page.locator("[data-commercial-benchmark-summary]");
  assert.deepEqual(
    await benchmark.evaluate((element) => ({
      raw: element.dataset.rawPublications,
      orientative: element.dataset.orientativeRatios,
      eligible: element.dataset.eligiblePairs,
    })),
    { raw: "69", orientative: "68", eligible: "0" },
  );
  text = await visibleText(page);
  assert.match(text, /muestra|usad|faltant|excluid/iu);
  assert.match(text, /orientativ/iu);
  assert.match(text, /no representa precios reales de cierre/iu);
  cover("C07", "C08");

  await openPath(page, baseUrl, "/#compare");
  for (let selected = 0; selected < 2; selected += 1) {
    await page.locator("details.comparison-selector").evaluate((element) => { element.open = true; });
    const before = await page.locator("[data-compare-remove]").count();
    await page.locator("[data-compare-toggle]:not(:checked):not(:disabled)").first().evaluate((element) => element.click());
    await page.waitForFunction((count) => document.querySelectorAll("[data-compare-remove]").length > count, before);
  }
  assert.equal(await page.locator("[data-comparison-status=ready]").count(), 1);
  assert.equal(await page.locator("[data-commercial-comparison-summary]").count(), 1);
  await page.locator("details.comparison-selector").evaluate((element) => { element.open = false; });
  const basis = page.locator("details.comparison-basis");
  await basis.locator(":scope > summary").click();
  assert.equal(await basis.locator(".comparison-basis__references").count(), 1);
  cover("C10");
  while (await page.locator("[data-compare-remove]").count()) {
    await page.locator("[data-compare-remove]").first().click();
  }
  assert.equal(await page.locator("[data-comparison-status=insufficient]").count(), 1);
  assert.equal(await page.locator("[data-commercial-comparison-summary]").count(), 0);
  assert.equal(await page.getByText("Seleccionar proyectos", { exact: true }).count(), 1);
  cover("C09");

  await openPath(page, baseUrl, "/#activity");
  const firstSignal = page.locator(".history-ledger [data-history-row]").first();
  text = await firstSignal.innerText();
  assert.match(text, /Anterior[\s\S]*Nuevo/iu);
  assert.match(text, /causa no fue observada/iu);
  assert.match(text, /\d{1,2}\s+[a-z]{3,}\.?\s+20\d{2}/iu);
  assert.match(text, /En seguimiento|vigente|por vencer|vencida/iu);
  cover("C11");

  await openPath(page, baseUrl, "/#assistant");
  await page.locator(".assistant-question").first().click();
  await page.locator("#assistant-input").press("Control+Enter");
  await page.locator("[data-assistant-response=ready]").waitFor();
  assert.equal(await page.locator("[data-assistant-block=answer]").count(), 1);
  assert.equal(await page.locator("[data-assistant-block=limitations]").count(), 1);
  const referenceDisclosure = page.locator("details.assistant-evidence-disclosure");
  assert.equal(await referenceDisclosure.count(), 1);
  await referenceDisclosure.locator(":scope > summary").click();
  assert.ok(await page.locator("[data-assistant-block=references]").innerText());
  cover("C12", "C13");
  const input = page.locator("#assistant-input");
  await input.fill("¿Cuál es el precio real de cierre del competidor?");
  await input.press("Control+Enter");
  await page.locator("[data-assistant-response=refused]").waitFor();
  assert.match(await page.locator("[data-assistant-block=limitations]").innerText(), /precio real de cierre/iu);
  assert.equal(await page.locator("[data-assistant-block=next_step]").count(), 1);
  assert.doesNotMatch(await visibleText(page), /S\/\s*[\d,.]+[^\n]*cierre/iu);
  cover("C22");

  await openPath(page, baseUrl, "/#trust");
  text = await visibleText(page);
  assert.match(text, /Avance bloqueado/iu);
  assert.match(text, /Condición de salida/iu);
  assert.match(text, /BLOQUEADO[\s\S]*Próximo paso/iu);
  assert.doesNotMatch(text, /certificad[oa] para campa[ñn]a/iu);
  cover("C14");

  await page.locator("#command-menu-trigger").click();
  await page.locator("#command-menu-input").fill("panorama");
  await page.locator('[data-command-destination="dashboard"]').click();
  await page.waitForFunction(() => window.location.hash === "#dashboard");
  await page.waitForFunction(() => !document.getElementById("command-menu-dialog"));
  assert.equal(await page.locator("#command-menu-dialog").count(), 0, "La paleta debe cerrar tras navegar");
  assert.deepEqual(
    await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) })),
    { local: [], session: [] },
    "La demo no persiste escenario, consultas ni preferencias",
  );
  assert.ok(observed.requests.every(({ method }) => ["GET", "HEAD"].includes(method)), "Solo se permiten lecturas locales");
  assertClean(observed, "workspace 2.4");
  await context.close();

  for (const fixture of ctFixtures) {
    const ctContext = await browser.newContext({ viewport: viewports[1] });
    const ctObserved = await createObservedPage(ctContext, baseUrl);
    await openPath(ctObserved.page, baseUrl, fixture.scenario_path);
    assert.equal(
      await ctObserved.page.locator(`[data-journey-stage="${fixture.stage_id}"]`).getAttribute("data-journey-state"),
      fixture.expected.public_stage_status,
      `${fixture.case_id}: estado visible`,
    );
    assertClean(ctObserved, fixture.case_id);
    await ctContext.close();
  }

  for (const [version, stage, claimId, action] of [
    ["2.1.0", "quality", "C16", "Volver a geografía"],
    ["2.2.0", "depth", "C17", "Revisar benchmark"],
    ["2.3.0", "movement", "C18", "Volver a profundidad"],
  ]) {
    const legacyContext = await browser.newContext({ viewport: viewports[1] });
    const legacyObserved = await createObservedPage(legacyContext, baseUrl);
    await fulfillPayload(legacyObserved.page, legacyPayload(version));
    await openPath(legacyObserved.page, baseUrl, `/#journey/${stage}`);
    const root = legacyObserved.page.locator(`[data-journey-stage="${stage}"]`);
    assert.equal(await root.getAttribute("data-journey-state"), "capability_unavailable");
    assert.match(await root.innerText(), new RegExp(version.replace(".", "\\."), "u"));
    assert.equal((await root.locator(".journey-primary-action").innerText()).trim(), action);
    assertClean(legacyObserved, `contract ${version}`);
    cover(claimId);
    await legacyContext.close();
  }

  const decisionContext = await browser.newContext({ viewport: viewports[1] });
  const decisionObserved = await createObservedPage(decisionContext, baseUrl);
  await openPath(decisionObserved.page, baseUrl, "/#journey/decision");
  const decisionRoot = decisionObserved.page.locator('[data-journey-stage="decision"]');
  assert.match(await decisionRoot.innerText(), /lista de verificaci[oó]n|checklist/iu);
  assert.equal((await decisionRoot.locator(".journey-primary-action").innerText()).trim(), "Formular consulta en el asistente");
  assert.equal(await decisionObserved.page.locator("[data-assistant-response]").count(), 0);
  assertClean(decisionObserved, "decision without response");
  cover("C19");
  await decisionContext.close();

  const missingPayload = structuredClone(publicData);
  delete missingPayload.metadata.counts.canonical_agencies;
  delete missingPayload.pilot.counts.base_count;
  const missingContext = await browser.newContext({ viewport: viewports[1] });
  const missingObserved = await createObservedPage(missingContext, baseUrl);
  await fulfillPayload(missingObserved.page, missingPayload);
  await openPath(missingObserved.page, baseUrl, "/#journey/scale");
  text = await visibleText(missingObserved.page);
  assert.match(text, /No disponible\s*\/\s*22\s*\/\s*5/u);
  assert.doesNotMatch(text, /\b0\s*\/\s*22\s*\/\s*5|NaN|Infinity|∞/u);
  assertClean(missingObserved, "missing scale counts");
  cover("C20");
  await missingContext.close();

  const emptyContext = await browser.newContext({ viewport: viewports[1] });
  const emptyObserved = await createObservedPage(emptyContext, baseUrl);
  await openPath(emptyObserved.page, baseUrl, "/?sv=1&scope=radius&lat=-12.000000&lon=-77.000000&radius=500#journey/geography");
  const emptyRoot = emptyObserved.page.locator('[data-journey-stage="geography"]');
  assert.equal(await emptyRoot.getAttribute("data-journey-state"), "empty");
  assert.equal((await emptyRoot.locator(".journey-primary-action").innerText()).trim(), "Ajustar escenario");
  assert.doesNotMatch(await emptyRoot.innerText(), /capability unavailable|error/iu);
  assertClean(emptyObserved, "empty geography");
  cover("C21");
  await emptyContext.close();

  const contractContext = await browser.newContext({ viewport: viewports[1] });
  const contractObserved = await createObservedPage(contractContext, baseUrl);
  await fulfillPayload(contractObserved.page, legacyPayload("2.0.0"));
  for (const relativePath of allPaths) {
    await assertGlobalFailure(contractObserved.page, baseUrl, relativePath, /contrato|2\.1\.0.*2\.4\.0/iu);
  }
  assertClean(contractObserved, "contract 2.0 all surfaces");
  cover("C15");
  await contractContext.close();

  const fetchContext = await browser.newContext({ viewport: viewports[1] });
  const fetchObserved = await createObservedPage(fetchContext, baseUrl);
  await fetchObserved.page.route("**/demo-data/viva-platform-demo.json", (route) =>
    route.fulfill({ status: 500, contentType: "application/json; charset=utf-8", body: '{"error":"controlled"}' }),
  );
  for (const relativePath of allPaths) {
    await assertGlobalFailure(fetchObserved.page, baseUrl, relativePath, /No se pudo iniciar la plataforma/iu);
  }
  assert.ok(
    fetchObserved.problems.length > 0,
    "El fallo 500 controlado debe quedar observado",
  );
  assert.ok(
    fetchObserved.problems.every((problem) => /http 500|Failed to load resource/iu.test(problem)),
    `Solo se admiten los errores 500 provocados por CT-C23:\n${fetchObserved.problems.join("\n")}`,
  );
  assert.deepEqual(fetchObserved.externalRequests, [], "CT-C23 no puede solicitar red externa");
  cover("C23");
  await fetchContext.close();

  const retryContext = await browser.newContext({ viewport: viewports[1] });
  const retryObserved = await createObservedPage(retryContext, baseUrl);
  let dataRequests = 0;
  await retryObserved.page.route("**/demo-data/viva-platform-demo.json", (route) => {
    dataRequests += 1;
    if (dataRequests === 1) {
      return route.fulfill({
        status: 500,
        contentType: "application/json; charset=utf-8",
        body: '{"error":"controlled"}',
      });
    }
    return route.continue();
  });
  await retryObserved.page.goto(resolveAppUrl(baseUrl, "/#dashboard"), { waitUntil: "networkidle" });
  await retryObserved.page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await retryObserved.page.locator('[data-view="dashboard"][aria-current="page"]').waitFor();
  assert.equal(new URL(retryObserved.page.url()).hash, "#dashboard", "Reintentar conserva el deep-link actual");
  assert.ok(dataRequests >= 2, "Reintentar debe solicitar nuevamente el dataset local");
  assert.deepEqual(retryObserved.externalRequests, [], "Reintentar no puede usar red externa");
  await retryContext.close();
}, { port: 4212 });

assert.deepEqual(
  [...coveredClaims].sort(),
  claimsFixture.claims.map(({ id }) => id).sort(),
  "La ejecución debe cubrir exactamente C01–C23",
);
assert.equal(await fs.readFile(claimsUrl, "utf8"), claimsSource, "El fixture C01–C23 debe permanecer read-only");
assert.deepEqual(integrationGaps, [], `Gaps C01–C23:\n${integrationGaps.join("\n")}`);

console.log("Commercial workspace E2E OK: C01–C23, 6+8 rutas, CT-A–I/P, 2.0–2.4, escenario, reset, paleta, privacidad y fallos globales verificados.");
