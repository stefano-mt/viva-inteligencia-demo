import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { buildJourneyContext, JOURNEY_STAGE_IDS } from "../public/js/journey.js";
import {
  dispatchScenario,
  initializeScenarioData,
  state,
} from "../public/js/state.js";
import { renderDashboard } from "../public/js/views/dashboard.js";
import { renderMarket } from "../public/js/views/market.js";
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

const marketHtml = renderMarket();
assert.match(marketHtml, /data-scale-ledger/u);
assert.match(
  marketHtml,
  new RegExp(`data-model-agencies="${data.metadata.counts.canonical_agencies}"`, "u"),
);
assert.match(marketHtml, /data-pilot-base="30"/u);
assert.match(marketHtml, /data-pilot-enriched="22"/u);
assert.match(marketHtml, /data-pilot-deep="5"/u);
assert.match(marketHtml, /Tres niveles de cobertura que no deben sumarse/u);
assert.doesNotMatch(marketHtml, /NaN|Infinity/u);

function assertDashboardMatchesScenario(html, context) {
  assert.match(html, /data-radar-reading/u);
  assert.match(
    html,
    new RegExp(`data-observed-projects="${context.observed_scope_project_ids.length}"`, "u"),
  );
  assert.match(
    html,
    new RegExp(`data-geography-included="${context.geography_coverage.included}"`, "u"),
  );
  assert.match(
    html,
    new RegExp(`data-geography-total="${context.geography_coverage.total}"`, "u"),
  );
  assert.match(
    html,
    new RegExp(`data-comparable-projects="${context.comparable_project_ids.length}"`, "u"),
  );
  assert.doesNotMatch(html, /NaN|Infinity/u);
}

const initialContext = structuredClone(state.scenarioContext);
assertDashboardMatchesScenario(renderDashboard(), initialContext);

const alternateDistrict = data.geography.districts.find(
  (district) =>
    district.district_id !== initialContext.scenario.district_id &&
    district.observed_project_count > 0 &&
    district.observed_project_count !== initialContext.scope.observed_project_count,
);
assert.ok(alternateDistrict, "An alternate observed district is required");
dispatchScenario({
  type: "SET_TERRITORY",
  patch: { district_id: alternateDistrict.district_id, scope_mode: "district" },
});
assertDashboardMatchesScenario(renderDashboard(), state.scenarioContext);
assert.notEqual(
  state.scenarioContext.scope.observed_project_count,
  initialContext.scope.observed_project_count,
  "Geographic counts must change with the active district",
);

for (const [version, available] of Object.entries({
  "2.0.0": false,
  "2.1.0": true,
  "2.2.0": true,
  "2.3.0": true,
  "2.4.0": true,
})) {
  const context = buildJourneyContext({ contractVersion: version });
  for (const stageId of ["scale", "geography"]) {
    assert.equal(context.stages[stageId].capability.available, available);
  }
  assert.deepEqual(Object.keys(context.stages), JOURNEY_STAGE_IDS);
}

const emptyGeography = buildJourneyContext({
  contractVersion: "2.4.0",
  scenarioContext: {
    scope: { observed_project_count: 0 },
    geography_coverage: { included: 0, total: 0, pct: 0 },
    market_reading: { comparable_project_count: 0 },
    excluded_projects: [],
  },
  geographyArtifact: { status: "valid" },
});
assert.equal(emptyGeography.stages.geography.status, "empty");
assert.doesNotMatch(JSON.stringify(emptyGeography), /NaN|Infinity/u);

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of [viewports[1], viewports[2]]) {
    const context = await browser.newContext({ viewport });
    const { page, problems, externalRequests } = await createObservedPage(
      context,
      baseUrl,
    );

    await openPath(page, baseUrl, "/#market");
    const scaleLedger = page.locator("[data-scale-ledger]");
    await scaleLedger.waitFor({ state: "visible" });
    assert.equal(await scaleLedger.getAttribute("data-model-agencies"), "184");
    assert.equal(await scaleLedger.locator(".scale-ledger > div").count(), 3);

    await openPath(page, baseUrl, "/#dashboard");
    const radar = page.locator("[data-radar-reading]");
    await radar.waitFor({ state: "visible" });
    assert.equal(
      await radar.getAttribute("data-observed-projects"),
      await page.locator("#geo-project-select option").count().then(String),
      "Radar derives its observed count from the same map universe",
    );
    assert.equal(
      await page.locator(".geo-panel").count(),
      1,
      "The geography map remains part of the scenario",
    );
    assert.equal(
      await page.locator(".positioning-panel").count(),
      0,
      "Only the active visualization is mounted",
    );
    assert.equal(
      await page.locator("[data-geography-brief]").count(),
      0,
      "Radar does not repeat the global scenario summary",
    );
    const mapBox = await page.locator(".radar-primary").boundingBox();
    const plannerBox = await page.locator(".planner-panel").boundingBox();
    assert.ok(mapBox.y < plannerBox.y, `${viewport.name}: map must precede product planning`);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    assert.ok(overflow <= 1, `${viewport.name} horizontal overflow: ${overflow}px`);
    assert.deepEqual(problems, [], `${viewport.name} browser errors:\n${problems.join("\n")}`);
    assert.deepEqual(externalRequests, [], `${viewport.name} external requests:\n${externalRequests.join("\n")}`);
    await context.close();
  }
}, { port: 4197 });

console.log(
  "Journey scale/geography OK: denominators, scenario-derived geography, compatibility, fallbacks and responsive rendering verified.",
);
