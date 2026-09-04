import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createObservedPage,
  openPath,
  openRoute,
  routes,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";
import { resolveAppUrl } from "./helpers/app-url.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const scenarioDirectory = path.join(testDirectory, "e2e-scenarios");
const fixtureIds = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "p"];
const fixtures = await Promise.all(
  fixtureIds.map(async (id) =>
    JSON.parse(
      await fs.readFile(
        path.join(scenarioDirectory, `ct-${id}-journey.json`),
        "utf8",
      ),
    ),
  ),
);
const publicData = JSON.parse(
  await fs.readFile(
    new URL("../public/demo-data/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const stageQuestions = {
  scale: "¿Qué mercado observable sostiene la lectura?",
  geography: "¿Dónde compite el proyecto?",
  quality: "¿Qué dato puede utilizarse?",
  depth: "¿Cómo se diferencia la oferta?",
  movement: "¿Qué cambió en el mercado?",
  decision: "¿Qué hacemos y qué no podemos afirmar?",
};
const capabilityMatrix = {
  "2.0.0": [],
  "2.1.0": ["scale", "geography"],
  "2.2.0": ["scale", "geography", "quality"],
  "2.3.0": ["scale", "geography", "quality", "depth"],
  "2.4.0": Object.keys(stageQuestions),
};

function assertClean(observed, label) {
  assert.deepEqual(observed.problems, [], `${label}: ${observed.problems.join("\n")}`);
  assert.deepEqual(
    observed.externalRequests,
    [],
    `${label} external requests: ${observed.externalRequests.join("\n")}`,
  );
}

function legacyPayload(version) {
  const payload = structuredClone(publicData);
  payload.metadata.contract_version = version;
  if (["2.0.0", "2.1.0", "2.2.0", "2.3.0"].includes(version)) {
    delete payload.history;
    delete payload.assistant;
  }
  if (["2.0.0", "2.1.0", "2.2.0"].includes(version)) {
    delete payload.benchmark;
  }
  if (["2.0.0", "2.1.0"].includes(version)) {
    delete payload.inspector;
  }
  return payload;
}

async function journeySnapshot(page) {
  return page.evaluate(async () => {
    const module = await import(new URL("js/state.js", document.baseURI).href);
    return {
      status: module.state.journeyContext.status,
      stages: Object.fromEntries(
        Object.entries(module.state.journeyContext.stages).map(
          ([stageId, stage]) => [
            stageId,
            {
              status: stage.status,
              capabilityStatus: stage.capability.status,
              available: stage.capability.available,
              correctiveHref: stage.correctiveAction?.href ?? null,
            },
          ],
        ),
      ),
    };
  });
}

await withDemoBrowser(
  async ({ browser, baseUrl }) => {
    const loadingContext = await browser.newContext({ viewport: viewports[1] });
    const loadingObserved = await createObservedPage(loadingContext, baseUrl);
    let releaseBoundary;
    const boundaryGate = new Promise((resolve) => {
      releaseBoundary = resolve;
    });
    await loadingObserved.page.route("**/demo-data/district-boundaries.geojson", async (route) => {
      await boundaryGate;
      await route.continue();
    });
    await loadingObserved.page.goto(resolveAppUrl(baseUrl, "/#journey/scale"), {
      waitUntil: "domcontentloaded",
    });
    await loadingObserved.page.locator('[data-journey-state="loading"]').waitFor();
    assert.equal(await loadingObserved.page.locator("[data-journey-step]").count(), 6);
    assert.equal(await loadingObserved.page.locator(".journey-primary-action:disabled").count(), 1);
    releaseBoundary();
    await loadingObserved.page.waitForLoadState("networkidle");
    await loadingObserved.page.locator('[data-journey-state="ready"]').waitFor();
    assertClean(loadingObserved, "journey loading");
    await loadingContext.close();

    const errorContext = await browser.newContext({ viewport: viewports[1] });
    const errorPage = await errorContext.newPage();
    await errorPage.route("**/demo-data/viva-platform-demo.json", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify({ error: "controlled" }),
      }),
    );
    await errorPage.goto(resolveAppUrl(baseUrl, "/#journey/scale"), {
      waitUntil: "networkidle",
    });
    assert.match(await errorPage.locator(".error-box").innerText(), /No se pudo iniciar la plataforma/iu);
    assert.doesNotMatch(await errorPage.locator("body").innerText(), /NaN|Infinity|∞/u);
    await errorContext.close();

    for (const [version, availableStages] of Object.entries(capabilityMatrix)) {
      const context = await browser.newContext({ viewport: viewports[0] });
      const observed = await createObservedPage(context, baseUrl);
      const payload = legacyPayload(version);
      await observed.page.route("**/demo-data/viva-platform-demo.json", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json; charset=utf-8",
          body: JSON.stringify(payload),
        }),
      );
      if (version === "2.0.0") {
        await observed.page.goto(resolveAppUrl(baseUrl, "/#journey/decision"), {
          waitUntil: "networkidle",
        });
        assert.match(
          await observed.page.locator(".error-box").innerText(),
          /contrato|contract|2\.1\.0.*2\.4\.0/iu,
          "2.0 must fail closed as a global unavailable contract",
        );
        assert.doesNotMatch(await observed.page.locator("body").innerText(), /NaN|Infinity|∞/u);
        assertClean(observed, `contract ${version}`);
        await context.close();
        continue;
      }
      await openPath(observed.page, baseUrl, "/#journey/decision");
      const snapshot = await journeySnapshot(observed.page);
      assert.equal(
        await observed.page.locator('[data-journey-stage="decision"]').getAttribute("data-journey-state"),
        snapshot.stages.decision.status,
        `${version} decision DOM parity`,
      );
      assert.equal(
        snapshot.status,
        version === "2.0.0" ? "contract_unavailable" : "ready",
        `${version} global status`,
      );
      for (const [stageId, stage] of Object.entries(snapshot.stages)) {
        assert.equal(stage.available, availableStages.includes(stageId), `${version} ${stageId}`);
        assert.equal(
          stage.capabilityStatus,
          version === "2.0.0"
            ? "contract_unavailable"
            : availableStages.includes(stageId)
              ? "available"
              : "capability_unavailable",
          `${version} ${stageId} capability status`,
        );
        if (!stage.available) assert.ok(stage.correctiveHref, `${version} ${stageId} corrective action`);
      }
      if (!snapshot.stages.decision.available) {
        assert.equal(
          await observed.page.locator('.journey-primary-action').getAttribute('href'),
          snapshot.stages.decision.correctiveHref,
          `${version} decision corrective CTA`,
        );
      }
      assert.doesNotMatch(await observed.page.locator("body").innerText(), /NaN|Infinity|∞/u);
      assertClean(observed, `contract ${version}`);
      await context.close();
    }

    const fixtureContext = await browser.newContext({ viewport: viewports[0] });
    const fixtureObserved = await createObservedPage(fixtureContext, baseUrl);
    for (const fixture of fixtures) {
      await openPath(fixtureObserved.page, baseUrl, fixture.scenario_path);
      assert.equal(await fixtureObserved.page.locator("h1").textContent(), stageQuestions[fixture.stage_id]);
      assert.equal(
        await fixtureObserved.page.locator(`[data-journey-step="${fixture.stage_id}"][aria-current="step"]`).count(),
        1,
      );
      const snapshot = await journeySnapshot(fixtureObserved.page);
      assert.equal(
        snapshot.stages[fixture.stage_id].status,
        fixture.expected.public_stage_status,
        `${fixture.case_id} journey status`,
      );
      assert.equal(
        await fixtureObserved.page
          .locator(`[data-journey-stage="${fixture.stage_id}"]`)
          .getAttribute("data-journey-state"),
        snapshot.stages[fixture.stage_id].status,
        `${fixture.case_id} visible journey status`,
      );
      assert.deepEqual(
        await fixtureObserved.page
          .locator("[data-journey-expert]")
          .evaluateAll((links) => links.map((link) => link.dataset.journeyExpert)),
        fixture.expected.expert_routes,
        `${fixture.case_id} expert links`,
      );
      assert.doesNotMatch(await fixtureObserved.page.locator("body").innerText(), /NaN|Infinity|∞/u);
    }
    const publicSnapshot = await fixtureObserved.page.evaluate(async () => {
      const module = await import(new URL("js/state.js", document.baseURI).href);
      return {
        scale: module.state.journeyContext.stages.scale.data,
        geography: module.state.journeyContext.stages.geography.data,
        quality: module.state.journeyContext.stages.quality.data,
      };
    });
    assert.equal(publicSnapshot.scale.modelAgencyCount, 184);
    assert.deepEqual(publicSnapshot.scale.pilot, { baseCount: 30, enrichedCount: 22, deepCount: 5 });
    assert.equal(publicSnapshot.geography.scope.observed_project_count, 90);
    assert.equal(publicSnapshot.geography.comparableProjectCount, 85);
    assert.equal(publicSnapshot.quality.caseId, "case:f3-ct-g-pardo");
    assert.equal(publicSnapshot.quality.cardArea.normalized_value, 104.15);
    assert.equal(publicSnapshot.quality.planArea.normalized_value, 53.37);
    assert.equal(publicSnapshot.quality.areaDelta.normalized_value, 50.78);
    assert.equal(publicSnapshot.quality.decision.benchmarkEligible, false);
    assertClean(fixtureObserved, "CT-A–I/P journey fixtures");
    await fixtureContext.close();

    const emptyContext = await browser.newContext({ viewport: viewports[0] });
    const emptyObserved = await createObservedPage(emptyContext, baseUrl);
    const emptyPath = "/?sv=1&scope=radius&lat=-12.000000&lon=-77.000000&radius=500";
    await openPath(emptyObserved.page, baseUrl, `${emptyPath}#journey/geography`);
    let emptySnapshot = await journeySnapshot(emptyObserved.page);
    assert.equal(emptySnapshot.stages.geography.status, "empty");
    assert.equal(
      await emptyObserved.page.locator('[data-journey-stage="geography"]').getAttribute("data-journey-state"),
      "empty",
    );
    assert.equal(emptySnapshot.stages.geography.correctiveHref, "#dashboard");
    await openPath(emptyObserved.page, baseUrl, `${emptyPath}#journey/movement`);
    emptySnapshot = await journeySnapshot(emptyObserved.page);
    assert.equal(emptySnapshot.stages.movement.status, "empty");
    assert.equal(
      await emptyObserved.page.locator('[data-journey-stage="movement"]').getAttribute("data-journey-state"),
      "empty",
    );
    assert.equal(emptySnapshot.stages.movement.correctiveHref, "#journey/depth");
    assert.doesNotMatch(await emptyObserved.page.locator("body").innerText(), /NaN|Infinity|∞/u);
    assertClean(emptyObserved, "empty geography and movement");
    await emptyContext.close();

    const claimsContext = await browser.newContext({ viewport: viewports[0] });
    const claimsObserved = await createObservedPage(claimsContext, baseUrl);
    await openRoute(claimsObserved.page, baseUrl, "assistant");
    const input = claimsObserved.page.locator("#assistant-input");
    await input.fill("¿Cuál es el precio real de cierre del competidor?");
    await input.press("Control+Enter");
    await claimsObserved.page.locator('[data-assistant-response="refused"]').waitFor();
    assert.match(
      await claimsObserved.page.locator("[data-assistant-block=limitations]").innerText(),
      /precio real de cierre/iu,
    );
    await input.fill("¿Dónde viven las personas que consultaron?");
    await input.press("Control+Enter");
    await claimsObserved.page.locator('[data-assistant-response="refused"]').waitFor();
    assert.match(
      await claimsObserved.page.locator("[data-assistant-block=limitations]").innerText(),
      /datos personales|ubicación personal/iu,
    );
    await openPath(claimsObserved.page, baseUrl, "/#inspector/case/f3-ct-g-pardo");
    const inspectorText = await claimsObserved.page.locator("#main-content").innerText();
    for (const value of ["104.15", "53.37", "50.78"]) assert.match(inspectorText, new RegExp(value));
    assertClean(claimsObserved, "CT-F/G/P claims");
    await claimsContext.close();

    const routeContext = await browser.newContext({ viewport: viewports[1] });
    const routeObserved = await createObservedPage(routeContext, baseUrl);
    for (const route of routes) {
      await openRoute(routeObserved.page, baseUrl, route.id);
      assert.equal(await routeObserved.page.locator(`[data-view="${route.id}"][aria-current="page"]`).count(), 1);
      assert.equal(await routeObserved.page.locator("[data-journey-entry]").count(), 1);
      assert.doesNotMatch(await routeObserved.page.locator("body").innerText(), /NaN|Infinity|∞/u);
    }
    assertClean(routeObserved, "eight expert routes");
    await routeContext.close();
  },
  { port: 4191 },
);

console.log(
  "Phase 6 integral E2E OK: loading, error, 2.0–2.4, CT-A–I/P, empty states, claims and eight routes verified.",
);
