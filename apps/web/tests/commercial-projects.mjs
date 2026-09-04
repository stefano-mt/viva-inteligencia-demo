import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  initializeScenarioData,
  state,
} from "../public/js/state.js";
import {
  buildProjectCatalogModel,
  renderProjects,
} from "../public/js/views/projects.js";
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
const claimsSource = await fs.readFile(
  new URL("./fixtures/commercial-claims.json", import.meta.url),
  "utf8",
);
const claimsFixture = JSON.parse(claimsSource);
const requiredClaimIds = new Set([
  "C04",
  "C05",
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
assert.deepEqual(
  new Set(
    claimsFixture.claims
      .filter(({ id }) => requiredClaimIds.has(id))
      .map(({ id }) => id),
  ),
  requiredClaimIds,
  "El contrato C04–C05/C15–C23 debe permanecer completo",
);

const geographyArtifact = {
  status: "valid",
  geojson: { type: "FeatureCollection", features: [] },
  expected_sha256: data.geography.boundary_artifact_sha256,
  actual_sha256: data.geography.boundary_artifact_sha256,
};
initializeScenarioData(data, { geographyArtifact });

const catalog = buildProjectCatalogModel({
  projects: data.projects,
  scenarioContext: state.scenarioContext,
  filters: { phase: "Todos", query: "", sort: "direct" },
  limit: 18,
  selectedProjectId: null,
  eligiblePricePerM2Count: 0,
});
assert.equal(catalog.comparableCount, 85, "C05: 85 comparables");
assert.equal(catalog.visibleRows.length, 18, "P7-05 conserva la página inicial de 18 filas");
assert.equal(catalog.eligiblePricePerM2Count, 0, "C04: cero pares elegibles");
assert.ok(catalog.priceReferenceCount > 0, "C04: existen publicaciones con precio y área");

const firstProject = catalog.visibleRows[0].project;
const filtered = buildProjectCatalogModel({
  projects: data.projects,
  scenarioContext: state.scenarioContext,
  filters: {
    phase: "Todos",
    query: firstProject.project_name,
    sort: "score",
  },
  limit: 18,
  selectedProjectId: catalog.visibleRows[0].projectId,
});
assert.ok(filtered.rows.length >= 1, "La búsqueda local conserva coincidencias");
const comparableIds = new Set(state.scenarioContext.comparable_project_ids);
assert.ok(
  filtered.rows.every(({ projectId }) => comparableIds.has(projectId)),
  "La búsqueda no amplía el universo comparable",
);

const html = renderProjects();
assert.match(html, /data-projects-conclusion/u);
assert.match(html, /data-comparable-count="85"/u);
assert.match(html, /data-price-reference-count="69"/u);
assert.match(html, /data-eligible-price-per-m2="0"/u);
assert.match(html, /85 comparables/u);
assert.match(html, /0 tienen pairing certificado por unidad/iu);
assert.match(html, /no vuelve utilizables todos sus campos/iu);
assert.match(html, /role="listbox"/u);
assert.equal((html.match(/role="option"/gu) ?? []).length, 18);
assert.equal((html.match(/class="project-list-header"/gu) ?? []).length, 1);
assert.match(html, /Precio publicado/u);
assert.match(html, /Área publicada/u);
assert.match(html, /Estado/u);
assert.match(html, /Score/u);
assert.match(html, /href="#compare"[^>]*data-view="compare"/u);
assert.match(html, /href="#journey\/depth"[^>]*data-journey-return="depth"/u);
assert.doesNotMatch(html, /precio publicado provisional elegible/iu);
assert.doesNotMatch(html, /NaN|Infinity|-Infinity/u);
assert.equal(
  await fs.readFile(
    new URL("./fixtures/commercial-claims.json", import.meta.url),
    "utf8",
  ),
  claimsSource,
  "El fixture de claims es read-only",
);

const evidenceDir = process.env.EVIDENCE_DIR
  ? path.resolve(process.env.EVIDENCE_DIR)
  : null;
if (evidenceDir) await fs.mkdir(evidenceDir, { recursive: true });

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const { page, problems, externalRequests } = await createObservedPage(
      context,
      baseUrl,
    );
    await openPath(page, baseUrl, "/#projects");
    await page.locator("[data-projects-conclusion]").waitFor();

    assert.equal(await page.locator("h1").count(), 1, `${viewport.name}: un h1`);
    assert.equal(
      await page.locator("[data-projects-conclusion]").getAttribute("data-eligible-price-per-m2"),
      "0",
      `${viewport.name}: C04 visible`,
    );
    assert.equal(await page.locator(".project-row").count(), 18);
    assert.equal(await page.locator(".project-row[aria-selected='true']").count(), 1);
    assert.equal(await page.locator(".project-detail-disclosure:not([open])").count(), 2);

    const firstRow = page.locator(".project-row").first();
    const firstRowBox = await firstRow.boundingBox();
    if (viewport.name === "laptop") {
      assert.ok(
        firstRowBox && firstRowBox.y < viewport.height,
        "Laptop: la primera fila aparece en la primera pantalla",
      );
    }

    if (viewport.name === "desktop") {
      assert.notEqual(
        await page.locator(".project-list-header").evaluate((element) => getComputedStyle(element).display),
        "none",
      );
    }
    if (viewport.name === "mobile") {
      assert.equal(
        await page.locator(".project-list-header").evaluate((element) => getComputedStyle(element).display),
        "none",
      );
      assert.equal(
        await firstRow.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length),
        2,
        "Móvil: la fila usa dos columnas compactas",
      );
      assert.ok(await firstRow.locator(".project-cell-label:visible").count() >= 5);
    }
    if (evidenceDir) {
      await page.screenshot({
        path: path.join(evidenceDir, `p7-05-projects-${viewport.name}.png`),
        fullPage: true,
      });
    }

    const secondRow = page.locator(".project-row").nth(1);
    const secondName = (await secondRow.locator(".project-row__identity strong").textContent()).trim();
    await secondRow.focus();
    await page.keyboard.press("Enter");
    await page.locator(".project-row[aria-selected='true']").nth(0).waitFor();
    assert.equal(await page.locator(".project-row").nth(1).getAttribute("aria-selected"), "true");
    assert.equal(await page.locator("#project-detail-panel h2").textContent(), secondName);
    assert.equal(
      await page.evaluate(() => document.activeElement?.id),
      await page.locator(".project-row").nth(1).getAttribute("id"),
      `${viewport.name}: el foco vuelve a la fila seleccionada`,
    );

    const disclosure = page.locator(".project-detail-disclosure").first();
    await disclosure.locator("summary").focus();
    await page.keyboard.press("Enter");
    assert.equal(await disclosure.getAttribute("open"), "");

    const countBeforeMore = await page.locator(".project-row").count();
    await page.locator("#load-more-projects").click();
    assert.equal(countBeforeMore, 18);
    assert.equal(await page.locator(".project-row").count(), 36);

    const scenarioComparableCount = await page
      .locator("[data-projects-conclusion]")
      .getAttribute("data-comparable-count");
    const search = page.locator("#project-query");
    await search.fill(secondName);
    assert.equal(
      await page.locator("[data-projects-conclusion]").getAttribute("data-comparable-count"),
      scenarioComparableCount,
      "La búsqueda no muta el escenario",
    );
    assert.ok(await page.locator(".project-row").count() >= 1);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    assert.ok(overflow <= 2, `${viewport.name}: overflow horizontal ${overflow}px`);
    assert.deepEqual(problems, [], `${viewport.name}: errores\n${problems.join("\n")}`);
    assert.deepEqual(externalRequests, [], `${viewport.name}: red externa\n${externalRequests.join("\n")}`);
    await context.close();
  }
}, { port: 4205 });

console.log(
  "Commercial projects OK: 85 comparables, C04/C05 limits, semantic rows, local filters, selection, progressive detail, responsive and keyboard verified.",
);
