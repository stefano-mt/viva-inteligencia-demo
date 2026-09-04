import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  generateAssistantResponse,
  initializeScenarioData,
  setAssistantDraft,
  state,
} from "../public/js/state.js";
import { renderAssistant } from "../public/js/views/assistant.js";
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

initializeScenarioData(data, { boundaryArtifactStatus: "valid" });

const idleBefore = JSON.stringify(state);
const idleHtml = renderAssistant();
assert.equal(JSON.stringify(state), idleBefore, "Idle render must remain pure");
assert.match(idleHtml, /data-assistant-decision="idle"/u);
assert.match(idleHtml, /Formula una consulta antes de tomar una decisión/u);
assert.match(idleHtml, /La respuesta aparecerá aquí/u);
assert.match(
  idleHtml,
  /href="#journey\/decision"[^>]*data-journey-return="decision"/u,
);
assert.equal(
  (idleHtml.match(/class="primary-button assistant-submit"/gu) ?? []).length,
  1,
  "Idle state exposes only the explicit submit as primary action",
);
assert.doesNotMatch(idleHtml, /data-assistant-response=/u);

const summaryIntent = data.assistant.intents.find(
  ({ intent_id: intentId }) => intentId === "intent:scenario-summary",
);
assert.ok(summaryIntent);
setAssistantDraft(summaryIntent.suggested_questions[0], summaryIntent.intent_id);
const readyResponse = generateAssistantResponse();
const readyReference = state.assistantResponse;
const readySnapshot = structuredClone(readyReference);
const readyHtml = renderAssistant();

assert.strictEqual(
  state.assistantResponse,
  readyReference,
  "Rendering must preserve the exact response object held by state",
);
assert.deepEqual(state.assistantResponse, readySnapshot);
assert.equal(
  readyHtml.indexOf("data-assistant-response=") <
    readyHtml.indexOf('class="assistant-query panel"'),
  true,
  "Decision and next action must precede the query/detail workbench",
);
assert.equal((readyHtml.match(/data-assistant-block=/gu) ?? []).length, 6);
assert.match(readyHtml, /<details class="assistant-evidence-disclosure">/u);
assert.doesNotMatch(
  readyHtml,
  /<details class="assistant-evidence-disclosure"\s+open/u,
);
assert.match(readyHtml, /href="#trust"[^>]*data-view="trust"/u);
assert.match(readyHtml, /Preparar checklist comercial/u);
assert.match(
  readyHtml,
  /href="#journey\/decision"[^>]*data-journey-return="decision"/u,
);
assert.equal(
  (readyHtml.match(/class="primary-button"/gu) ?? []).length,
  1,
  "A completed response exposes one primary handoff",
);
assert.match(
  readyHtml,
  /class="secondary-button assistant-submit"[^>]*>Generar lectura/u,
);
for (const block of readyResponse.blocks) {
  assert.match(
    readyHtml,
    new RegExp(`data-assistant-block="${block.type}"`, "u"),
  );
}
for (const reference of readyResponse.references) {
  assert.match(
    readyHtml,
    new RegExp(`data-assistant-reference="${reference.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "u"),
  );
}

const refusals = [
  ["¿Cuál es el precio real de cierre del competidor?", "limitation:closing-price"],
  ["¿Por qué el competidor bajó su precio?", "limitation:causality"],
  ["¿Dónde viven las personas que consultaron?", "limitation:personal-data"],
  ["Busca en internet las redes sociales del proyecto", "limitation:external-data"],
];

for (const [input, limitationId] of refusals) {
  setAssistantDraft(input, null);
  const response = generateAssistantResponse();
  const beforeRender = structuredClone(response);
  const html = renderAssistant();
  assert.equal(response.status, "refused");
  assert.equal(response.limitationId, limitationId);
  assert.deepEqual(state.assistantResponse, beforeRender);
  assert.match(html, /data-assistant-response="refused"/u);
  assert.match(html, /data-assistant-clear/u);
  assert.doesNotMatch(html, /href="#trust"/u);
  assert.equal((html.match(/class="primary-button"/gu) ?? []).length, 1);
  assert.doesNotMatch(html, /NaN|Infinity|undefined/u);
}

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of [viewports[1], viewports[2]]) {
    const context = await browser.newContext({ viewport });
    const { page, problems, externalRequests } = await createObservedPage(
      context,
      baseUrl,
    );

    await openPath(page, baseUrl, "/#assistant");
    const workbench = page.locator("[data-scenario-consumer='assistant']");
    await workbench.waitFor({ state: "visible" });
    assert.equal(await workbench.getAttribute("data-assistant-status"), "idle");
    assert.equal(await page.locator("[data-assistant-response]").count(), 0);
    assert.equal(await workbench.locator(".primary-button").count(), 1);

    const firstQuestion = page.locator(".assistant-question").first();
    await firstQuestion.click();
    await page.locator("#assistant-input").press("Control+Enter");
    const response = page.locator("[data-assistant-response='ready']");
    await response.waitFor({ state: "visible" });
    assert.equal(
      await page.locator("#assistant-response-title").evaluate(
        (element) => document.activeElement === element,
      ),
      true,
    );
    assert.equal(await workbench.locator(".primary-button").count(), 1);
    assert.equal(
      await response.locator("[data-assistant-block]").count(),
      6,
    );
    const disclosure = response.locator(".assistant-evidence-disclosure");
    assert.equal(await disclosure.getAttribute("open"), null);
    await disclosure.locator("summary").focus();
    await page.keyboard.press("Enter");
    assert.equal(await disclosure.getAttribute("open"), "");
    assert.ok(
      await response.locator("[data-assistant-reference]").count() > 0,
      "References remain accessible inside progressive detail",
    );

    if (viewport.name === "mobile") {
      const queryColumns = await page
        .locator(".assistant-query")
        .evaluate((element) =>
          getComputedStyle(element).gridTemplateColumns.split(" ").length,
        );
      assert.equal(queryColumns, 1);
    }
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    assert.ok(overflow <= 2, `${viewport.name}: horizontal overflow ${overflow}px`);

    await response.locator("a[href='#trust']").click();
    await page.waitForURL(/#trust$/u);
    await openPath(page, baseUrl, "/#assistant");
    await page
      .locator("[data-assistant-decision] a[href='#journey/decision']")
      .first()
      .click();
    await page.waitForURL(/#journey\/decision$/u);

    await openPath(page, baseUrl, "/#assistant");
    const input = page.locator("#assistant-input");
    await input.fill("Busca en internet las redes sociales del proyecto");
    await input.press("Control+Enter");
    await page.locator("[data-assistant-response='refused']").waitFor();
    assert.doesNotMatch(page.url(), /redes|consulta|assistantInput/iu);
    assert.equal(
      await page.locator("[data-assistant-response='refused'] .primary-button").count(),
      1,
    );

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
}, { port: 4203 });

console.log(
  "Journey decision OK: explicit submit, literal deterministic response, refusal policy, progressive evidence, checklist handoff and canonical return verified.",
);
