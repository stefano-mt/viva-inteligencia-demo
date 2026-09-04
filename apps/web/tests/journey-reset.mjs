import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  dispatchInspector,
  dispatchScenario,
  generateAssistantResponse,
  initializeScenarioData,
  resetApplicationState,
  setAssistantDraft,
  setHistoryFilters,
  state,
} from "../public/js/state.js";
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
dispatchScenario({
  type: "SET_TERRITORY",
  patch: { district_id: "150140", scope_mode: "district" },
});
state.projectFilters = {
  district: "San Isidro",
  typology: "Flat",
  phase: "En venta",
  query: "persistente",
  sort: "price-asc",
};
state.projectLimit = 72;
state.selectedProjectId = "2951";
state.compareProjectIds = ["2951", "2842"];
state.compareIncludeTarget = true;
state.compareQuery = "comparar";
setHistoryFilters({ statuses: ["certified"] });
state.selectedHistoryEventId = state.historyContext.timeline[0]?.history_event_id ?? null;
const intent = data.assistant.intents[0];
setAssistantDraft(intent.suggested_questions[0], intent.intent_id);
generateAssistantResponse();
dispatchInspector({ type: "SELECT_CASE", value: "case:f3-ct-d-finishes" });
dispatchInspector({ type: "OPEN_EVIDENCE" });
state.mobileNavOpen = true;
state.view = "assistant";

const assistantRevisionBeforeReset = state.assistantResponseRevision;
const transition = resetApplicationState();

assert.equal(transition.inspector.projectId, "project:nexo-2951");
assert.equal(transition.inspector.typologyId, "typology:pardo-coast-tipo-7");
assert.equal(transition.inspector.preset, "case:f3-ct-g-pardo");
assert.equal(transition.inspector.evidenceId, null);
assert.equal(transition.inspector.dialogOpen, false);
assert.deepEqual(state.scenario, data.scenario_defaults);
assert.equal(state.selectedDistrict, "Miraflores");
assert.deepEqual(state.projectFilters, {
  district: "Miraflores",
  typology: "Todos",
  phase: "Todos",
  query: "",
  sort: "direct",
});
assert.equal(state.projectLimit, 18);
assert.equal(state.selectedProjectId, null);
assert.deepEqual(state.compareProjectIds, []);
assert.equal(state.compareIncludeTarget, false);
assert.equal(state.compareQuery, "");
assert.deepEqual(state.historyFilters, {
  statuses: ["certified", "reviewable", "insufficient"],
  validities: ["current", "aging", "historical", "unknown"],
  directions: ["increase", "decrease", "unchanged"],
});
assert.equal(state.selectedHistoryEventId, null);
assert.equal(state.assistantInput, "");
assert.equal(state.assistantIntentId, null);
assert.equal(state.assistantResponse, null);
assert.equal(state.assistantResponseRevision, assistantRevisionBeforeReset + 1);
assert.equal(state.mobileNavOpen, false);
assert.equal(state.view, "journey");
assert.equal(state.scenarioFocusId, "journey-title");
assert.match(state.journeyAnnouncement, /reiniciados.*Etapa 1 de 6: Escala/iu);
assert.equal(state.journeyContext.stages.quality.status, "ready");
assert.equal(
  state.journeyContext.stages.quality.data.caseId,
  "case:f3-ct-g-pardo",
);
assert.equal(state.journeyContext.stages.quality.data.cardArea.normalized_value, 104.15);
assert.equal(state.journeyContext.stages.quality.data.planArea.normalized_value, 53.37);

await withDemoBrowser(async ({ browser, baseUrl }) => {
  const context = await browser.newContext({ viewport: viewports[1] });
  const { page, problems, externalRequests } = await createObservedPage(
    context,
    baseUrl,
  );

  await openPath(page, baseUrl, "/#journey/movement");
  await page.evaluate(async () => {
    window.history.pushState(null, "", `${window.location.pathname}?sv=1&scope=district&district=150140#assistant`);
    const moduleUrl = new URL("js/state.js", document.baseURI).href;
    const module = await import(moduleUrl);
    module.dispatchScenario({
      type: "SET_TERRITORY",
      patch: { district_id: "150140", scope_mode: "district" },
    });
    module.state.projectFilters.query = "no debe volver";
    module.state.projectFilters.sort = "price-asc";
    module.state.projectLimit = 54;
    module.state.compareProjectIds = ["2951", "2842"];
    module.state.compareIncludeTarget = true;
    module.state.compareQuery = "consulta local";
    module.setHistoryFilters({ statuses: ["certified"] });
    module.setAssistantDraft("¿Qué cambió?", "intent:market-reading");
    module.generateAssistantResponse();
    module.dispatchInspector({ type: "SELECT_CASE", value: "case:f3-ct-d-finishes" });
    module.dispatchInspector({ type: "OPEN_EVIDENCE" });
    module.state.mobileNavOpen = true;
  });

  await page.locator("#scenario-journey-editor-trigger").click();
  await page.locator("#scenario-editor").waitFor({ state: "visible" });
  await page.locator("#reset-scenario").click();
  await page.waitForFunction(() => window.location.hash === "#journey/scale");
  const resetUrl = new URL(page.url());
  assert.equal(resetUrl.search, "");
  assert.equal(resetUrl.hash, "#journey/scale");
  assert.equal(await page.locator("h1").textContent(), "¿Qué mercado observable sostiene la lectura?");
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    "journey-title",
  );
  assert.match(await page.locator("#journey-live").textContent(), /reiniciados.*Etapa 1 de 6: Escala/iu);

  const browserState = await page.evaluate(async () => {
    const module = await import(new URL("js/state.js", document.baseURI).href);
    return {
      scenario: module.state.scenario,
      projectFilters: module.state.projectFilters,
      projectLimit: module.state.projectLimit,
      compareProjectIds: module.state.compareProjectIds,
      compareIncludeTarget: module.state.compareIncludeTarget,
      compareQuery: module.state.compareQuery,
      historyFilters: module.state.historyFilters,
      selectedHistoryEventId: module.state.selectedHistoryEventId,
      assistantInput: module.state.assistantInput,
      assistantIntentId: module.state.assistantIntentId,
      assistantResponse: module.state.assistantResponse,
      inspectorProjectId: module.state.inspectorProjectId,
      inspectorTypologyId: module.state.inspectorTypologyId,
      inspectorPreset: module.state.inspectorPreset,
      inspectorEvidenceId: module.state.inspectorEvidenceId,
      inspectorDialogOpen: module.state.inspectorDialogOpen,
      mobileNavOpen: module.state.mobileNavOpen,
    };
  });
  assert.deepEqual(browserState.scenario, data.scenario_defaults);
  assert.equal(browserState.projectFilters.query, "");
  assert.equal(browserState.projectFilters.sort, "direct");
  assert.equal(browserState.projectLimit, 18);
  assert.deepEqual(browserState.compareProjectIds, []);
  assert.equal(browserState.compareIncludeTarget, false);
  assert.equal(browserState.compareQuery, "");
  assert.deepEqual(browserState.historyFilters, {
    statuses: ["certified", "reviewable", "insufficient"],
    validities: ["current", "aging", "historical", "unknown"],
    directions: ["increase", "decrease", "unchanged"],
  });
  assert.equal(browserState.selectedHistoryEventId, null);
  assert.equal(browserState.assistantInput, "");
  assert.equal(browserState.assistantIntentId, null);
  assert.equal(browserState.assistantResponse, null);
  assert.equal(browserState.inspectorProjectId, "project:nexo-2951");
  assert.equal(browserState.inspectorTypologyId, "typology:pardo-coast-tipo-7");
  assert.equal(browserState.inspectorPreset, "case:f3-ct-g-pardo");
  assert.equal(browserState.inspectorEvidenceId, null);
  assert.equal(browserState.inspectorDialogOpen, false);
  assert.equal(browserState.mobileNavOpen, false);

  await page.goBack({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.location.hash === "#journey/movement");
  const afterBack = await page.evaluate(async () => {
    const module = await import(new URL("js/state.js", document.baseURI).href);
    return {
      input: module.state.assistantInput,
      response: module.state.assistantResponse,
      comparison: module.state.compareProjectIds,
      query: module.state.projectFilters.query,
    };
  });
  assert.deepEqual(afterBack, {
    input: "",
    response: null,
    comparison: [],
    query: "",
  });
  await page.goForward({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.location.hash === "#journey/scale");

  await openPath(
    page,
    baseUrl,
    "/?sv=1&scope=district&district=150140#journey/depth",
  );
  const beforeReload = await page.evaluate(async () => {
    const module = await import(new URL("js/state.js", document.baseURI).href);
    return module.state.scenario;
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#journey-title").waitFor({ state: "visible" });
  const afterReload = await page.evaluate(async () => {
    const module = await import(new URL("js/state.js", document.baseURI).href);
    return module.state.scenario;
  });
  assert.deepEqual(afterReload, beforeReload);
  assert.equal(new URL(page.url()).hash, "#journey/depth");

  assert.deepEqual(problems, [], `Errores durante reset:\n${problems.join("\n")}`);
  assert.deepEqual(externalRequests, [], `Red externa durante reset:\n${externalRequests.join("\n")}`);
  await context.close();
});

console.log(
  "Journey reset OK: matriz completa, Tipo 7, URL, foco, historial y recarga reproducible.",
);
