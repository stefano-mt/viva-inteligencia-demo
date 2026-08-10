import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  initializeScenarioData,
  state,
} from "../public/js/state.js";
import {
  buildComparisonViewModel,
  renderCompare,
} from "../public/js/views/compare.js";
import {
  createObservedPage,
  openPath,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";

const data = JSON.parse(
  await fs.readFile(
    new URL("../public/demo-data/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const validArtifact = {
  status: "valid",
  geojson: { type: "FeatureCollection", features: [] },
  url: "demo-data/district-boundaries.geojson",
  expected_sha256: data.geography.boundary_artifact_sha256,
  actual_sha256: data.geography.boundary_artifact_sha256,
  reason: null,
};

initializeScenarioData(data, { geographyArtifact: validArtifact });

const benchmarkReference = state.benchmarkContext;
const benchmarkSnapshot = JSON.stringify(benchmarkReference);
const comparisonModel = buildComparisonViewModel();
const readyHtml = renderCompare();
const marketSelectionCount = comparisonModel.selected.filter(
  ({ simulated }) => !simulated,
).length;
const pricePerM2 = benchmarkReference.quantitative.pricePerM2Total;

assert.strictEqual(
  state.benchmarkContext,
  benchmarkReference,
  "La vista debe reutilizar el benchmarkContext vigente",
);
assert.equal(
  JSON.stringify(state.benchmarkContext),
  benchmarkSnapshot,
  "La vista no debe mutar ni recomputar el benchmark autoritativo",
);
assert.equal(comparisonModel.status, "ready");
assert.match(readyHtml, /data-comparison-denominators/u);
assert.match(
  readyHtml,
  new RegExp(`data-scope-projects="${benchmarkReference.scope.projectCount}"`, "u"),
);
assert.match(
  readyHtml,
  new RegExp(`data-selected-projects="${marketSelectionCount}"`, "u"),
);
assert.match(
  readyHtml,
  new RegExp(`data-eligible-price-pairs="${pricePerM2.n}"`, "u"),
);
assert.match(
  readyHtml,
  new RegExp(
    `data-orientative-price-ratios="${pricePerM2.orientative.n}"`,
    "u",
  ),
);
assert.match(readyHtml, /Estos conteos describen universos distintos y no se suman/u);
assert.match(readyHtml, /<dt>Fuente<\/dt>/u);
assert.match(readyHtml, /<dt>Estado de evidencia<\/dt>/u);
assert.match(readyHtml, /href="#journey\/movement">Revisar movimiento/u);
assert.ok(
  readyHtml.indexOf("comparison-conclusion") <
    readyHtml.indexOf("comparison-command"),
  "La conclusión comercial debe aparecer antes de los controles de detalle",
);
assert.ok(
  readyHtml.indexOf("comparison-conclusion") <
    readyHtml.indexOf("comparison-matrix"),
  "La conclusión comercial debe aparecer antes de la matriz",
);
assert.doesNotMatch(readyHtml, /NaN|Infinity/u);

const initialSelection = [...state.compareProjectIds];
state.compareProjectIds = [];
const insufficientHtml = renderCompare();
assert.match(insufficientHtml, /Seleccionar proyectos/u);
assert.doesNotMatch(insufficientHtml, /comparison-next-action/u);
assert.doesNotMatch(insufficientHtml, /NaN|Infinity/u);
state.compareProjectIds = initialSelection;

const unavailableModel = buildComparisonViewModel({
  benchmarkContext: { status: "contract_unavailable" },
  selectedProjectIds: initialSelection,
});
assert.equal(unavailableModel.status, "contract_unavailable");
assert.deepEqual(unavailableModel.groups, []);

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of [viewports[1], viewports[2]]) {
    const context = await browser.newContext({ viewport });
    const { page, problems, externalRequests } = await createObservedPage(
      context,
      baseUrl,
    );
    await openPath(
      page,
      baseUrl,
      "/?sv=1&scope=district&district=150122#compare",
    );

    const basis = page.locator("[data-comparison-denominators]");
    await basis.waitFor({ state: "visible" });
    assert.equal(
      await basis.getAttribute("data-scope-projects"),
      String(state.benchmarkContext.scope.projectCount),
    );
    await basis.locator(":scope > summary").click();
    const ledgerColumns = await basis
      .locator(".comparison-basis__ledger")
      .evaluate((element) =>
        getComputedStyle(element).gridTemplateColumns.split(" ").length,
      );
    assert.equal(ledgerColumns, viewport.width < 760 ? 1 : 3);

    const conclusionTop = await page
      .locator(".comparison-conclusion")
      .evaluate((element) => element.getBoundingClientRect().top);
    const commandTop = await page
      .locator(".comparison-command")
      .evaluate((element) => element.getBoundingClientRect().top);
    assert.ok(
      conclusionTop < commandTop,
      `${viewport.name}: la conclusión debe preceder los controles de detalle`,
    );
    assert.equal(await page.locator(".comparison-next-action").count(), 1);
    assert.equal(
      await page.locator(".comparison-shell .primary-button").count(),
      1,
      `${viewport.name}: una sola acción primaria`,
    );

    const evidence = page.locator("details.comparison-evidence").first();
    const evidenceSummary = evidence.locator(":scope > summary");
    await evidenceSummary.focus();
    await page.keyboard.press("Enter");
    assert.equal(await evidence.getAttribute("open"), "");
    assert.equal(await evidence.locator("dt", { hasText: "Fuente" }).count(), 1);
    assert.equal(
      await evidence.locator("dt", { hasText: "Estado de evidencia" }).count(),
      1,
    );

    const searchBefore = new URL(page.url()).search;
    await page.locator(".comparison-next-action").click();
    await page.waitForFunction(() => window.location.hash === "#journey/movement");
    assert.equal(new URL(page.url()).search, searchBefore);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    assert.ok(overflow <= 1, `${viewport.name}: overflow horizontal ${overflow}px`);
    assert.deepEqual(problems, [], `${viewport.name}: ${problems.join("\n")}`);
    assert.deepEqual(
      externalRequests,
      [],
      `${viewport.name}: red externa ${externalRequests.join("\n")}`,
    );
    await context.close();
  }
}, { port: 4358 });

console.log(
  "Journey depth OK: conclusion-first, denominators, references, movement handoff, responsive and keyboard verified.",
);
