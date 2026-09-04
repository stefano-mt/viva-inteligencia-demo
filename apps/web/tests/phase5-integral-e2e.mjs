import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  createObservedPage,
  openPath,
  openRoute,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";

const publicData = JSON.parse(
  await fs.readFile(
    new URL("../../../data/generated/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const emptyRadiusPath =
  "/?sv=1&scope=radius&lat=-12.000000&lon=-77.000000&radius=500";

function rowIds(page) {
  return page
    .locator("[data-history-row]")
    .evaluateAll((rows) => rows.map((row) => row.dataset.historyRow));
}

function assertClean(observed, label) {
  assert.deepEqual(
    observed.problems,
    [],
    `${label} produced browser, console, HTTP or page errors`,
  );
  assert.deepEqual(
    observed.externalRequests,
    [],
    `${label} attempted an external request`,
  );
}

async function submitQuestion(page, question) {
  const input = page.locator("#assistant-input");
  await input.fill(question);
  await input.press("Control+Enter");
}

await withDemoBrowser(
  async ({ browser, baseUrl }) => {
    const context = await browser.newContext({ viewport: viewports[0] });
    const observed = await createObservedPage(context, baseUrl);
    const { page } = observed;

    await openRoute(page, baseUrl, "activity");
    await page.locator('[data-history-status="ready"]').waitFor();
    const initialRows = await rowIds(page);
    assert.ok(initialRows.length > 0, "the default scenario must expose historical signals");

    const evidenceToggle = page.locator("[data-history-event]").first();
    const evidenceToggleId = await evidenceToggle.getAttribute("id");
    await evidenceToggle.focus();
    await page.keyboard.press("Enter");
    await page.locator(".history-detail").waitFor();
    assert.match(
      await page.locator(".history-detail").innerText(),
      /Dos observaciones del mismo precio publicado/iu,
    );
    assert.match(await page.locator(".history-detail").innerText(), /Causa no observada/iu);
    assert.ok(
      (await page.locator(".history-evidence li").count()) > 0,
      "a certified signal must expose its authorized evidence references",
    );
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(".history-detail").count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement?.id), evidenceToggleId);

    await page.locator("#scenario-editor-trigger").click();
    const district = page.locator("#top-district");
    await district.waitFor({ state: "visible" });
    const initialDistrict = await district.inputValue();
    const alternateDistrict = initialDistrict === "150140" ? "150122" : "150140";
    const alternateLabel = (
      await district.locator(`option[value="${alternateDistrict}"]`).textContent()
    )?.trim();
    assert.ok(alternateLabel, "the alternate district must be present in the scenario selector");
    await district.selectOption(alternateDistrict);
    await page.waitForFunction(
      (expected) => document.querySelector("#top-district")?.value === expected,
      alternateDistrict,
    );
    await page.keyboard.press("Escape");
    await page.locator('[data-history-status="ready"]').waitFor();
    const alternateRows = await rowIds(page);
    assert.ok(alternateRows.length > 0, "the alternate district must keep an observed history");
    assert.notDeepEqual(
      alternateRows,
      initialRows,
      "changing district must recompute the history instead of retaining stale rows",
    );
    assert.match(await page.locator("#main-content").innerText(), new RegExp(alternateLabel, "iu"));
    assert.equal(new URL(page.url()).searchParams.get("district"), alternateDistrict);

    await page.locator('[data-view="dashboard"]').first().click();
    await page.locator('[data-view="dashboard"][aria-current="page"]').waitFor();
    await page.locator("#scenario-editor-trigger").click();
    await page.locator("#scenario-scope-quadrant").click();
    assert.equal(new URL(page.url()).searchParams.get("scope"), "quadrant");
    assert.equal(new URL(page.url()).searchParams.get("quadrant"), "NW");
    await page.keyboard.press("Escape");
    await page.locator('[data-view="assistant"]').first().click();
    await page.locator('[data-view="assistant"][aria-current="page"]').waitFor();
    await page.locator(".assistant-question").first().click();
    await page.locator("#assistant-input").press("Control+Enter");
    await page.locator('[data-assistant-response="ready"]').waitFor();
    assert.match(await page.locator(".assistant-scenario").innerText(), /Noroeste/iu);
    assert.match(await page.locator(".assistant-scenario").innerText(), new RegExp(alternateLabel, "iu"));
    assert.equal(new URL(page.url()).hash, "#assistant");
    assertClean(observed, "district/scope and evidence round trip");
    await context.close();

    const emptyContext = await browser.newContext({ viewport: viewports[0] });
    const emptyObserved = await createObservedPage(emptyContext, baseUrl);
    const emptyPage = emptyObserved.page;
    await openPath(emptyPage, baseUrl, `${emptyRadiusPath}#activity`);
    await emptyPage.locator(".history-state--empty").waitFor();
    assert.equal(await emptyPage.locator("[data-history-row]").count(), 0);
    assert.match(
      await emptyPage.locator(".history-state--empty").innerText(),
      /No hay cambios elegibles en este escenario/iu,
    );
    await emptyPage.locator('[data-view="assistant"]').first().click();
    await emptyPage.locator('[data-view="assistant"][aria-current="page"]').waitFor();
    await submitQuestion(
      emptyPage,
      "¿Qué precios publicados cambiaron en este escenario?",
    );
    await emptyPage.locator('[data-assistant-response="insufficient"]').waitFor();
    assert.equal(
      await emptyPage.locator(
        '[data-assistant-response="insufficient"] [data-canonical-project-id]',
      ).count(),
      0,
    );
    assert.match(
      await emptyPage.locator('[data-assistant-response="insufficient"]').innerText(),
      /sin cambios|no hay cambios|evidencia insuficiente/iu,
    );
    assert.equal(new URL(emptyPage.url()).searchParams.get("scope"), "radius");
    assertClean(emptyObserved, "empty history and assistant");
    await emptyContext.close();

    const legacyData = structuredClone(publicData);
    legacyData.metadata.contract_version = "2.3.0";
    delete legacyData.history;
    delete legacyData.assistant;
    const legacyContext = await browser.newContext({ viewport: viewports[0] });
    const legacyObserved = await createObservedPage(legacyContext, baseUrl);
    const legacyPage = legacyObserved.page;
    await legacyPage.route("**/demo-data/viva-platform-demo.json", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify(legacyData),
      });
    });
    await openRoute(legacyPage, baseUrl, "activity");
    await legacyPage.locator('[data-history-status="contract_unavailable"]').waitFor();
    assert.match(
      await legacyPage.locator("#main-content").innerText(),
      /versión de datos no incluye el histórico|no está disponible/iu,
    );
    await legacyPage.locator('[data-view="assistant"]').first().click();
    await legacyPage.locator('[data-view="assistant"][aria-current="page"]').waitFor();
    await legacyPage.locator(".assistant-question").first().click();
    await legacyPage.locator("#assistant-input").press("Control+Enter");
    await legacyPage
      .locator('[data-assistant-response="contract_unavailable"]')
      .waitFor();
    assert.match(
      await legacyPage
        .locator('[data-assistant-response="contract_unavailable"]')
        .innerText(),
      /contrato|no está disponible/iu,
    );
    assert.equal(await legacyPage.locator("[data-canonical-project-id]").count(), 0);
    assertClean(legacyObserved, "contract 2.3 degradation");
    await legacyContext.close();
  },
  { port: 4189 },
);

console.log(
  "Phase 5 integral E2E OK: district/scope recomputation, signal evidence return, empty scenario and 2.3 degradation verified.",
);
