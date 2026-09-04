import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  initializeScenarioData,
  state,
} from "../public/js/state.js";
import {
  buildChecklistModel,
  renderChecklistModel,
} from "../public/js/views/checklist.js";
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
const source = await fs.readFile(
  new URL("../public/js/views/checklist.js", import.meta.url),
  "utf8",
);
const css = await fs.readFile(
  new URL("../public/styles/63-checklist.css", import.meta.url),
  "utf8",
);

initializeScenarioData(data);
const scenarioContext = structuredClone(state.scenarioContext);
const privateQuestion = "Consulta de Ana ana@example.com +51 999 888 777";
const input = {
  data,
  scenarioContext,
  assistantResponse: {
    status: "answered",
    question: privateQuestion,
    cause: "Dato no observado",
  },
};
const before = structuredClone(input);
const model = buildChecklistModel(input);
assert.deepEqual(input, before, "Checklist model must not mutate its inputs");
assert.deepEqual(model, buildChecklistModel(input), "Checklist model must be deterministic");
assert.equal(model.readiness.assistantHandoff, true);
assert.equal(
  model.readiness.ready,
  model.available &&
    model.comparison.tone === "success" &&
    model.price.tone === "success" &&
    model.comparableCount > 0 &&
    model.priceReferenceCount >= 3,
);

const markup = renderChecklistModel(model);
for (const phrase of [
  "Resumen de cierre",
  "Qué está listo",
  "Qué está bloqueado",
  "Próximo paso",
  "Handoff desde el asistente",
  "Volver al recorrido: Decisión",
]) {
  assert.ok(markup.includes(phrase), phrase);
}
assert.equal(
  (markup.match(/class="checklist-summary__item/gmu) ?? []).length,
  3,
  "The close summary has at most three blocks",
);
assert.equal(
  (markup.match(/class="primary-button/gmu) ?? []).length,
  1,
  "The checklist exposes one primary CTA",
);
assert.match(
  markup,
  /href="#journey\/decision"[\s\S]*data-journey-return="decision"/u,
);
assert.match(markup, /data-assistant-handoff="ready"/u);
assert.match(markup, /<details class="checklist-detail span-12">/u);
assert.doesNotMatch(markup, /<details class="checklist-detail span-12" open/u);
assert.doesNotMatch(markup, new RegExp(privateQuestion, "u"));
assert.doesNotMatch(markup, /ana@example\.com|999 888 777/u);
assert.doesNotMatch(markup, /causa:\s*Dato no observado/iu);
assert.doesNotMatch(markup, /precio de cierre:\s*S\//iu);
assert.doesNotMatch(markup, /NaN|Infinity|undefined/gu);

const withoutAssistant = buildChecklistModel({ data, scenarioContext });
assert.equal(withoutAssistant.readiness.assistantHandoff, false);
assert.match(
  renderChecklistModel(withoutAssistant),
  /data-assistant-handoff="empty"[\s\S]*no genera una consulta implícita/iu,
);

const insufficientContext = {
  ...scenarioContext,
  comparable_project_ids: [],
  price_reference_project_ids: [],
  comparability_status: "insufficient",
  price_status: "insufficient",
  evidence_coverage_pct: 0,
  price_diagnosis: {
    reference_count: 0,
    methodology: "Referencia publicada provisional; evidencia insuficiente.",
    status: "insufficient",
    p25: null,
    median: null,
    p75: null,
    target_price_per_m2: null,
    position: null,
  },
};
const insufficient = buildChecklistModel({
  data,
  scenarioContext: insufficientContext,
});
assert.equal(insufficient.readiness.ready, false);
assert.match(
  renderChecklistModel(insufficient),
  /data-checklist-readiness="blocked"[\s\S]*Avance bloqueado por evidencia/u,
);
assert.match(
  renderChecklistModel(insufficient),
  /Sin comparables elegibles y sin referencias publicadas provisionales/u,
  "El estado cero debe explicar la ausencia de muestra en lenguaje directo",
);

assert.doesNotMatch(source, /renderChecklistLegacyModel/u);
assert.equal(
  (source.match(/export function renderChecklistModel/gmu) ?? []).length,
  1,
);
assert.match(css, /grid-template-columns:\s*repeat\(3,/u);
assert.match(
  css,
  /@media\s*\(max-width:\s*720px\)[\s\S]*\.checklist-summary\s*\{[\s\S]*grid-template-columns:\s*1fr/u,
);
assert.match(css, /\.checklist-detail\s*>\s*summary/u);
assert.match(css, /:focus-visible/u);

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of [viewports[1], viewports[2]]) {
    const context = await browser.newContext({ viewport });
    const { page, problems, externalRequests } = await createObservedPage(
      context,
      baseUrl,
    );
    await openPath(page, baseUrl, "/#trust");
    const summary = page.locator(".checklist-summary");
    await summary.waitFor({ state: "visible" });
    assert.equal(await summary.locator(".checklist-summary__item").count(), 3);
    assert.equal(await page.locator(".checklist-evidence .primary-button").count(), 1);
    assert.equal(
      await page.locator(".checklist-return").getAttribute("href"),
      "#journey/decision",
    );

    const detail = page.locator(".checklist-detail");
    assert.equal(await detail.getAttribute("open"), null);
    const detailSummary = detail.locator(":scope > summary");
    await detailSummary.focus();
    await detailSummary.press("Enter");
    assert.notEqual(await detail.getAttribute("open"), null);

    const columns = await summary.evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(" ").length,
    );
    assert.equal(columns, viewport.width <= 720 ? 1 : 3);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    assert.ok(overflow <= 1, `${viewport.name} horizontal overflow: ${overflow}px`);
    assert.deepEqual(problems, [], `${viewport.name} browser errors:\n${problems.join("\n")}`);
    assert.deepEqual(externalRequests, [], `${viewport.name} external requests:\n${externalRequests.join("\n")}`);
    await context.close();
  }
}, { port: 4199 });

console.log(
  "Journey checklist handoff OK: deterministic readiness, assistant handoff, privacy, progressive detail, canonical return and responsive keyboard flow verified.",
);
