import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  dispatchScenario,
  initializeScenarioData,
  state,
} from "../public/js/state.js";
import { renderDashboard } from "../public/js/views/dashboard.js";
import { renderJourney } from "../public/js/views/journey.js";
import {
  createObservedPage,
  openPath,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";

const data = JSON.parse(
  await fs.readFile(
    new URL("../../../data/generated/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const claimsSource = await fs.readFile(
  new URL("./fixtures/commercial-claims.json", import.meta.url),
  "utf8",
);
const claimsFixture = JSON.parse(claimsSource);
const requiredClaimIds = new Set([
  "C01",
  "C02",
  "C03",
  "C04",
  "C15",
  "C16",
  "C17",
  "C18",
  "C19",
  "C20",
  "C21",
  "C22",
  "C23",
]);
const presentClaimIds = new Set(
  claimsFixture.claims
    .filter(({ id }) => requiredClaimIds.has(id))
    .map(({ id }) => id),
);
assert.deepEqual(presentClaimIds, requiredClaimIds, "El contrato C01–C04/C15–C23 debe permanecer completo");

initializeScenarioData(data, {
  geographyArtifact: {
    status: "valid",
    geojson: { type: "FeatureCollection", features: [] },
    expected_sha256: data.geography.boundary_artifact_sha256,
    actual_sha256: data.geography.boundary_artifact_sha256,
  },
});

for (const stageId of [
  "scale",
  "geography",
  "quality",
  "depth",
  "movement",
  "decision",
]) {
  const html = renderJourney({
    stageId,
    stageModel: state.journeyContext.stages[stageId],
  });
  assert.equal((html.match(/<h1\b/gu) ?? []).length, 1, `${stageId}: un h1`);
  assert.equal((html.match(/journey-primary-action/gu) ?? []).length, 1, `${stageId}: una acción primaria`);
  assert.match(html, /decision-line/u, `${stageId}: lectura principal compacta`);
  assert.match(html, /journey-reading__limit/u, `${stageId}: límite visible`);
  assert.match(html, /Profundizar esta lectura/u, `${stageId}: detalle bajo demanda`);
  assert.doesNotMatch(html, /<details class="journey-expert[^>]*\sopen(?:\s|>)/u, `${stageId}: detalle experto cerrado`);
  assert.doesNotMatch(html, /NaN|Infinity|-Infinity/u);
}

const scaleHtml = renderJourney({
  stageId: "scale",
  stageModel: state.journeyContext.stages.scale,
});
for (const value of ["184", "30 / 22 / 5"]) assert.match(scaleHtml, new RegExp(value.replaceAll("/", "\\/"), "u"));
assert.match(scaleHtml, /niveles anidados y no se suman/iu);

const geographyHtml = renderJourney({
  stageId: "geography",
  stageModel: state.journeyContext.stages.geography,
});
for (const value of ["90 observados", "85 comparables", "5"]) assert.match(geographyHtml, new RegExp(value, "u"));
assert.match(geographyHtml, /No reconciliados o por revisar/u);
assert.doesNotMatch(geographyHtml, /fuera del (?:distrito|polígono)/iu);

dispatchScenario({
  type: "APPLY_PRODUCT_FILTERS",
  patch: {
    target_area_m2: 80,
    target_price_pen: 720000,
  },
});
const dashboardHtml = renderDashboard();
assert.match(dashboardHtml, /data-radar-summary/u);
assert.match(dashboardHtml, /data-published-price-area="69"/u);
assert.match(dashboardHtml, /data-eligible-price-per-m2="0"/u);
assert.match(dashboardHtml, /Escenario Viva · simulado/u);
assert.match(
  dashboardHtml.match(/<p class="decision-line__reading"[^>]*>([\s\S]*?)<\/p>/u)?.[1] ?? "",
  /precio Viva simulado/iu,
  "C03: el escenario con precio y área llega a la conclusión visible",
);
assert.match(dashboardHtml, /no representan precios reales de cierre/iu);
assert.match(dashboardHtml, /pairing certificado por unidad/iu);
assert.equal((dashboardHtml.match(/class="metric-pair"/gu) ?? []).length, 3);
assert.ok(dashboardHtml.indexOf("radar-primary") < dashboardHtml.indexOf("radar-priority"), "El mapa precede la lista prioritaria");
assert.ok(dashboardHtml.indexOf("radar-priority") < dashboardHtml.indexOf("radar-simulation"), "La lista precede la simulación");
assert.doesNotMatch(dashboardHtml, /<details class="radar-(?:simulation|deep-dive)[^>]*\sopen(?:\s|>)/u);
assert.equal(await fs.readFile(new URL("./fixtures/commercial-claims.json", import.meta.url), "utf8"), claimsSource, "El fixture de claims es read-only");

const evidenceDir = process.env.EVIDENCE_DIR
  ? path.resolve(process.env.EVIDENCE_DIR)
  : null;
if (evidenceDir) await fs.mkdir(evidenceDir, { recursive: true });

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const observed = await createObservedPage(context, baseUrl);
    const { page, problems, externalRequests } = observed;

    await openPath(page, baseUrl, "/#journey/scale");
    await page.locator("[data-journey-stage=\"scale\"]").waitFor();
    assert.equal(await page.locator(".journey-facts .metric-pair").count(), 3, `${viewport.name}: tres pares de respaldo`);
    assert.equal(await page.locator(".journey-expert:not([open])").count(), 1, `${viewport.name}: detalle experto cerrado`);
    const limitBox = await page.locator(".journey-reading__limit").boundingBox();
    const actionBox = await page.locator(".journey-primary-action").boundingBox();
    if (viewport.name === "laptop") {
      assert.ok(limitBox && limitBox.y + limitBox.height <= viewport.height, "Laptop: límite en primera pantalla");
      assert.ok(actionBox && actionBox.y + actionBox.height <= viewport.height, "Laptop: acción en primera pantalla");
    }
    if (evidenceDir) {
      await page.screenshot({
        path: path.join(evidenceDir, `p7-04-journey-${viewport.name}.png`),
        fullPage: true,
      });
    }
    await page.locator(".journey-expert > summary").focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(".journey-expert[open]").count(), 1, `${viewport.name}: detalle operable por teclado`);
    assert.ok(await page.locator("[data-journey-expert]").count() >= 1);

    await openPath(page, baseUrl, "/#dashboard");
    await page.locator("[data-radar-summary]").waitFor();
    assert.equal(await page.locator(".radar-metrics .metric-pair").count(), 3, `${viewport.name}: máximo tres métricas`);
    assert.equal(await page.locator(".radar-simulation:not([open])").count(), 1);
    assert.equal(await page.locator(".radar-deep-dive:not([open])").count(), 1);
    const mapBox = await page.locator(".radar-primary").boundingBox();
    const priorityBox = await page.locator(".radar-priority").boundingBox();
    const summaryBox = await page.locator("[data-radar-summary]").boundingBox();
    assert.ok(summaryBox && mapBox && summaryBox.y < mapBox.y, `${viewport.name}: lectura antes del mapa`);
    assert.ok(mapBox && priorityBox && mapBox.y < priorityBox.y, `${viewport.name}: mapa antes del detalle`);
    assert.ok(mapBox && mapBox.y < viewport.height, `${viewport.name}: inicio del mapa visible`);
    if (evidenceDir) {
      await page.screenshot({
        path: path.join(evidenceDir, `p7-04-panorama-${viewport.name}.png`),
        fullPage: true,
      });
    }
    await page.locator(".radar-simulation > summary").focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(".radar-simulation[open]").count(), 1);
    assert.equal(await page.locator("#scenario-product-form").isVisible(), true);
    const geometry = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    assert.ok(geometry.documentWidth <= geometry.viewportWidth + 1, `${viewport.name}: sin overflow horizontal`);

    if (evidenceDir) {
      await page.screenshot({
        path: path.join(evidenceDir, `p7-04-simulation-${viewport.name}.png`),
        fullPage: true,
      });
    }
    assert.deepEqual(problems, [], `${viewport.name}: errores de navegador\n${problems.join("\n")}`);
    assert.deepEqual(externalRequests, [], `${viewport.name}: red externa\n${externalRequests.join("\n")}`);
    await context.close();
  }
}, { port: 4204 });

console.log("Commercial journey/dashboard OK: six stages, territorial reading, three metrics, map-first flow, disclosures, claims and responsive keyboard behavior verified.");
