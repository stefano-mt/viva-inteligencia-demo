import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  initializeScenarioData,
  state,
} from "../public/js/state.js";
import {
  buildInspectorViewModel,
  renderInspector,
  renderInspectorModel,
} from "../public/js/views/inspector.js";

const payload = JSON.parse(
  await readFile(
    new URL("../../../data/generated/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const css = await readFile(
  new URL("../public/styles/55-inspector.css", import.meta.url),
  "utf8",
);
const source = await readFile(
  new URL("../public/js/views/inspector.js", import.meta.url),
  "utf8",
);

const expectedCases = {
  "case:f3-area-match": ["certified", true, "controlled"],
  "case:f3-bathroom-conflict": ["inconsistent", false, "controlled"],
  "case:f3-bedroom-conflict": ["inconsistent", false, "controlled"],
  "case:f3-ct-a-area-types": ["certified", true, "controlled"],
  "case:f3-ct-b-price-conflict": ["inconsistent", false, "controlled"],
  "case:f3-ct-d-finishes": ["certified", true, "controlled"],
  "case:f3-ct-g-pardo": ["inconsistent", false, "observed"],
  "case:f3-floor-review": ["reviewable", false, "controlled"],
  "case:f3-illegible-area": ["illegible", false, "controlled"],
  "case:f3-insufficient-source": ["insufficient", false, "controlled"],
};
const expectedPresetValues = [
  "inconsistent",
  "certified",
  "reviewable",
  "insufficient_restricted",
];
const caseById = new Map(
  payload.inspector.cases.map((inspectorCase) => [
    inspectorCase.case_id,
    inspectorCase,
  ]),
);

assert.deepEqual(Object.keys(expectedCases).sort(), [...caseById.keys()].sort());

const models = new Map();
for (const [
  caseId,
  [qualityStatus, benchmarkEligible, provenance],
] of Object.entries(expectedCases)) {
  const inspectorCase = caseById.get(caseId);
  const input = {
    data: payload,
    projectId: inspectorCase.project_id,
    typologyId: inspectorCase.typology_id,
    preset: caseId,
  };
  const before = structuredClone(input);
  const first = buildInspectorViewModel(input);
  const second = buildInspectorViewModel(input);
  assert.deepEqual(input, before, `${caseId} input must stay pure`);
  assert.deepEqual(first, second, `${caseId} must render deterministically`);
  assert.equal(first.available, true, caseId);
  assert.equal(first.verdict.status, qualityStatus, caseId);
  assert.equal(first.verdict.eligible, benchmarkEligible, caseId);
  assert.equal(
    first.provenance.toLocaleLowerCase("es-PE"),
    provenance === "observed" ? "observado" : "controlado",
    caseId,
  );
  assert.equal(first.verdict.selectedTruthFactId, null, caseId);
  assert.equal(first.pilotCoverage.base, 30, caseId);
  assert.equal(first.pilotCoverage.enriched, 22, caseId);
  assert.equal(first.pilotCoverage.deep, 5, caseId);
  assert.deepEqual(first.inspectorCoverage, {
    cases: 10,
    observed: 1,
    controlled: 9,
    simulated: 0,
    typologies: 10,
    assets: 15,
  });
  const selectedPresetOptions = first.selectors.presets.filter(
    ({ selected }) => selected,
  );
  assert.equal(
    selectedPresetOptions.length,
    1,
    `${caseId} must mark exactly one current dossier`,
  );
  assert.equal(
    selectedPresetOptions[0].value,
    caseId,
    `${caseId} selected option must round-trip the current dossier`,
  );
  assert.equal(selectedPresetOptions[0].disabled, true, caseId);
  assert.equal(
    selectedPresetOptions[0].label,
    `Expediente actual · ${first.provenance} · ${first.verdict.statusLabel}`,
    caseId,
  );
  assert.deepEqual(
    first.selectors.presets.slice(1).map(
      ({ value, selected, disabled }) => ({
        value,
        selected,
        disabled,
      }),
    ),
    expectedPresetValues.map((value) => ({
      value,
      selected: false,
      disabled: false,
    })),
    `${caseId} must preserve four unselected shortcut values`,
  );

  const markup = renderInspectorModel(first);
  assert.equal(
    (markup.match(/class="inspector-primary-action"/gu) ?? []).length,
    1,
    `${caseId} must expose exactly one primary next action`,
  );
  assert.doesNotMatch(markup, /NaN|Infinity|undefined/gu, caseId);
  const presetMarkup = markup.match(
    /<select\s+id="inspector-case-selector"[\s\S]*?<\/select>/u,
  )?.[0];
  assert.ok(presetMarkup, `${caseId} preset selector must render`);
  assert.equal(
    (presetMarkup.match(/\sselected(?:\s|>)/gu) ?? []).length,
    1,
    `${caseId} preset markup must mark exactly one option`,
  );
  assert.match(
    presetMarkup,
    new RegExp(
      `<option value="${caseId.replace(
        /[.*+?^${}()|[\]\\]/gu,
        "\\$&",
      )}" selected disabled>Expediente actual · `,
      "u",
    ),
  );
  for (const detailsTag of markup.match(/<details\b[^>]*>/gu) ?? []) {
    assert.doesNotMatch(
      detailsTag,
      /\sopen(?:\s|=|>)/u,
      `${caseId} metadata must start closed`,
    );
  }
  models.set(caseId, first);
}

const ctG = models.get("case:f3-ct-g-pardo");
const ctGMarkup = renderInspectorModel(ctG);
for (const phrase of [
  "Muestra cuánta profundidad de fuente existe realmente",
  "Elige el proyecto y la tipología que vas a contrastar",
  "Resume si los datos son elegibles según las reglas de la demo",
  "Compara valores fuente por fuente y explica cada incompatibilidad",
  "Abre únicamente evidencia permitida y conserva su contexto",
  "Explica qué se usa, qué se excluye y cuál es el siguiente paso",
]) {
  assert.match(
    ctGMarkup,
    new RegExp(
      phrase.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"),
      "u",
    ),
  );
  assert.match(
    ctGMarkup,
    new RegExp(
      `<p class="inspector-module-help"(?: id="[^"]+")?>${phrase}</p>`,
      "u",
    ),
    `${phrase} must be visible rather than hidden in details`,
  );
}
for (const phrase of [
  "Pardo Coast",
  "Tipo 7",
  "Observado",
  "Inconsistente",
  "No elegible según las reglas de la demo",
  "Caso observado · evidencia presentada como transcripción controlada; no es el original.",
  "Revisar hallazgos",
  "El proyecto permanece en la lectura territorial",
]) {
  assert.ok(ctGMarkup.includes(phrase), phrase);
}
assert.match(
  ctGMarkup,
  /href="#inspector-row-area"[\s\S]*Revisar hallazgos/u,
);
assert.doesNotMatch(
  ctGMarkup.toLocaleLowerCase("es-PE"),
  /área techada|verdadero|falso|error/u,
);
assert.doesNotMatch(
  ctGMarkup,
  /https?:\/\/|assets\/evidence\/|[a-f0-9]{64}|<dialog\b|<table\b/u,
);
assert.equal(ctG.verdict.selectedTruthFactId, null);
assert.equal(ctG.presentation.canOpen, false);
assert.deepEqual(
  {
    project: ctG.metadata.projectName,
    agency: ctG.metadata.agencyName,
    district: ctG.metadata.district,
    status: ctG.metadata.projectStatus,
    cutoff: ctG.metadata.cutoffAt,
  },
  {
    project: "Pardo Coast",
    agency: "GRUPO T&C",
    district: "Miraflores",
    status: "En construcción",
    cutoff: payload.metadata.cutoff_at,
  },
);
for (const phrase of [
  "<dt>Proyecto</dt>",
  "<dd>Pardo Coast</dd>",
  "<dt>Inmobiliaria</dt>",
  "<dd>GRUPO T&amp;C</dd>",
  "<dt>Distrito</dt>",
  "<dd>Miraflores</dd>",
  "<dt>Estado del proyecto</dt>",
  "<dd>En construcción</dd>",
  "<dt>Fecha de corte</dt>",
]) {
  assert.ok(ctGMarkup.includes(phrase), phrase);
}

const ctD = models.get("case:f3-ct-d-finishes");
const ctDMarkup = renderInspectorModel(ctD);
for (const phrase of [
  "Certificado",
  "Controlado",
  "Abrir evidencia",
]) {
  assert.ok(ctDMarkup.includes(phrase), phrase);
}
assert.equal(ctD.verdict.eligible, true);
assert.equal(ctD.decision.excludedFactCount, 1);
assert.match(
  ctDMarkup,
  /data-inspector-evidence="evidence:ct-d-countertop-fragment"/u,
);
assert.doesNotMatch(ctDMarkup, /todos los hechos|todo certificado/iu);
assert.doesNotMatch(
  ctDMarkup,
  /granito|sha256|Documento controlado restringido/iu,
  "P3-07 must not expose fragment, hash or restricted-document detail",
);
for (const markup of [ctGMarkup, ctDMarkup]) {
  const metadataTag = markup.match(
    /<details class="inspector-metadata" data-inspector-metadata[^>]*>/u,
  )?.[0];
  assert.ok(metadataTag, "metadata hook must be present");
  assert.doesNotMatch(metadataTag, /\sopen(?:\s|=|>)/u);
}

for (const value of expectedPresetValues) {
  assert.match(
    ctGMarkup,
    new RegExp(`<option value="${value}"`, "u"),
  );
}
assert.match(
  ctGMarkup,
  /<option value="case:f3-ct-g-pardo" selected disabled>Expediente actual · Observado · Inconsistente<\/option>/u,
);
assert.match(
  ctDMarkup,
  /<option value="case:f3-ct-d-finishes" selected disabled>Expediente actual · Controlado · Certificado<\/option>/u,
);
assert.doesNotMatch(
  ctGMarkup,
  /<option value="inconsistent" selected/u,
);
assert.doesNotMatch(
  ctDMarkup,
  /<option value="certified" selected/u,
);
assert.match(ctGMarkup, /<option[^>]*>Pardo Coast · Observado<\/option>/u);
assert.match(
  ctGMarkup,
  /<option[^>]*>Tipo 7 · Observado<\/option>/u,
);
assert.match(
  ctGMarkup,
  /data-inspector-project|data-inspector-typology|data-inspector-preset/u,
);
const projectSelectorIndex = ctGMarkup.indexOf(
  'id="inspector-project-selector"',
);
const typologySelectorIndex = ctGMarkup.indexOf(
  'id="inspector-typology-selector"',
);
const caseSelectorIndex = ctGMarkup.indexOf(
  'id="inspector-case-selector"',
);
assert.ok(projectSelectorIndex >= 0);
assert.ok(projectSelectorIndex < typologySelectorIndex);
assert.ok(typologySelectorIndex < caseSelectorIndex);
for (const [name, hook] of [
  ["project", "data-inspector-project"],
  ["typology", "data-inspector-typology"],
  ["case", "data-inspector-preset"],
]) {
  assert.match(
    ctGMarkup,
    new RegExp(
      `<label for="inspector-${name}-selector">[\\s\\S]*?<select[\\s\\S]*?id="inspector-${name}-selector"[\\s\\S]*?${hook}[\\s\\S]*?aria-describedby="inspector-selection-help"`,
      "u",
    ),
  );
}
assert.match(
  ctGMarkup,
  /id="inspector-primary-action"[\s\S]*?data-inspector-primary/u,
);
assert.match(
  ctDMarkup,
  /id="inspector-primary-action"[\s\S]*?data-inspector-primary[\s\S]*?data-inspector-evidence=/u,
);
assert.match(
  ctGMarkup,
  /id="inspector-live"[\s\S]*?aria-live="polite"[\s\S]*?aria-atomic="true"/u,
);

const countMutation = structuredClone(payload);
Object.assign(countMutation.pilot.counts, {
  base_count: 31,
  enriched_count: 23,
  deep_count: 6,
});
Object.assign(countMutation.inspector.coverage, {
  total_cases: 12,
  observed_cases: 2,
  controlled_cases: 10,
  simulated_cases: 1,
  inspectable_typologies: 12,
  authorized_visual_assets: 18,
});
const mutatedCounts = buildInspectorViewModel({
  data: countMutation,
  projectId: caseById.get("case:f3-ct-g-pardo").project_id,
  typologyId: caseById.get("case:f3-ct-g-pardo").typology_id,
});
assert.deepEqual(mutatedCounts.pilotCoverage, {
  base: 31,
  enriched: 23,
  deep: 6,
});
assert.deepEqual(mutatedCounts.inspectorCoverage, {
  cases: 12,
  observed: 2,
  controlled: 10,
  simulated: 1,
  typologies: 12,
  assets: 18,
});
const mutatedCountMarkup = renderInspectorModel(mutatedCounts);
assert.match(
  mutatedCountMarkup,
  /style="--inspector-depth-weight: 31"[\s\S]*?<strong>31<\/strong>/u,
);
assert.match(
  mutatedCountMarkup,
  /style="--inspector-depth-weight: 23"[\s\S]*?<strong>23<\/strong>/u,
);
assert.match(
  mutatedCountMarkup,
  /style="--inspector-depth-weight: 6"[\s\S]*?<strong>6<\/strong>/u,
);

const laterEvidencePayload = structuredClone(payload);
laterEvidencePayload.model.evidence.find(
  ({ evidence_id: evidenceId }) =>
    evidenceId === "evidence:pardo-coast-card-metadata",
).captured_at = "2026-08-03T09:30:00-05:00";
const laterEvidenceModel = buildInspectorViewModel({
  data: laterEvidencePayload,
  projectId: caseById.get("case:f3-ct-g-pardo").project_id,
  typologyId: caseById.get("case:f3-ct-g-pardo").typology_id,
});
assert.equal(
  laterEvidenceModel.verdict.latestDate,
  "2026-08-03T09:30:00-05:00",
  "latest date must include evidence timestamps",
);
assert.match(
  renderInspectorModel(laterEvidenceModel),
  /datetime="2026-08-03T09:30:00-05:00"/u,
);

const fallbackPayload = structuredClone(payload);
const fallbackProject = fallbackPayload.model.projects.find(
  ({ project_id: projectId }) => projectId === "project:nexo-2951",
);
fallbackProject.location.district = null;
fallbackProject.status = null;
fallbackPayload.model.agencies.find(
  ({ agency_id: agencyId }) => agencyId === fallbackProject.agency_id,
).canonical_name = "";
fallbackPayload.metadata.cutoff_at = null;
const fallbackModel = buildInspectorViewModel({
  data: fallbackPayload,
  projectId: fallbackProject.project_id,
  typologyId: "typology:pardo-coast-tipo-7",
});
assert.deepEqual(
  {
    agency: fallbackModel.metadata.agencyName,
    district: fallbackModel.metadata.district,
    status: fallbackModel.metadata.projectStatus,
    cutoff: fallbackModel.metadata.cutoffLabel,
  },
  {
    agency: "Inmobiliaria no informada",
    district: "Distrito no informado",
    status: "Estado no informado",
    cutoff: "Sin fecha",
  },
);

const expectedFieldMutation = structuredClone(payload);
for (const inspectorCase of expectedFieldMutation.inspector.cases) {
  inspectorCase.expected_quality_status =
    inspectorCase.expected_quality_status === "certified"
      ? "inconsistent"
      : "certified";
  inspectorCase.expected_benchmark_eligible =
    !inspectorCase.expected_benchmark_eligible;
}
const expectedIndependent = buildInspectorViewModel({
  data: expectedFieldMutation,
  projectId: caseById.get("case:f3-ct-g-pardo").project_id,
  typologyId: caseById.get("case:f3-ct-g-pardo").typology_id,
});
assert.equal(expectedIndependent.verdict.status, "inconsistent");
assert.equal(expectedIndependent.verdict.eligible, false);

const malicious = structuredClone(payload);
malicious.model.projects.find(
  ({ project_id: projectId }) => projectId === "project:nexo-2951",
).canonical_name = '<img src=x onerror="globalThis.pwned=true">';
malicious.model.typologies.find(
  ({ typology_id: typologyId }) =>
    typologyId === "typology:pardo-coast-tipo-7",
).model = '<script data-test="typology">pwned()</script>';
const escapedMarkup = renderInspectorModel(
  buildInspectorViewModel({
    data: malicious,
    projectId: caseById.get("case:f3-ct-g-pardo").project_id,
    typologyId: caseById.get("case:f3-ct-g-pardo").typology_id,
  }),
);
assert.doesNotMatch(escapedMarkup, /<img src=x|<script data-test/u);
assert.match(
  escapedMarkup,
  /&lt;img src=x onerror=&quot;globalThis\.pwned=true&quot;&gt;/u,
);
assert.match(
  escapedMarkup,
  /&lt;script data-test=&quot;typology&quot;&gt;pwned\(\)&lt;\/script&gt;/u,
);

assert.deepEqual(buildInspectorViewModel(), {
  available: false,
  reasonCode: "INSPECTOR_DATA_UNAVAILABLE",
  message:
    "No hay datos de evidencia disponibles para abrir el inspector.",
});
const invalidSelection = buildInspectorViewModel({
  data: payload,
  projectId: "project:missing",
  typologyId: "typology:missing",
});
assert.equal(invalidSelection.available, false);
assert.equal(invalidSelection.reasonCode, "INSPECTOR_INVALID_DATA");
assert.match(
  renderInspectorModel(invalidSelection),
  /Inspector no disponible/,
);

initializeScenarioData(payload);
assert.equal(state.inspectorPreset, "case:f3-ct-g-pardo");
assert.equal(renderInspector(), ctGMarkup);

assert.match(source, /\bbuildEvidenceDossier\s*\(/u);
assert.match(source, /\bresolveEvidencePresentation\s*\(/u);
assert.doesNotMatch(source, /expected_quality_status|expected_benchmark_eligible/u);
assert.doesNotMatch(source, /case:f3-|ct-g|ct-d/iu);
assert.doesNotMatch(source, /controller\.js|INSPECTOR_PRESET_CASE_IDS/u);
assert.doesNotMatch(source, /\b(?:window|fetch)\b|document\./u);
assert.doesNotMatch(
  source,
  /--inspector-depth-weight:\s*(?:30|22|5)(?:["';\s]|$)/u,
);

assert.doesNotMatch(css, /@import|url\s*\(/iu);
assert.doesNotMatch(
  css,
  /grid-template-columns:\s*30fr\s+22fr\s+(?:5|8)fr/u,
);
assert.match(
  css,
  /flex-grow:\s*var\(--inspector-depth-weight,\s*1\)/u,
);
assert.match(css, /flex-basis:\s*0/u);
assert.match(css, /min-height:\s*4[46]px/u);
assert.match(css, /:focus-visible/u);
assert.match(css, /@media\s*\(max-width:\s*620px\)/u);
assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/u);
assert.match(css, /\.inspector-custody::before/u);
assert.match(css, /\.inspector-sr-only\s*\{[\s\S]*?clip-path:\s*inset\(50%\)/u);
assert.match(css, /var\(--(?:teal|action|surface|line)/u);

console.log(
  "inspector-view.mjs: PASS — 10 cases, derived coverage, CT-G/CT-D, purity, escaping, hooks, closed metadata and responsive CSS verified.",
);
