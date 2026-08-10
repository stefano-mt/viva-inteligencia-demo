import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  initializeScenarioData,
  state,
} from "../public/js/state.js";
import {
  buildComparableRows,
  renderProjectDetail,
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
const geographyArtifact = {
  status: "valid",
  geojson: { type: "FeatureCollection", features: [] },
  url: "demo-data/district-boundaries.geojson",
  expected_sha256: data.geography.boundary_artifact_sha256,
  actual_sha256: data.geography.boundary_artifact_sha256,
  reason: null,
};

initializeScenarioData(data, { geographyArtifact });

const catalogHtml = renderProjects();
const comparableCount = state.scenarioContext.comparable_project_ids.length;
const priceReferenceCount =
  state.scenarioContext.price_reference_project_ids.length;

assert.match(catalogHtml, /data-projects-conclusion/u);
assert.match(
  catalogHtml,
  new RegExp(`data-comparable-count="${comparableCount}"`, "u"),
);
assert.match(
  catalogHtml,
  new RegExp(`data-price-reference-count="${priceReferenceCount}"`, "u"),
);
assert.match(catalogHtml, /proyectos para priorizar/u);
assert.match(catalogHtml, /Que un proyecto sea comparable no significa que todos sus campos puedan usarse/u);
assert.match(catalogHtml, /href="#compare"[^>]*data-view="compare"/u);
assert.match(
  catalogHtml,
  /href="#journey\/depth"[^>]*data-journey-return="depth"[^>]*>Volver al recorrido: Profundidad/u,
);
assert.equal(
  (catalogHtml.match(/class="primary-button"/gu) ?? []).length,
  1,
  "Projects exposes one primary action before technical detail",
);
assert.equal(
  (catalogHtml.match(/class="project-catalog-orientation__status"/gu) ?? []).length,
  1,
);
assert.doesNotMatch(catalogHtml, /project-catalog-brief/u);
assert.doesNotMatch(catalogHtml, /project-card-reading/u);
assert.doesNotMatch(catalogHtml, /NaN|Infinity|undefined/u);

const rows = buildComparableRows({
  projects: data.projects,
  scenarioContext: state.scenarioContext,
});
const selected =
  rows.find(({ projectId }) => projectId === "project:nexo-2951") ?? rows[0];
assert.ok(selected, "The active scenario requires at least one comparable");
const detailHtml = renderProjectDetail(selected);
assert.equal(
  (detailHtml.match(/<details class="project-detail-disclosure">/gu) ?? [])
    .length,
  2,
  "Technical project detail is disclosed progressively",
);
assert.match(detailHtml, /Cómo se construye la comparabilidad/u);
assert.match(detailHtml, /Ver datos publicados, atributos y fuente/u);
assert.match(detailHtml, /Abrir publicación visible|No disponible en la información visible/u);
assert.match(detailHtml, /project-inspector-action/u);
assert.doesNotMatch(
  detailHtml,
  /class="primary-button project-inspector-action"/u,
  "Evidence stays accessible without competing with the comparison handoff",
);

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of [viewports[1], viewports[2]]) {
    const context = await browser.newContext({ viewport });
    const { page, problems, externalRequests } = await createObservedPage(
      context,
      baseUrl,
    );

    await openPath(page, baseUrl, "/#projects");
    const brief = page.locator("[data-projects-conclusion]");
    await brief.waitFor({ state: "visible" });
    assert.equal(await brief.getAttribute("data-comparable-count"), "85");
    assert.equal(await brief.locator(".project-catalog-orientation__status").count(), 1);
    assert.equal(await brief.locator("dl").count(), 0, "Projects does not repeat a KPI ledger");
    const briefBox = await brief.boundingBox();
    const catalogPanelBox = await page.locator(".catalog-panel").boundingBox();
    const detailPanelBox = await page.locator(".detail-panel").boundingBox();
    assert.ok(
      briefBox.y < catalogPanelBox.y && briefBox.y < detailPanelBox.y,
      `${viewport.name}: conclusion must precede filters, list and detail`,
    );
    assert.equal(
      await page.locator("[data-scenario-consumer='catalog'] .primary-button").count(),
      1,
    );

    const firstRow = page.locator(".project-card").first();
    assert.equal(await firstRow.locator(".project-row-facts > div").count(), 3);

    const disclosure = page.locator(".project-detail-disclosure").first();
    const disclosureSummary = disclosure.locator("summary");
    await disclosureSummary.focus();
    await page.keyboard.press("Enter");
    assert.equal(await disclosure.getAttribute("open"), "");

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    assert.ok(overflow <= 2, `${viewport.name}: horizontal overflow ${overflow}px`);

    if (viewport.name === "laptop") {
      const listStyle = await page
        .locator(".catalog-result-list")
        .evaluate((element) => ({
          maxHeight: getComputedStyle(element).maxHeight,
          overflowY: getComputedStyle(element).overflowY,
        }));
      assert.equal(listStyle.overflowY, "auto");
      assert.notEqual(listStyle.maxHeight, "none");
    } else {
      assert.equal(
        await page
          .locator(".catalog-result-list")
          .evaluate((element) => getComputedStyle(element).maxHeight),
        "none",
      );
    }

    await brief.locator("a[href='#compare']").click();
    await page.waitForURL(/#compare$/u);
    await openPath(page, baseUrl, "/#projects");
    await page
      .locator("[data-projects-conclusion] a[href='#journey/depth']")
      .click();
    await page.waitForURL(/#journey\/depth$/u);

    assert.deepEqual(
      problems,
      [],
      `${viewport.name}: browser errors\n${problems.join("\n")}`,
    );
    assert.deepEqual(
      externalRequests,
      [],
      `${viewport.name}: external requests\n${externalRequests.join("\n")}`,
    );
    await context.close();
  }
}, { port: 4198 });

console.log(
  "Journey projects handoff OK: conclusion-first hierarchy, progressive detail, accessible evidence and canonical depth/comparison exits verified.",
);
