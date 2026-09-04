import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { initializeScenarioData, state } from "../public/js/state.js";
import { renderActivity } from "../public/js/views/activity.js";
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
const validArtifact = {
  status: "valid",
  geojson: { type: "FeatureCollection", features: [] },
  url: "demo-data/district-boundaries.geojson",
  expected_sha256: data.geography.boundary_artifact_sha256,
  actual_sha256: data.geography.boundary_artifact_sha256,
  reason: null,
};

initializeScenarioData(data, { geographyArtifact: validArtifact });

const contextReference = state.historyContext;
const contextSnapshot = JSON.stringify(contextReference);
const filtersSnapshot = structuredClone(state.historyFilters);
const signal = contextReference.timeline[0];
const agendaOrder = contextReference.agenda.map(({ agenda_item_id: id }) => id);
const readyHtml = renderActivity();

assert.ok(signal, "El escenario inicial requiere una señal visible");
assert.equal(signal.cause, null, "CT-E no debe atribuir una causa no observada");
assert.equal(signal.cause_status, "not_observed");
assert.strictEqual(
  state.historyContext,
  contextReference,
  "La vista debe consumir historyContext sin reconstruirlo",
);
assert.equal(JSON.stringify(state.historyContext), contextSnapshot);
assert.deepEqual(state.historyFilters, filtersSnapshot);
assert.deepEqual(
  state.historyContext.agenda.map(({ agenda_item_id: id }) => id),
  agendaOrder,
  "La agenda conserva el orden autoritativo",
);
assert.match(readyHtml, /data-history-signal-brief="ready"/u);
assert.match(
  readyHtml,
  new RegExp(`data-history-current-event="${signal.history_event_id}"`, "u"),
);
assert.match(
  readyHtml,
  new RegExp(`data-history-current-validity="${signal.validity}"`, "u"),
);
assert.match(
  readyHtml,
  new RegExp(`data-history-current-status="${signal.effective_status}"`, "u"),
);
assert.match(readyHtml, /data-history-current-cause="not_observed"/u);
assert.match(readyHtml, /Anterior → nuevo/u);
assert.match(readyHtml, /Causa no observada/u);
assert.match(readyHtml, /no ventas ni una explicación causal/u);
assert.match(readyHtml, /href="#assistant">Preparar decisión/u);
assert.equal(
  (readyHtml.match(/class="history-quality-item"/gu) ?? []).length,
  4,
  "Los cuatro indicadores heredados permanecen visibles",
);
assert.ok(
  readyHtml.indexOf("history-signal-brief") <
    readyHtml.indexOf("history-quality-band"),
  "La tesis debe preceder los resúmenes",
);
assert.ok(
  readyHtml.indexOf("history-signal-brief") <
    readyHtml.indexOf("history-ledger"),
  "La tesis y su límite deben preceder el detalle",
);
assert.equal(
  (readyHtml.match(/class="primary-button/gu) ?? []).length,
  1,
  "El handoff es la única acción con jerarquía primaria global",
);
assert.doesNotMatch(readyHtml, /NaN|Infinity/u);

state.selectedHistoryEventId = signal.history_event_id;
const selectedHtml = renderActivity();
assert.match(selectedHtml, /Dos observaciones del mismo precio publicado/u);
assert.match(selectedHtml, /Causa no observada/u);
assert.match(selectedHtml, /Evidencia autorizada/u);
assert.equal(state.selectedHistoryEventId, signal.history_event_id);
state.selectedHistoryEventId = null;

const originalContext = state.historyContext;
state.historyContext = {
  ...originalContext,
  status: "empty",
  timeline: [],
  agenda: [],
};
const emptyHtml = renderActivity();
assert.match(emptyHtml, /data-history-signal-brief="empty"/u);
assert.match(emptyHtml, /no demuestra estabilidad/u);
assert.doesNotMatch(emptyHtml, /history-decision-action/u);
state.historyContext = originalContext;

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of [viewports[1], viewports[2]]) {
    const browserContext = await browser.newContext({ viewport });
    const observed = await createObservedPage(browserContext, baseUrl);
    const { page } = observed;
    await openPath(
      page,
      baseUrl,
      "/?sv=1&scope=district&district=150122#activity",
    );
    const brief = page.locator('[data-history-signal-brief="ready"]');
    await brief.waitFor({ state: "visible" });

    assert.equal(await page.locator(".history-quality-item").count(), 4);
    assert.equal(await page.locator(".history-decision-action").count(), 1);
    assert.equal(
      await page.locator(".history-view .primary-button").count(),
      1,
      `${viewport.name}: solo el handoff usa el estilo primario`,
    );
    assert.equal(
      await page.locator('[data-journey-return="movement"]').count(),
      1,
      "La ruta experta conserva retorno canónico a Movimiento",
    );

    const columns = await brief
      .locator(".history-signal-brief__ledger")
      .evaluate((element) =>
        getComputedStyle(element).gridTemplateColumns.split(" ").length,
      );
    assert.equal(columns, viewport.width <= 620 ? 1 : 3);
    assert.equal(
      await brief
        .locator(".history-signal-brief__ledger > div")
        .first()
        .evaluate((element) => getComputedStyle(element).display),
      "block",
      `${viewport.name}: cada métrica debe reservar todo su ancho y evitar texto apilado`,
    );

    const evidenceButton = page.locator("[data-history-event]").first();
    await evidenceButton.focus();
    await page.keyboard.press("Enter");
    await page.locator(".history-detail").waitFor();
    assert.match(await page.locator(".history-detail").innerText(), /Causa no observada/u);
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(".history-detail").count(), 0);
    assert.equal(
      await evidenceButton.evaluate((element) => document.activeElement === element),
      true,
    );

    const searchBefore = new URL(page.url()).search;
    await page.locator(".history-decision-action").click();
    await page.waitForFunction(() => window.location.hash === "#assistant");
    assert.equal(new URL(page.url()).search, searchBefore);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    assert.ok(overflow <= 1, `${viewport.name}: overflow horizontal ${overflow}px`);
    assert.deepEqual(observed.problems, [], `${viewport.name}: ${observed.problems.join("\n")}`);
    assert.deepEqual(
      observed.externalRequests,
      [],
      `${viewport.name}: red externa ${observed.externalRequests.join("\n")}`,
    );
    await browserContext.close();
  }
}, { port: 4361 });

console.log(
  "Journey movement OK: thesis-first, CT-E, explicit null cause, handoff, four legacy metrics, responsive and keyboard verified.",
);
