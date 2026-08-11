import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  createObservedPage,
  openPath,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";
import { resolveAppUrl } from "./helpers/app-url.mjs";

const publicData = JSON.parse(
  await fs.readFile(
    new URL("../public/demo-data/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const stageIds = [
  "scale",
  "geography",
  "quality",
  "depth",
  "movement",
  "decision",
];

function assertClean(observed, label) {
  assert.deepEqual(observed.problems, [], `${label}: ${observed.problems.join("\n")}`);
  assert.deepEqual(
    observed.externalRequests,
    [],
    `${label} external requests: ${observed.externalRequests.join("\n")}`,
  );
}

async function authoritativeStage(page, stageId) {
  return page.evaluate(async (id) => {
    const module = await import(new URL("js/state.js", document.baseURI).href);
    const stage = module.state.journeyContext?.stages?.[id] ?? null;
    return stage
      ? {
          status: stage.status,
          hasData: Boolean(stage.data),
          correctiveLabel: stage.correctiveAction?.label ?? null,
          correctiveHref: stage.correctiveAction?.href ?? null,
        }
      : null;
  }, stageId);
}

async function assertVisibleStageParity(page, stageId) {
  const stage = await authoritativeStage(page, stageId);
  assert.ok(stage, `${stageId} must exist in journeyContext`);
  const root = page.locator(`[data-journey-stage="${stageId}"]`);
  assert.equal(
    await root.getAttribute("data-journey-state"),
    stage.status,
    `${stageId} DOM state must equal journeyContext`,
  );
  if (stage.correctiveHref) {
    const action = root.locator(
      stage.status === "insufficient" && stage.hasData
        ? "[data-journey-corrective-action]"
        : ".journey-primary-action",
    );
    assert.equal(await action.getAttribute("href"), stage.correctiveHref);
    assert.equal((await action.innerText()).trim(), stage.correctiveLabel);
  }
}

await withDemoBrowser(async ({ browser, baseUrl }) => {
  const context = await browser.newContext({ viewport: viewports[0] });
  const observed = await createObservedPage(context, baseUrl);

  for (const stageId of stageIds) {
    await openPath(observed.page, baseUrl, `/#journey/${stageId}`);
    await assertVisibleStageParity(observed.page, stageId);
  }

  await openPath(observed.page, baseUrl, "/#journey/scale");
  assert.match(
    await observed.page.locator('[data-journey-fact="model-agencies"]').innerText(),
    /184/u,
  );
  assert.match(
    await observed.page.locator('[data-journey-fact="pilot-levels"]').innerText(),
    /30\s*\/\s*22\s*\/\s*5/u,
  );

  await openPath(observed.page, baseUrl, "/#journey/quality");
  for (const [factId, value] of [
    ["card-area", "104.15"],
    ["plan-area", "53.37"],
    ["area-delta", "50.78"],
  ]) {
    assert.match(
      await observed.page.locator(`[data-journey-fact="${factId}"]`).innerText(),
      new RegExp(value.replace(".", "\\."), "u"),
    );
  }
  assert.match(
    await observed.page.locator('[data-journey-fact="benchmark-decision"]').innerText(),
    /excluid/iu,
  );

  await openPath(observed.page, baseUrl, "/#journey/decision");
  assert.match(
    await observed.page.locator('[data-journey-fact="decision-mode"]').innerText(),
    /lista de verificaci[oó]n|checklist/iu,
  );
  assert.match(
    await observed.page.locator('[data-journey-fact="decision-checklist"]').innerText(),
    /comparables|evidencia|referencia/iu,
  );
  assert.doesNotMatch(await observed.page.locator("body").innerText(), /NaN|Infinity|∞/u);
  assertClean(observed, "2.4 authoritative Journey");
  await context.close();

  const missingScalePayload = structuredClone(publicData);
  delete missingScalePayload.metadata.counts.canonical_agencies;
  delete missingScalePayload.pilot.counts.base_count;
  const missingScaleContext = await browser.newContext({ viewport: viewports[0] });
  const missingScaleObserved = await createObservedPage(missingScaleContext, baseUrl);
  await missingScaleObserved.page.route(
    "**/demo-data/viva-platform-demo.json",
    (route) => route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(missingScalePayload),
    }),
  );
  await openPath(missingScaleObserved.page, baseUrl, "/#journey/scale");
  await assertVisibleStageParity(missingScaleObserved.page, "scale");
  assert.match(
    await missingScaleObserved.page
      .locator('[data-journey-fact="model-agencies"]')
      .innerText(),
    /No disponible/u,
  );
  assert.match(
    await missingScaleObserved.page
      .locator('[data-journey-fact="pilot-levels"]')
      .innerText(),
    /No disponible\s*\/\s*22\s*\/\s*5/u,
  );
  assertClean(missingScaleObserved, "missing scale counts");
  await missingScaleContext.close();

  const responseContext = await browser.newContext({ viewport: viewports[0] });
  const responseObserved = await createObservedPage(responseContext, baseUrl);
  await openPath(responseObserved.page, baseUrl, "/#assistant");
  await responseObserved.page.locator(".assistant-question").first().click();
  await responseObserved.page.locator("#assistant-input").press("Control+Enter");
  await responseObserved.page.locator('[data-assistant-response="ready"]').waitFor();
  await openPath(responseObserved.page, baseUrl, "/#journey/decision");
  const responseStage = await responseObserved.page.evaluate(async () => {
    const module = await import(new URL("js/state.js", document.baseURI).href);
    return module.state.journeyContext.stages.decision;
  });
  assert.equal(responseStage.data.mode, "assistant_response");
  const decisionRoot = responseObserved.page.locator('[data-journey-stage="decision"]');
  for (const block of responseStage.data.response.blocks) {
    const expected = (block.items ?? [])
      .map((item) => item.text ?? item.label ?? "")
      .filter(Boolean);
    if (!expected.length) continue;
    const text = await decisionRoot.textContent();
    for (const value of expected) {
      assert.ok(text.includes(String(value)), `decision must represent ${block.type}: ${value}`);
    }
  }
  assert.equal(await decisionRoot.locator(".journey-decision-disclosure").count(), 1);
  const responseGeometry = await responseObserved.page.evaluate(() => {
    const action = document.querySelector(".journey-primary-action")?.getBoundingClientRect();
    const limit = document.querySelector(".journey-reading__limit")?.getBoundingClientRect();
    return {
      actionBottom: action?.bottom ?? Infinity,
      limitBottom: limit?.bottom ?? Infinity,
      viewportHeight: innerHeight,
    };
  });
  assert.ok(responseGeometry.actionBottom <= responseGeometry.viewportHeight);
  assert.ok(responseGeometry.limitBottom <= responseGeometry.viewportHeight);
  assertClean(responseObserved, "six-block decision response");
  await responseContext.close();

  const emptyContext = await browser.newContext({ viewport: viewports[0] });
  const emptyObserved = await createObservedPage(emptyContext, baseUrl);
  await openPath(
    emptyObserved.page,
    baseUrl,
    "/?sv=1&scope=radius&lat=-12.000000&lon=-77.000000&radius=500#journey/geography",
  );
  await assertVisibleStageParity(emptyObserved.page, "geography");
  assert.match(
    await emptyObserved.page.locator('[data-journey-stage="geography"]').innerText(),
    /sin proyectos|no hay proyectos/iu,
  );
  assertClean(emptyObserved, "empty geography Journey");
  await emptyContext.close();

  const legacyContext = await browser.newContext({ viewport: viewports[0] });
  const legacyObserved = await createObservedPage(legacyContext, baseUrl);
  const payload21 = structuredClone(publicData);
  payload21.metadata.contract_version = "2.1.0";
  delete payload21.inspector;
  delete payload21.benchmark;
  delete payload21.history;
  delete payload21.assistant;
  await legacyObserved.page.route("**/demo-data/viva-platform-demo.json", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(payload21),
    }),
  );
  await openPath(legacyObserved.page, baseUrl, "/#journey/decision");
  await assertVisibleStageParity(legacyObserved.page, "decision");
  assert.match(
    await legacyObserved.page.locator('[data-journey-stage="decision"]').innerText(),
    /no disponible|requiere.*2\.4/iu,
  );
  assertClean(legacyObserved, "2.1 decision capability");
  await legacyContext.close();

  const contractContext = await browser.newContext({ viewport: viewports[0] });
  const contractPage = await contractContext.newPage();
  const payload20 = structuredClone(publicData);
  payload20.metadata.contract_version = "2.0.0";
  await contractPage.route("**/demo-data/viva-platform-demo.json", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(payload20),
    }),
  );
  await contractPage.goto(resolveAppUrl(baseUrl, "/#journey/decision"), {
    waitUntil: "networkidle",
  });
  assert.match(
    await contractPage.locator(".error-box").innerText(),
    /contrato|contract|2\.1\.0.*2\.4\.0/iu,
  );
  assert.equal(await contractPage.locator("[data-journey-stage]").count(), 0);
  await contractContext.close();
});

console.log(
  "Journey DOM parity OK: six stages, missing scale counts, six-block decision response, empty/capability states and global 2.0 failure verified.",
);
