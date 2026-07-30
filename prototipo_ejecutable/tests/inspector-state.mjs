import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  INSPECTOR_ACTIONS,
  canonicalScenarioSearch,
  dispatchInspector,
  initializeInspectorState,
  initializeScenarioData,
  inspectorSelection,
  state,
} from "../public/js/state.js";
import {
  INSPECTOR_EVENTS,
  INSPECTOR_PRESET_CASE_IDS,
  applyInspectorPreset,
  bindEvents,
  closeInspectorEvidence,
  openInspectorEvidence,
  selectInspectorCase,
  selectInspectorProject,
  selectInspectorTypology,
} from "../public/js/controller.js";

const payload = JSON.parse(
  await readFile(
    new URL("../public/demo-data/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const clone = (value) => structuredClone(value);
const caseById = new Map(
  payload.inspector.cases.map((inspectorCase) => [
    inspectorCase.case_id,
    inspectorCase,
  ]),
);

function f2Snapshot() {
  return {
    scenarioReference: state.scenario,
    contextReference: state.scenarioContext,
    scenarioBytes: JSON.stringify(state.scenario),
    statusBytes: JSON.stringify(state.scenario_status),
    correctionsBytes: JSON.stringify(state.scenario_corrections),
    contextBytes: JSON.stringify(state.scenarioContext),
    artifactBytes: JSON.stringify(state.geographyArtifact),
    filtersBytes: JSON.stringify(state.projectFilters),
    selectedProjectBytes: JSON.stringify(state.selectedProjectId),
    compareProjectBytes: JSON.stringify(state.compareProjectIds),
    announcementBytes: JSON.stringify(state.scenarioAnnouncement),
    focusBytes: JSON.stringify(state.scenarioFocusId),
    revision: state.scenarioContextRevision,
    canonicalSearch: canonicalScenarioSearch(),
  };
}

function assertF2Preserved(before, label) {
  assert.strictEqual(state.scenario, before.scenarioReference, `${label}: scenario ref`);
  assert.strictEqual(
    state.scenarioContext,
    before.contextReference,
    `${label}: context ref`,
  );
  assert.equal(JSON.stringify(state.scenario), before.scenarioBytes, `${label}: scenario`);
  assert.equal(
    JSON.stringify(state.scenario_status),
    before.statusBytes,
    `${label}: status`,
  );
  assert.equal(
    JSON.stringify(state.scenario_corrections),
    before.correctionsBytes,
    `${label}: corrections`,
  );
  assert.equal(
    JSON.stringify(state.scenarioContext),
    before.contextBytes,
    `${label}: context`,
  );
  assert.equal(
    JSON.stringify(state.geographyArtifact),
    before.artifactBytes,
    `${label}: artifact`,
  );
  assert.equal(
    JSON.stringify(state.projectFilters),
    before.filtersBytes,
    `${label}: filters`,
  );
  assert.equal(
    JSON.stringify(state.selectedProjectId),
    before.selectedProjectBytes,
    `${label}: selected legacy project`,
  );
  assert.equal(
    JSON.stringify(state.compareProjectIds),
    before.compareProjectBytes,
    `${label}: compare selection`,
  );
  assert.equal(
    JSON.stringify(state.scenarioAnnouncement),
    before.announcementBytes,
    `${label}: scenario announcement`,
  );
  assert.equal(
    JSON.stringify(state.scenarioFocusId),
    before.focusBytes,
    `${label}: scenario focus`,
  );
  assert.equal(
    state.scenarioContextRevision,
    before.revision,
    `${label}: revision`,
  );
  assert.equal(
    canonicalScenarioSearch(),
    before.canonicalSearch,
    `${label}: canonical search`,
  );
}

function dispatchWithoutF2Mutation(action, label = action.type) {
  const before = f2Snapshot();
  const result = dispatchInspector(action);
  assertF2Preserved(before, label);
  return result;
}

initializeScenarioData(payload);
assert.deepEqual(inspectorSelection(), {
  available: true,
  reasonCode: null,
  caseId: "case:f3-ct-g-pardo",
  projectId: "project:nexo-2951",
  typologyId: "typology:pardo-coast-tipo-7",
  evidenceId: null,
  preset: "case:f3-ct-g-pardo",
  dialogOpen: false,
});
const detachedSelection = inspectorSelection();
detachedSelection.projectId = "project:mutated";
assert.equal(state.inspectorProjectId, "project:nexo-2951");

for (const inspectorCase of payload.inspector.cases) {
  const transition = dispatchWithoutF2Mutation(
    {
      type: INSPECTOR_ACTIONS.selectCase,
      caseId: inspectorCase.case_id,
    },
    inspectorCase.case_id,
  );
  assert.equal(transition.selection.caseId, inspectorCase.case_id);
  assert.equal(transition.selection.projectId, inspectorCase.project_id);
  assert.equal(transition.selection.typologyId, inspectorCase.typology_id);
  assert.equal(transition.selection.preset, inspectorCase.case_id);
  assert.equal(transition.selection.evidenceId, null);
  assert.equal(transition.selection.dialogOpen, false);
}

const routeCase = caseById.get("case:f3-floor-review");
const routeTransition = dispatchWithoutF2Mutation({
  type: INSPECTOR_ACTIONS.selectCase,
  routeSlug: routeCase.route_slug,
});
assert.equal(routeTransition.selection.caseId, routeCase.case_id);

dispatchWithoutF2Mutation({
  type: INSPECTOR_ACTIONS.selectCase,
  caseId: "case:f3-ct-a-area-types",
});
const preserveProjectCase = dispatchWithoutF2Mutation({
  type: INSPECTOR_ACTIONS.selectProject,
  projectId: "project:ct-a-controlled",
});
assert.equal(preserveProjectCase.changed, false);
assert.equal(preserveProjectCase.selection.caseId, "case:f3-ct-a-area-types");

dispatchWithoutF2Mutation({
  type: INSPECTOR_ACTIONS.selectCase,
  caseId: "case:f3-ct-g-pardo",
});
const canonicalProjectCases = {
  "project:ct-a-controlled": "case:f3-area-match",
  "project:ct-b-controlled": "case:f3-ct-b-price-conflict",
  "project:ct-d-controlled": "case:f3-bedroom-conflict",
  "project:ct-e-controlled": "case:f3-bathroom-conflict",
};
for (const [projectId, expectedCaseId] of Object.entries(canonicalProjectCases)) {
  dispatchWithoutF2Mutation({
    type: INSPECTOR_ACTIONS.selectCase,
    caseId: "case:f3-ct-g-pardo",
  });
  const transition = dispatchWithoutF2Mutation({
    type: INSPECTOR_ACTIONS.selectProject,
    projectId,
  });
  assert.equal(transition.selection.caseId, expectedCaseId, projectId);
}

const shuffledPayload = clone(payload);
shuffledPayload.inspector.cases.reverse();
initializeScenarioData(shuffledPayload);
for (const [projectId, expectedCaseId] of Object.entries(canonicalProjectCases)) {
  dispatchInspector({
    type: INSPECTOR_ACTIONS.selectCase,
    caseId: "case:f3-ct-g-pardo",
  });
  const transition = dispatchInspector({
    type: INSPECTOR_ACTIONS.selectProject,
    projectId,
  });
  assert.equal(
    transition.selection.caseId,
    expectedCaseId,
    `shuffled ${projectId}`,
  );
}

initializeScenarioData(payload);
dispatchInspector({
  type: INSPECTOR_ACTIONS.selectProject,
  projectId: "project:ct-a-controlled",
});
const invalidTypology = dispatchWithoutF2Mutation({
  type: INSPECTOR_ACTIONS.selectTypology,
  typologyId: "typology:not-in-project",
});
assert.equal(invalidTypology.corrected, true);
assert.equal(invalidTypology.reasonCode, "INSPECTOR_TYPOLOGY_CORRECTED");
assert.equal(invalidTypology.selection.caseId, "case:f3-area-match");
assert.ok(invalidTypology.announcement);

for (const [action, reasonCode] of [
  [
    { type: INSPECTOR_ACTIONS.selectCase, caseId: "case:missing" },
    "INSPECTOR_CASE_CORRECTED",
  ],
  [
    { type: INSPECTOR_ACTIONS.selectProject, projectId: "project:missing" },
    "INSPECTOR_PROJECT_CORRECTED",
  ],
]) {
  const transition = dispatchWithoutF2Mutation(action);
  assert.equal(transition.corrected, true);
  assert.equal(transition.reasonCode, reasonCode);
  assert.equal(transition.selection.caseId, "case:f3-ct-g-pardo");
  assert.ok(transition.announcement);
}

assert.deepEqual(INSPECTOR_PRESET_CASE_IDS, {
  inconsistent: "case:f3-ct-g-pardo",
  certified: "case:f3-ct-d-finishes",
  reviewable: "case:f3-floor-review",
  insufficient_restricted: "case:f3-insufficient-source",
});
for (const [preset, caseId] of Object.entries(INSPECTOR_PRESET_CASE_IDS)) {
  const before = f2Snapshot();
  const transition = applyInspectorPreset(preset, { render: false });
  assert.equal(transition.selection.caseId, caseId);
  assertF2Preserved(before, `preset ${preset}`);
}

dispatchInspector({
  type: INSPECTOR_ACTIONS.selectCase,
  caseId: "case:f3-ct-g-pardo",
});
const primaryOpen = dispatchWithoutF2Mutation({
  type: INSPECTOR_ACTIONS.openEvidence,
});
assert.equal(primaryOpen.selection.evidenceId, "evidence:pardo-coast-card-metadata");
assert.equal(primaryOpen.selection.dialogOpen, true);
assert.equal(primaryOpen.focusIntent, "dialog");
const repeatedOpen = dispatchWithoutF2Mutation({
  type: INSPECTOR_ACTIONS.openEvidence,
  evidenceId: "evidence:pardo-coast-card-metadata",
});
assert.equal(repeatedOpen.changed, false);
assert.equal(repeatedOpen.focusIntent, "dialog");
const repeatedCaseWhileOpen = dispatchWithoutF2Mutation({
  type: INSPECTOR_ACTIONS.selectCase,
  caseId: "case:f3-ct-g-pardo",
});
assert.equal(repeatedCaseWhileOpen.changed, false);
assert.equal(repeatedCaseWhileOpen.selection.dialogOpen, true);
assert.equal(
  repeatedCaseWhileOpen.selection.evidenceId,
  "evidence:pardo-coast-card-metadata",
);

const secondaryOpen = dispatchWithoutF2Mutation({
  type: INSPECTOR_ACTIONS.openEvidence,
  evidenceId: "evidence:pardo-coast-plan-metadata",
});
assert.equal(secondaryOpen.changed, true);
assert.equal(
  secondaryOpen.selection.evidenceId,
  "evidence:pardo-coast-plan-metadata",
);
const correctedEvidence = dispatchWithoutF2Mutation({
  type: INSPECTOR_ACTIONS.openEvidence,
  evidenceId: "evidence:not-in-case",
});
assert.equal(correctedEvidence.corrected, true);
assert.equal(correctedEvidence.reasonCode, "INSPECTOR_EVIDENCE_CORRECTED");
assert.equal(
  correctedEvidence.selection.evidenceId,
  "evidence:pardo-coast-card-metadata",
);
const closed = dispatchWithoutF2Mutation({
  type: INSPECTOR_ACTIONS.closeEvidence,
});
assert.equal(closed.changed, true);
assert.equal(closed.focusIntent, "restore");
assert.equal(closed.selection.evidenceId, null);
assert.equal(closed.selection.dialogOpen, false);
const repeatedClose = dispatchWithoutF2Mutation({
  type: INSPECTOR_ACTIONS.closeEvidence,
});
assert.equal(repeatedClose.changed, false);
assert.equal(repeatedClose.focusIntent, "none");

for (const [setupCaseId, changeAction, expectedCaseId] of [
  [
    "case:f3-ct-g-pardo",
    {
      type: INSPECTOR_ACTIONS.selectCase,
      caseId: "case:f3-ct-d-finishes",
    },
    "case:f3-ct-d-finishes",
  ],
  [
    "case:f3-ct-g-pardo",
    {
      type: INSPECTOR_ACTIONS.selectProject,
      projectId: "project:ct-a-controlled",
    },
    "case:f3-area-match",
  ],
  [
    "case:f3-area-match",
    {
      type: INSPECTOR_ACTIONS.selectTypology,
      typologyId: "typology:ct-a-controlled",
    },
    "case:f3-ct-a-area-types",
  ],
]) {
  dispatchInspector({
    type: INSPECTOR_ACTIONS.selectCase,
    caseId: setupCaseId,
  });
  dispatchInspector({ type: INSPECTOR_ACTIONS.openEvidence });
  assert.equal(state.inspectorDialogOpen, true);
  const transition = dispatchWithoutF2Mutation(changeAction);
  assert.equal(transition.selection.caseId, expectedCaseId);
  assert.equal(transition.selection.evidenceId, null);
  assert.equal(transition.selection.dialogOpen, false);
}

const noPrimaryPayload = clone(payload);
const noPrimaryCase = noPrimaryPayload.inspector.cases.find(
  ({ case_id: caseId }) => caseId === "case:f3-insufficient-source",
);
noPrimaryPayload.inspector.default_case_id = noPrimaryCase.case_id;
noPrimaryCase.primary_evidence_id = null;
initializeScenarioData(noPrimaryPayload);
const noPrimaryOpen = dispatchWithoutF2Mutation({
  type: INSPECTOR_ACTIONS.openEvidence,
});
assert.equal(noPrimaryOpen.changed, false);
assert.equal(noPrimaryOpen.corrected, false);
assert.equal(noPrimaryOpen.reasonCode, "INSPECTOR_EVIDENCE_UNAVAILABLE");
assert.equal(noPrimaryOpen.selection.evidenceId, null);
assert.equal(noPrimaryOpen.selection.dialogOpen, false);

initializeScenarioData(payload);
const idempotentBefore = inspectorSelection();
const idempotent = dispatchWithoutF2Mutation({
  type: INSPECTOR_ACTIONS.selectCase,
  caseId: idempotentBefore.caseId,
});
assert.equal(idempotent.changed, false);
assert.equal(idempotent.corrected, false);
assert.deepEqual(idempotent.selection, idempotentBefore);

const legacyPayload = clone(payload);
legacyPayload.metadata.contract_version = "2.1.0";
delete legacyPayload.inspector;
const legacyContext = initializeScenarioData(legacyPayload);
assert.ok(legacyContext, "2.1 without inspector must preserve F2 initialization");
assert.deepEqual(inspectorSelection(), {
  available: false,
  reasonCode: "INSPECTOR_UNAVAILABLE",
  caseId: null,
  projectId: null,
  typologyId: null,
  evidenceId: null,
  preset: null,
  dialogOpen: false,
});
const unavailableTransition = dispatchInspector({
  type: INSPECTOR_ACTIONS.selectCase,
  caseId: "case:f3-ct-g-pardo",
});
assert.equal(unavailableTransition.changed, false);
assert.equal(unavailableTransition.reasonCode, "INSPECTOR_UNAVAILABLE");

for (const [name, mutate, expectedReason] of [
  [
    "malformed cases",
    (candidate) => {
      candidate.inspector.cases = null;
    },
    "INSPECTOR_INVALID_DATA",
  ],
  [
    "broken default",
    (candidate) => {
      candidate.inspector.default_case_id = "case:missing";
    },
    "INSPECTOR_INVALID_DEFAULT",
  ],
  [
    "cross reference",
    (candidate) => {
      candidate.model.facts.find(
        ({ fact_id: factId }) => factId === "fact:pardo-coast-card-area",
      ).observation_id = "observation:ct-d-countertop";
    },
    "INSPECTOR_INVALID_DATA",
  ],
]) {
  const candidate = clone(payload);
  mutate(candidate);
  const context = initializeScenarioData(candidate);
  assert.ok(context, `${name} must not break F2`);
  const selection = inspectorSelection();
  assert.equal(selection.available, false, name);
  assert.equal(selection.reasonCode, expectedReason, name);
  assert.equal(selection.caseId, null, name);
  assert.equal(selection.dialogOpen, false, name);
}

initializeScenarioData(payload);
dispatchInspector({
  type: INSPECTOR_ACTIONS.openEvidence,
});
assert.equal(state.inspectorDialogOpen, true);
initializeScenarioData(payload);
assert.equal(state.inspectorEvidenceId, null);
assert.equal(state.inspectorDialogOpen, false);
assert.equal(state.inspectorPreset, "case:f3-ct-g-pardo");

const documentListeners = new Map();
const windowListeners = new Map();
const focusLog = [];
const elements = new Map();
const element = (id) => ({
  id,
  textContent: "",
  focus() {
    focusLog.push(id);
  },
});
for (const id of [
  "inspector-live",
  "evidence-trigger",
  "evidence-trigger-b",
  "inspector-dialog-close",
  "inspector-evidence-dialog",
  "inspector-primary-action",
  "inspector-case-selector",
]) {
  elements.set(id, element(id));
}
const persistentPresetControl = {
  id: "persistent-preset-control",
  tagName: "BUTTON",
  value: "",
  dataset: {
    inspectorPreset: "certified",
  },
  listeners: [],
  addEventListener(type, listener) {
    this.listeners.push({ type, listener });
  },
};
const fakeLocation = {
  href: "https://demo.test/?sv=1#dashboard",
  pathname: "/",
  search: "?sv=1",
  hash: "#dashboard",
};
globalThis.window = {
  location: fakeLocation,
  history: {
    replaceState() {},
  },
  addEventListener(type, listener) {
    const listeners = windowListeners.get(type) ?? [];
    listeners.push(listener);
    windowListeners.set(type, listeners);
  },
};
globalThis.document = {
  querySelectorAll(selector) {
    return selector === "[data-inspector-preset]"
      ? [persistentPresetControl]
      : [];
  },
  querySelector() {
    return null;
  },
  getElementById(id) {
    return elements.get(id) ?? null;
  },
  addEventListener(type, listener) {
    const listeners = documentListeners.get(type) ?? [];
    listeners.push(listener);
    documentListeners.set(type, listeners);
  },
};

let renderCount = 0;
const render = () => {
  renderCount += 1;
  elements.get("inspector-live").textContent = "";
};
bindEvents(render);
bindEvents(render);
for (const eventName of Object.values(INSPECTOR_EVENTS)) {
  assert.equal(
    documentListeners.get(eventName)?.length,
    1,
    `${eventName} must bind once`,
  );
}
assert.equal(
  persistentPresetControl.listeners.length,
  1,
  "a persistent inspector control must bind exactly once",
);

initializeInspectorState(payload.inspector);
const invalidDefaultRenderBefore = renderCount;
const invalidAtDefault = selectInspectorCase("case:missing");
assert.equal(invalidAtDefault.corrected, true);
assert.equal(invalidAtDefault.changed, false);
assert.equal(
  renderCount,
  invalidDefaultRenderBefore + 1,
  "a corrected no-op must render once",
);
assert.ok(elements.get("inspector-live").textContent);

const persistentControlRenderBefore = renderCount;
persistentPresetControl.listeners[0].listener();
assert.equal(state.inspectorPreset, "case:f3-ct-d-finishes");
assert.equal(
  renderCount,
  persistentControlRenderBefore + 1,
  "one persistent handler must produce one transition",
);
selectInspectorCase("case:f3-ct-g-pardo", { render: false });

const openRenderBefore = renderCount;
const controllerOpen = openInspectorEvidence(null, {
  focusId: "evidence-trigger",
});
assert.equal(controllerOpen.changed, true);
assert.equal(renderCount, openRenderBefore + 1);
assert.ok(elements.get("inspector-live").textContent);
assert.equal(focusLog.at(-1), "inspector-dialog-close");

const reopenRenderBefore = renderCount;
openInspectorEvidence("evidence:pardo-coast-card-metadata", {
  focusId: "evidence-trigger-b",
});
assert.equal(renderCount, reopenRenderBefore, "reopen must not render unchanged state");
assert.equal(focusLog.at(-1), "inspector-dialog-close");

const closeRenderBefore = renderCount;
closeInspectorEvidence();
assert.equal(renderCount, closeRenderBefore + 1);
assert.equal(focusLog.at(-1), "evidence-trigger");
assert.ok(elements.get("inspector-live").textContent);

openInspectorEvidence(null, { focusId: "evidence-trigger" });
initializeScenarioData(payload);
openInspectorEvidence(null);
closeInspectorEvidence();
assert.equal(
  focusLog.at(-1),
  "inspector-primary-action",
  "opening after reinitialize without a trigger must clear the stale token",
);

openInspectorEvidence(null, { focusId: "evidence-trigger" });
initializeScenarioData(payload);
const focusCountBeforeClosedReinitialize = focusLog.length;
closeInspectorEvidence();
assert.equal(
  focusLog.length,
  focusCountBeforeClosedReinitialize,
  "closing an already reset dialog must not restore stale focus",
);

openInspectorEvidence(null, { focusId: "missing-trigger" });
closeInspectorEvidence();
assert.equal(
  focusLog.at(-1),
  "inspector-primary-action",
  "missing opener must use deterministic fallback",
);

const customCaseListeners = documentListeners.get(
  INSPECTOR_EVENTS.caseSelect,
);
for (const listener of customCaseListeners) {
  listener({
    detail: {
      routeSlug: "f3-floor-review",
      focusId: "inspector-case-selector",
    },
  });
}
assert.equal(state.inspectorPreset, "case:f3-floor-review");
assert.equal(focusLog.at(-1), "inspector-case-selector");

const malformedSelectionBefore = inspectorSelection();
const malformedRenderBefore = renderCount;
const malformedAnnouncementBefore =
  elements.get("inspector-live").textContent;
for (const eventName of [
  INSPECTOR_EVENTS.caseSelect,
  INSPECTOR_EVENTS.projectSelect,
  INSPECTOR_EVENTS.typologySelect,
  INSPECTOR_EVENTS.presetSelect,
]) {
  for (const detail of [
    undefined,
    null,
    "invalid",
    [],
    {},
    {
      caseId: 42,
      projectId: 42,
      typologyId: 42,
      preset: 42,
    },
  ]) {
    for (const listener of documentListeners.get(eventName)) {
      listener({ detail });
    }
  }
}
assert.deepEqual(inspectorSelection(), malformedSelectionBefore);
assert.equal(renderCount, malformedRenderBefore);
assert.equal(
  elements.get("inspector-live").textContent,
  malformedAnnouncementBefore,
);

for (const detail of [undefined, null, "invalid", []]) {
  for (const listener of documentListeners.get(
    INSPECTOR_EVENTS.evidenceOpen,
  )) {
    listener({ detail });
  }
}
assert.deepEqual(inspectorSelection(), malformedSelectionBefore);
assert.equal(renderCount, malformedRenderBefore);
for (const listener of documentListeners.get(INSPECTOR_EVENTS.evidenceOpen)) {
  listener({ detail: {} });
}
assert.equal(
  state.inspectorEvidenceId,
  caseById.get("case:f3-floor-review").primary_evidence_id,
  "an object detail may omit evidenceId to open primary evidence",
);
closeInspectorEvidence({ render: false });

delete globalThis.window;
delete globalThis.document;

const stateSource = await readFile(
  new URL("../public/js/state.js", import.meta.url),
  "utf8",
);
const controllerSource = await readFile(
  new URL("../public/js/controller.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(stateSource, /\b(?:document|window)\s*\./u);
assert.doesNotMatch(stateSource, /localeCompare/u);
const inspectorControllerStart = controllerSource.indexOf(
  "export function selectInspectorCase",
);
const inspectorControllerEnd = controllerSource.indexOf(
  "function runScenarioAction",
);
const inspectorControllerSource = controllerSource.slice(
  inspectorControllerStart,
  inspectorControllerEnd,
);
assert.doesNotMatch(inspectorControllerSource, /\bdispatchScenario\s*\(/u);
assert.doesNotMatch(
  inspectorControllerSource,
  /\b(?:history|location)\s*\./u,
);
assert.ok(controllerSource.includes("data-inspector-project"));
assert.ok(controllerSource.includes("data-inspector-typology"));
assert.ok(controllerSource.includes("data-inspector-preset"));
assert.ok(controllerSource.includes("data-inspector-evidence"));
assert.equal(
  (controllerSource.match(/let inspectorRestoreFocusId = null;/gu) ?? [])
    .length,
  1,
);

console.log(
  "inspector-state.mjs: PASS — deterministic selection, fail-closed data, evidence dialog, focus/events and strict F2 preservation verified.",
);
