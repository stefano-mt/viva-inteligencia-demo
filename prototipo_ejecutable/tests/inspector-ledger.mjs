import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildInspectorViewModel,
  renderInspectorModel,
} from "../public/js/views/inspector.js";

const payload = JSON.parse(
  await readFile(
    new URL("../public/demo-data/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const source = await readFile(
  new URL("../public/js/views/inspector.js", import.meta.url),
  "utf8",
);
const css = await readFile(
  new URL("../public/styles/55-inspector.css", import.meta.url),
  "utf8",
);
const clone = (value) => structuredClone(value);
const ledgerOrder = [
  "area",
  "floor_unit",
  "model",
  "bedrooms",
  "bathrooms",
];

function modelFor(caseId, data = payload) {
  const inspectorCase = data.inspector.cases.find(
    ({ case_id: candidateId }) => candidateId === caseId,
  );
  assert.ok(inspectorCase, `Missing ${caseId}`);
  return buildInspectorViewModel({
    data,
    projectId: inspectorCase.project_id,
    typologyId: inspectorCase.typology_id,
  });
}

function ledgerMarkup(model) {
  const markup = renderInspectorModel(model);
  const start = markup.indexOf(
    '<section class="inspector-module inspector-ledger-shell"',
  );
  const end = markup.indexOf(
    '<section class="inspector-module inspector-viewer-shell"',
    start,
  );
  assert.ok(start >= 0 && end > start, "ledger section must render");
  return markup.slice(start, end);
}

function assertUnavailable(candidate, label) {
  const model = modelFor("case:f3-ct-g-pardo", candidate);
  assert.equal(model.available, false, label);
  assert.doesNotMatch(renderInspectorModel(model), /inspector-ledger-row/u);
}

const ctGInput = clone(payload);
const ctGBefore = clone(ctGInput);
const ctG = modelFor("case:f3-ct-g-pardo", ctGInput);
assert.deepEqual(ctGInput, ctGBefore, "view-model must not mutate input");
assert.deepEqual(
  ctG,
  modelFor("case:f3-ct-g-pardo", ctGInput),
  "view-model must be deterministic",
);
assert.equal(ctG.available, true);
assert.deepEqual(
  ctG.ledger.map(({ key }) => key),
  ledgerOrder,
  "ledger must contain exactly five normative rows in order",
);
assert.equal(ctG.ledger.length, 5);
assert.ok(ctG.ledger.every(({ key }) => key !== "other"));

const ctGMarkup = ledgerMarkup(ctG);
assert.equal(
  (ctGMarkup.match(/data-inspector-ledger-row="/gu) ?? []).length,
  5,
);
assert.match(
  ctGMarkup,
  /Campo[\s\S]*Fuente A[\s\S]*Fuente B[\s\S]*Lectura/u,
);
let previousRowPosition = -1;
for (const key of ledgerOrder) {
  const id = `inspector-row-${key}`;
  const position = ctGMarkup.indexOf(`id="${id}"`);
  assert.ok(position > previousRowPosition, `${id} must preserve row order`);
  assert.match(
    ctGMarkup,
    new RegExp(`id="${id}"[\\s\\S]*?tabindex="-1"`, "u"),
  );
  previousRowPosition = position;
}
assert.equal(ctG.primaryAction.destination, "#inspector-row-area");

const areaRow = ctG.ledger[0];
assert.equal(areaRow.status, "inconsistent");
assert.equal(areaRow.benchmarkBlocking, true);
assert.equal(areaRow.sources[0].values[0].original, "104.15 m²");
assert.equal(areaRow.sources[0].values[0].normalized, "104.15 m² · Tipo de área no declarado");
assert.equal(areaRow.sources[1].values[0].original, "Área Total 53.37 m2");
assert.equal(areaRow.sources[1].values[0].normalized, "53.37 m² · Área total");
assert.deepEqual(areaRow.reading.areaCalculation, {
  expression: "104.15 − 53.37 = 50.78 m²",
  relative: "48.76% · base: tarjeta",
});
assert.ok(areaRow.reading.issues[0].detail);
assert.ok(areaRow.reading.issues[0].nextAction);
assert.match(
  ctGMarkup,
  /104\.15 − 53\.37 = 50\.78 m²[\s\S]*48\.76% · base: tarjeta/u,
);
assert.match(ctGMarkup, /Valor derivado · Cálculo documentado/u);
assert.doesNotMatch(ctGMarkup, /área techada|\berror\b|\bfalso\b/iu);

const floorRow = ctG.ledger[1];
assert.equal(floorRow.status, "reviewable");
assert.equal(floorRow.benchmarkBlocking, true);
assert.deepEqual(floorRow.reading.floorInference, {
  value: "8–10",
  confidence: "baja",
});
assert.match(
  ctGMarkup,
  /Valor derivado · Inferencia de pisos[\s\S]*8–10[\s\S]*Confianza baja/u,
);

for (const key of ["model", "bedrooms", "bathrooms"]) {
  const row = ctG.ledger.find(({ key: rowKey }) => rowKey === key);
  assert.equal(row.status, "insufficient");
  assert.equal(row.benchmarkBlocking, false);
  assert.deepEqual(
    row.sources.map(({ values }) => values[0].original),
    ["No observado", "No observado"],
  );
}

const ctGEvidenceActions = ctG.ledger.flatMap(({ sources }) =>
  sources.flatMap(({ actions }) => actions),
);
assert.deepEqual(
  ctGEvidenceActions.map(({ evidenceId }) => evidenceId),
  [
    "evidence:pardo-coast-card-metadata",
    "evidence:pardo-coast-plan-metadata",
    "evidence:pardo-coast-card-metadata",
    "evidence:pardo-coast-plan-metadata",
  ],
);
assert.deepEqual(
  ctGEvidenceActions.map(({ modeLabel }) => modeLabel),
  [
    "Permiso pendiente",
    "Evidencia restringida",
    "Permiso pendiente",
    "Evidencia restringida",
  ],
);
assert.equal(
  (ctGMarkup.match(/class="inspector-ledger-evidence"/gu) ?? []).length,
  4,
  "CT-G must expose four contextual evidence buttons",
);
assert.equal(
  (ctGMarkup.match(/>\s*Ver evidencia\s*<\/button>/gu) ?? []).length,
  4,
);
assert.equal(
  ctG.ledger
    .flatMap(({ sources }) => sources)
    .filter(({ method }) => method === "Derivación determinista")
    .length,
  0,
  "derived observations must never become source columns",
);

const rawEligiblePayload = clone(payload);
const rawEligibleCase = rawEligiblePayload.inspector.cases.find(
  ({ case_id: caseId }) => caseId === "case:f3-ct-g-pardo",
);
const rawEligibleFact = rawEligiblePayload.model.facts.find(
  ({ fact_id: factId, field_name: fieldName }) =>
    fieldName === "published_area" &&
    rawEligibleCase.fact_ids.includes(factId),
);
rawEligibleFact.benchmark_eligible = true;
assert.equal(rawEligibleFact.quality_status, "inconsistent");
const rawEligibleModel = modelFor(
  "case:f3-ct-g-pardo",
  rawEligiblePayload,
);
assert.equal(rawEligibleModel.available, true);
assert.equal(
  rawEligibleModel.ledger[0].sources[0].eligibilityLabel,
  "No elegible según las reglas de la demo",
  "row excludedFactIds must override a raw benchmark_eligible=true fact",
);

const ctD = modelFor("case:f3-ct-d-finishes");
assert.equal(ctD.available, true);
assert.deepEqual(ctD.ledger.map(({ key }) => key), ledgerOrder);
assert.ok(
  ctD.ledger.every(
    (row) =>
      row.status === "insufficient" &&
      row.sources.every(({ observed }) => observed === false),
  ),
);
const ctDMarkup = ledgerMarkup(ctD);
assert.doesNotMatch(
  ctDMarkup,
  /cuarzo|aire acondicionado|countertop|air_conditioning/iu,
  "CT-D other facts must not contaminate the five-row ledger",
);
assert.equal(
  (ctDMarkup.match(/No observado/gu) ?? []).length,
  10,
);

const mutated = clone(payload);
const factByField = new Map(
  mutated.model.facts.map((fact) => [fact.field_name, fact]),
);
factByField.get("published_area").original_value = "Origen <mutado>";
factByField.get("published_area").normalized_value = 111.11;
factByField.get("total_area").original_value = "Segundo valor mutado";
factByField.get("total_area").normalized_value = 44.44;
factByField.get("area_source_delta").normalized_value = 66.67;
factByField.get("area_source_delta_percent").normalized_value = 60.01;
mutated.model.observations.find(
  ({ observation_id: observationId }) =>
    observationId === "observation:pardo-coast-card",
).captured_at = "2031-02-03T04:05:06Z";
mutated.model.sources.find(
  ({ source_id: sourceId }) => sourceId === "source:nexo",
).name = "Fuente <mutada>";
const mutatedIssue = mutated.model.issues.find(
  ({ issue_code: issueCode }) => issueCode === "AREA_SOURCE_CONFLICT",
);
mutatedIssue.detail = 'Detalle <script data-xss="detail">pwned()</script>';
mutatedIssue.next_action = 'Acción <img src=x onerror="pwned()">';
const mutatedModel = modelFor("case:f3-ct-g-pardo", mutated);
assert.equal(mutatedModel.available, true);
assert.deepEqual(mutatedModel.ledger[0].reading.areaCalculation, {
  expression: "111.11 − 44.44 = 66.67 m²",
  relative: "60.01% · base: tarjeta",
});
assert.equal(mutatedModel.ledger[0].sources[0].capturedAt, "2031-02-03T04:05:06Z");
assert.equal(mutatedModel.ledger[0].sources[0].sourceName, "Fuente <mutada>");
const mutatedMarkup = ledgerMarkup(mutatedModel);
assert.match(mutatedMarkup, /Origen &lt;mutado&gt;/u);
assert.match(mutatedMarkup, /Fuente &lt;mutada&gt;/u);
assert.match(mutatedMarkup, /Detalle &lt;script data-xss=/u);
assert.match(mutatedMarkup, /Acción &lt;img src=x onerror=/u);
assert.doesNotMatch(
  mutatedMarkup,
  /<script data-xss=|<img src=x|111\.11 − 53\.37|50\.78|48\.76/u,
);

const unknownPayload = clone(payload);
const unknownCase = unknownPayload.inspector.cases.find(
  ({ case_id: caseId }) => caseId === "case:f3-ct-g-pardo",
);
const unknownFloor = unknownPayload.model.facts.find(
  ({ fact_id: factId, field_name: fieldName }) =>
    fieldName === "floor_label" && unknownCase.fact_ids.includes(factId),
);
unknownFloor.original_value = null;
unknownFloor.normalized_value = "unknown";
const unknownModel = modelFor("case:f3-ct-g-pardo", unknownPayload);
assert.equal(
  unknownModel.ledger[1].sources[0].values[0].original,
  "No determinado",
);
assert.equal(
  unknownModel.ledger[1].sources[0].values[0].normalized,
  "No determinado",
);

for (const [label, mutate] of [
  [
    "missing fact observation",
    (candidate) => {
      candidate.model.facts.find(
        ({ field_name: fieldName }) => fieldName === "published_area",
      ).observation_id = "observation:missing";
    },
  ],
  [
    "empty source name",
    (candidate) => {
      candidate.model.sources.find(
        ({ source_id: sourceId }) => sourceId === "source:nexo",
      ).name = " ";
    },
  ],
  [
    "invalid observation date",
    (candidate) => {
      candidate.model.observations.find(
        ({ observation_id: observationId }) =>
          observationId === "observation:pardo-coast-card",
      ).captured_at = "not-a-date";
    },
  ],
  [
    "invalid evidence backlink",
    (candidate) => {
      candidate.model.observations.find(
        ({ observation_id: observationId }) =>
          observationId === "observation:pardo-coast-card",
      ).evidence_ids = [];
    },
  ],
]) {
  const candidate = clone(payload);
  mutate(candidate);
  assertUnavailable(candidate, label);
}

const allMarkup = renderInspectorModel(ctG);
const ids = [...allMarkup.matchAll(/\sid="([^"]+)"/gu)].map((match) => match[1]);
assert.equal(ids.length, new Set(ids).size, "rendered IDs must be unique");
assert.doesNotMatch(
  ctGMarkup,
  /\bhref=|\bsrc=|\bfetch\b|source_url|assets\/|public_asset_path|sha256|[a-f0-9]{64}|fragment/iu,
  "ledger must not expose sensitive paths, links, hashes or fragments",
);
assert.doesNotMatch(
  source,
  /104\.15|53\.37|50\.78|48\.76|Piso 1|807[–-]1007|pardo-coast|expected_/u,
  "ledger source must derive the frozen scenario entirely from data",
);

assert.match(
  css,
  /\.inspector-ledger-head,[\s\S]*grid-template-columns:/u,
);
assert.match(css, /\.inspector-ledger-row:focus-visible/u);
assert.match(
  css,
  /\.inspector-ledger-evidence\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px;/u,
);
assert.match(css, /\.inspector-ledger-evidence:focus-visible/u);
assert.match(
  css,
  /@media \(max-width: 760px\)[\s\S]*?\.inspector-ledger-row\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/u,
);
assert.match(
  css,
  /@media \(max-width: 760px\)[\s\S]*?\.inspector-ledger-mobile-label\s*\{[\s\S]*?position:\s*static/u,
);
assert.doesNotMatch(
  css.match(/@media \(max-width: 760px\)[\s\S]*?(?=@media|$)/u)?.[0] ?? "",
  /overflow-x:\s*(?:auto|scroll)/u,
);

console.log(
  "inspector-ledger.mjs: PASS — five-row ledger, CT-G calculations, CT-D isolation, traceability, evidence ownership, escaping and responsive accessibility verified.",
);
