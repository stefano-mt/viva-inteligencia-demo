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
const caseById = new Map(
  payload.inspector.cases.map((inspectorCase) => [
    inspectorCase.case_id,
    inspectorCase,
  ]),
);

function viewerModel({
  caseId,
  evidenceId,
  data = payload,
  dialogOpen = true,
}) {
  const inspectorCase = data.inspector.cases.find(
    ({ case_id: candidateId }) => candidateId === caseId,
  );
  assert.ok(inspectorCase, `Missing ${caseId}`);
  return buildInspectorViewModel({
    data,
    projectId: inspectorCase.project_id,
    typologyId: inspectorCase.typology_id,
    evidenceId,
    dialogOpen,
  });
}

function dialogMarkup(model) {
  return renderInspectorModel(model).match(
    /<dialog\b[\s\S]*?<\/dialog>/u,
  )?.[0] ?? "";
}

function assertViewerFailsClosed(model, label) {
  assert.ok(
    model.available === false ||
      (model.viewer === null && model.dialogOpen === false),
    `${label} must fail closed`,
  );
  assert.doesNotMatch(
    renderInspectorModel(model),
    /<dialog\b|\bsrc=|data-inspector-hash="complete"/u,
    `${label} must not render evidence content`,
  );
}

const controlledPayload = clone(payload);
controlledPayload.model.evidence.find(
  ({ evidence_id: evidenceId }) =>
    evidenceId === "evidence:ct-d-countertop-fragment",
).kind = "transcription";

const unavailablePayload = clone(payload);
unavailablePayload.model.evidence.find(
  ({ evidence_id: evidenceId }) =>
    evidenceId === "evidence:ct-d-countertop-fragment",
).fragment = null;

const matrix = [
  {
    mode: "asset",
    caseId: "case:f3-area-match",
    evidenceId: "evidence:f3-area-match-card",
    data: payload,
  },
  {
    mode: "fragment",
    caseId: "case:f3-ct-d-finishes",
    evidenceId: "evidence:ct-d-countertop-fragment",
    data: payload,
  },
  {
    mode: "restricted",
    caseId: "case:f3-ct-d-finishes",
    evidenceId: "evidence:ct-d-restricted-metadata",
    data: payload,
  },
  {
    mode: "pending",
    caseId: "case:f3-ct-g-pardo",
    evidenceId: "evidence:pardo-coast-card-metadata",
    data: payload,
  },
  {
    mode: "controlled_transcription",
    caseId: "case:f3-ct-d-finishes",
    evidenceId: "evidence:ct-d-countertop-fragment",
    data: controlledPayload,
  },
  {
    mode: "unavailable",
    caseId: "case:f3-ct-d-finishes",
    evidenceId: "evidence:ct-d-countertop-fragment",
    data: unavailablePayload,
  },
];

for (const fixture of matrix) {
  const input = {
    data: fixture.data,
    projectId: fixture.data.inspector.cases.find(
      ({ case_id: caseId }) => caseId === fixture.caseId,
    ).project_id,
    typologyId: fixture.data.inspector.cases.find(
      ({ case_id: caseId }) => caseId === fixture.caseId,
    ).typology_id,
    evidenceId: fixture.evidenceId,
    dialogOpen: true,
  };
  const before = clone(input);
  const first = buildInspectorViewModel(input);
  const second = buildInspectorViewModel(input);
  assert.deepEqual(input, before, `${fixture.mode} input purity`);
  assert.deepEqual(first, second, `${fixture.mode} determinism`);
  assert.equal(first.available, true, fixture.mode);
  assert.equal(first.dialogOpen, true, fixture.mode);
  assert.equal(first.viewer.safe, true, fixture.mode);
  assert.equal(first.viewer.mode, fixture.mode);
  assert.equal(first.viewer.evidenceId, fixture.evidenceId);
  for (const field of [
    "title",
    "type",
    "capturedLabel",
    "source",
    "method",
    "provenance",
  ]) {
    assert.ok(first.viewer[field], `${fixture.mode}.${field}`);
  }
  const markup = dialogMarkup(first);
  assert.ok(markup, `${fixture.mode} dialog`);
  const dialogTag = markup.match(/<dialog\b[^>]*>/u)?.[0];
  assert.ok(dialogTag);
  assert.doesNotMatch(dialogTag, /\sopen(?:\s|=|>)/u);
  assert.match(dialogTag, /id="inspector-evidence-dialog"/u);
  assert.match(dialogTag, /aria-modal="true"/u);
  assert.match(dialogTag, /aria-labelledby="inspector-evidence-dialog-title"/u);
  assert.match(dialogTag, /aria-describedby="inspector-evidence-description"/u);
  assert.match(
    markup,
    /id="inspector-dialog-close"[\s\S]*?data-inspector-close/u,
  );
  assert.match(
    markup,
    /data-inspector-hash="abbreviated">[a-f0-9]{8}…<\/code>/u,
    `${fixture.mode} must lead with an abbreviated hash`,
  );

  if (fixture.mode === "asset") {
    assert.match(
      markup,
      /<img\s+src="assets\/evidence\/[A-Za-z0-9._/-]+"/u,
    );
    assert.match(markup, />Original autorizado</u);
    assert.match(
      markup,
      /Representación controlada para demo; no es el documento original\./u,
    );
    assert.doesNotMatch(markup, /<blockquote|inspector-evidence-blocked/u);
  } else if (fixture.mode === "fragment") {
    assert.match(markup, /<blockquote class="inspector-evidence-fragment">/u);
    assert.match(markup, /Cubierta de cocina: cuarzo\./u);
    assert.match(markup, />Fragmento autorizado</u);
    assert.match(
      markup,
      /Representación controlada para demo; no es el documento original\./u,
    );
    assert.doesNotMatch(markup, /<img|inspector-evidence-blocked/u);
  } else if (fixture.mode === "controlled_transcription") {
    assert.match(markup, /<blockquote class="inspector-evidence-fragment">/u);
    assert.match(
      markup,
      /Representación controlada para demo; no es el documento original\./u,
    );
    assert.doesNotMatch(markup, /<img|inspector-evidence-blocked/u);
  } else {
    assert.match(markup, /class="inspector-evidence-blocked"/u);
    assert.doesNotMatch(markup, /<img|<blockquote|inspector-transcription-warning/u);
    assert.doesNotMatch(
      markup,
      /\bsrc=|\bhref=|assets\/evidence\/|data-src|[a-f0-9]{64}/u,
      `${fixture.mode} must expose no binary, path, link or full hash`,
    );
    assert.equal(first.viewer.publicUrl, null);
    assert.equal(first.viewer.content, null);
    assert.equal(first.viewer.hash?.full, null);
    assert.doesNotMatch(markup, /<details\b|Ver huella completa/u);
  }

  if (["asset", "fragment", "controlled_transcription"].includes(fixture.mode)) {
    assert.match(
      markup,
      /<details class="inspector-full-hash">\s*<summary>Ver huella completa<\/summary>\s*<code data-inspector-hash="complete">[a-f0-9]{64}<\/code>/u,
    );
    assert.doesNotMatch(
      markup.match(/<details\b[^>]*>/u)?.[0] ?? "",
      /\sopen(?:\s|=|>)/u,
      "full hash disclosure must start closed",
    );
  }
}

assert.deepEqual(
  new Set(
    payload.inspector.cases.flatMap((inspectorCase) =>
      inspectorCase.evidence_ids.map((evidenceId) =>
        viewerModel({
          caseId: inspectorCase.case_id,
          evidenceId,
        }).viewer.mode,
      ),
    ),
  ),
  new Set(["asset", "fragment", "restricted", "pending"]),
  "payload navigation must expose exactly four real modes",
);

const manifestControlledPayload = clone(payload);
manifestControlledPayload.inspector.cases.find(
  ({ case_id: caseId }) => caseId === "case:f3-area-match",
).provenance_classification = "observed";
const manifestControlledAsset = viewerModel({
  caseId: "case:f3-area-match",
  evidenceId: "evidence:f3-area-match-card",
  data: manifestControlledPayload,
});
assert.equal(manifestControlledAsset.viewer.controlledRepresentation, true);
assert.match(
  dialogMarkup(manifestControlledAsset),
  /Representación controlada para demo; no es el documento original\./u,
  "controlled_original manifest provenance must keep the warning visible",
);

const ctDFragment = viewerModel({
  caseId: "case:f3-ct-d-finishes",
  evidenceId: "evidence:ct-d-countertop-fragment",
});
assert.equal(ctDFragment.viewer.page, 1);
assert.match(ctDFragment.viewer.hash.abbreviated, /^[a-f0-9]{8}…$/u);
assert.equal(ctDFragment.viewer.hash.full.length, 64);
assert.ok(ctDFragment.viewer.relatedFacts.length > 0);
assert.equal(ctDFragment.viewer.method, "Transcripción controlada");
assert.deepEqual(
  ctDFragment.viewer.relatedFacts.map(({ field, confidence }) => ({
    field,
    confidence,
  })),
  [{ field: "Material de la cubierta", confidence: "alta" }],
);
assert.match(
  dialogMarkup(ctDFragment),
  /Transcripción controlada[\s\S]*Material de la cubierta[\s\S]*confianza alta/u,
);
assert.doesNotMatch(
  renderInspectorModel(ctDFragment),
  /controlled_transcription|user_provided_|deterministic_derivation|confianza (?:high|low|unknown)/u,
);

const ctDRestricted = viewerModel({
  caseId: "case:f3-ct-d-finishes",
  evidenceId: "evidence:ct-d-restricted-metadata",
});
assert.equal(ctDRestricted.viewer.mode, "restricted");
assert.equal(ctDRestricted.viewer.hash.full, null);
assert.equal(
  ctDRestricted.viewer.method,
  "Metadatos proporcionados por el usuario",
);
assert.doesNotMatch(
  dialogMarkup(ctDRestricted),
  /fragment|public_asset_path|document:ct-d-restricted/iu,
);

for (const [evidenceId, mode] of [
  ["evidence:pardo-coast-card-metadata", "pending"],
  ["evidence:pardo-coast-plan-metadata", "restricted"],
]) {
  const model = viewerModel({
    caseId: "case:f3-ct-g-pardo",
    evidenceId,
  });
  assert.equal(model.viewer.mode, mode);
  const markup = dialogMarkup(model);
  assert.doesNotMatch(
    renderInspectorModel(model),
    /user_provided_|deterministic_derivation|Published area|Floor label|confianza (?:high|low|unknown)/u,
    `CT-G ${mode} must localize technical labels`,
  );
  assert.doesNotMatch(
    markup,
    /https?:\/\/|assets\/evidence\/|\bsrc=|\bhref=|data-src|[a-f0-9]{64}/u,
    `CT-G ${mode} must expose zero binaries or URLs`,
  );
}

const ctGCard = viewerModel({
  caseId: "case:f3-ct-g-pardo",
  evidenceId: "evidence:pardo-coast-card-metadata",
});
assert.equal(
  ctGCard.viewer.method,
  "Transcripción de captura proporcionada por el usuario",
);
assert.deepEqual(
  ctGCard.viewer.relatedFacts.map(({ field, confidence }) => ({
    field,
    confidence,
  })),
  [
    { field: "Área publicada", confidence: "alta" },
    { field: "Piso publicado", confidence: "alta" },
  ],
);

const closedModel = viewerModel({
  caseId: "case:f3-ct-d-finishes",
  evidenceId: "evidence:ct-d-countertop-fragment",
  dialogOpen: false,
});
assert.equal(closedModel.dialogOpen, false);
assert.doesNotMatch(renderInspectorModel(closedModel), /<dialog\b/u);

const outsideOwnership = viewerModel({
  caseId: "case:f3-ct-d-finishes",
  evidenceId: "evidence:pardo-coast-card-metadata",
});
assert.equal(outsideOwnership.viewer, null);
assert.equal(outsideOwnership.dialogOpen, false);
assert.doesNotMatch(
  renderInspectorModel(outsideOwnership),
  /<dialog\b|evidence:pardo-coast-card-metadata/u,
);

const mismatchPayload = clone(payload);
mismatchPayload.model.evidence.find(
  ({ evidence_id: evidenceId }) =>
    evidenceId === "evidence:ct-d-countertop-fragment",
).document_id = "document:pardo-coast-card";
const mismatched = viewerModel({
  caseId: "case:f3-ct-d-finishes",
  evidenceId: "evidence:ct-d-countertop-fragment",
  data: mismatchPayload,
});
assert.equal(mismatched.available, false);
assert.doesNotMatch(renderInspectorModel(mismatched), /<dialog\b/u);

const crossObservationPayload = clone(payload);
crossObservationPayload.model.evidence.find(
  ({ evidence_id: evidenceId }) =>
    evidenceId === "evidence:ct-d-countertop-fragment",
).observation_id = "observation:ct-d-air-conditioning-absence";
assert.equal(
  crossObservationPayload.model.observations.find(
    ({ observation_id: observationId }) =>
      observationId === "observation:ct-d-air-conditioning-absence",
  ).source_id,
  "source:ct-d-authorized",
  "adversarial observation must share the original source",
);
assertViewerFailsClosed(
  viewerModel({
    caseId: "case:f3-ct-d-finishes",
    evidenceId: "evidence:ct-d-countertop-fragment",
    data: crossObservationPayload,
  }),
  "cross-observation evidence",
);

for (const evidenceIds of [null, []]) {
  const brokenObservationPayload = clone(payload);
  brokenObservationPayload.model.observations.find(
    ({ observation_id: observationId }) =>
      observationId === "observation:ct-d-countertop",
  ).evidence_ids = evidenceIds;
  assertViewerFailsClosed(
    viewerModel({
      caseId: "case:f3-ct-d-finishes",
      evidenceId: "evidence:ct-d-countertop-fragment",
      data: brokenObservationPayload,
    }),
    Array.isArray(evidenceIds)
      ? "observation missing reciprocal evidence"
      : "observation with non-array evidence ids",
  );
}

const assetCaseId = "case:f3-area-match";
const assetEvidenceId = "evidence:f3-area-match-card";
const assetDocumentId = "document:f3-area-match-card";
const buildAdversarialAsset = (mutate) => {
  const candidate = clone(payload);
  mutate(candidate);
  return viewerModel({
    caseId: assetCaseId,
    evidenceId: assetEvidenceId,
    data: candidate,
  });
};

assertViewerFailsClosed(
  buildAdversarialAsset((candidate) => {
    candidate.inspector.assets = candidate.inspector.assets.filter(
      ({ document_id: documentId }) => documentId !== assetDocumentId,
    );
  }),
  "asset without manifest entry",
);
assertViewerFailsClosed(
  buildAdversarialAsset((candidate) => {
    const asset = candidate.inspector.assets.find(
      ({ document_id: documentId }) => documentId === assetDocumentId,
    );
    asset.logical_path =
      candidate.inspector.assets.find(
        ({ document_id: documentId }) =>
          documentId === "document:f3-area-match-measurement",
      ).logical_path;
  }),
  "asset with foreign logical path",
);
assertViewerFailsClosed(
  buildAdversarialAsset((candidate) => {
    candidate.inspector.assets.find(
      ({ document_id: documentId }) => documentId === assetDocumentId,
    ).sha256 = "a".repeat(64);
  }),
  "asset with mismatched hash",
);
assertViewerFailsClosed(
  buildAdversarialAsset((candidate) => {
    candidate.inspector.assets.find(
      ({ document_id: documentId }) => documentId === assetDocumentId,
    ).document_id = "document:f3-area-match-measurement";
  }),
  "cross-document asset manifest",
);
assertViewerFailsClosed(
  buildAdversarialAsset((candidate) => {
    const asset = candidate.inspector.assets.find(
      ({ document_id: documentId }) => documentId === assetDocumentId,
    );
    candidate.inspector.assets.push({
      ...asset,
      asset_id: "asset:duplicate-adversarial",
    });
  }),
  "duplicate asset manifest entries",
);

const escapedPayload = clone(payload);
escapedPayload.model.documents.find(
  ({ document_id: documentId }) =>
    documentId === "document:ct-d-authorized",
).title = '<img src=x onerror="globalThis.pwned=true">';
escapedPayload.model.evidence.find(
  ({ evidence_id: evidenceId }) =>
    evidenceId === "evidence:ct-d-countertop-fragment",
).fragment = '<script data-attack="fragment">pwned()</script>';
escapedPayload.model.sources.find(
  ({ source_id: sourceId }) => sourceId === "source:ct-d-authorized",
).name = '<a href="https://evil.test">fuente</a>';
const escaped = dialogMarkup(
  viewerModel({
    caseId: "case:f3-ct-d-finishes",
    evidenceId: "evidence:ct-d-countertop-fragment",
    data: escapedPayload,
  }),
);
assert.doesNotMatch(escaped, /<img src=x|<script data-attack|<a href=/u);
assert.match(
  escaped,
  /&lt;img src=x onerror=&quot;globalThis\.pwned=true&quot;&gt;/u,
);
assert.match(
  escaped,
  /&lt;script data-attack=&quot;fragment&quot;&gt;pwned\(\)&lt;\/script&gt;/u,
);
assert.match(
  escaped,
  /&lt;a href=&quot;https:\/\/evil\.test&quot;&gt;fuente&lt;\/a&gt;/u,
);

const unsafeAssetPayload = clone(payload);
unsafeAssetPayload.model.documents.find(
  ({ document_id: documentId }) =>
    documentId === "document:f3-area-match-card",
).public_asset_path = "https://evil.test/asset.webp";
const unsafeAsset = viewerModel({
  caseId: "case:f3-area-match",
  evidenceId: "evidence:f3-area-match-card",
  data: unsafeAssetPayload,
});
assert.equal(unsafeAsset.available, false);
assert.doesNotMatch(renderInspectorModel(unsafeAsset), /\bsrc=|https:\/\/evil/u);

for (const region of [
  { x: 0, y: 0, width: 0, height: 0, coordinate_space: "normalized" },
  { x: -1, y: 0, width: 0.2, height: 0.2, coordinate_space: "normalized" },
  { x: 0.9, y: 0.9, width: 0.2, height: 0.2, coordinate_space: "normalized" },
  { x: 0, y: 0, width: Number.NaN, height: 0.2, coordinate_space: "normalized" },
  { x: 0, y: 0, width: 10, coordinate_space: "pixels" },
]) {
  const candidate = clone(payload);
  candidate.model.evidence.find(
    ({ evidence_id: evidenceId }) =>
      evidenceId === "evidence:f3-area-match-card",
  ).region = region;
  const model = viewerModel({
    caseId: "case:f3-area-match",
    evidenceId: "evidence:f3-area-match-card",
    data: candidate,
  });
  assert.equal(model.viewer.region, null);
  assert.doesNotMatch(dialogMarkup(model), /inspector-evidence-region/u);
}

const validRegionPayload = clone(payload);
validRegionPayload.model.evidence.find(
  ({ evidence_id: evidenceId }) =>
    evidenceId === "evidence:f3-area-match-card",
).region = {
  x: 0.1,
  y: 0.2,
  width: 0.3,
  height: 0.4,
  coordinate_space: "normalized",
};
const validRegion = viewerModel({
  caseId: "case:f3-area-match",
  evidenceId: "evidence:f3-area-match-card",
  data: validRegionPayload,
});
assert.deepEqual(validRegion.viewer.region, {
  left: 10,
  top: 20,
  width: 30,
  height: 40,
});
assert.match(
  dialogMarkup(validRegion),
  /class="inspector-evidence-region" style="left:10\.0000%;top:20\.0000%;width:30\.0000%;height:40\.0000%"/u,
);

assert.doesNotMatch(source, /\bfetch\s*\(|data-src|base64|data:image/iu);
assert.doesNotMatch(source, /\.toSorted\(|\.findLast\(|\.with\(/u);
assert.doesNotMatch(css, /@import|url\s*\(/iu);
assert.match(css, /\.inspector-dialog-grid[\s\S]*grid-template-columns:/u);
assert.match(css, /@media \(max-width: 620px\)[\s\S]*height:\s*100dvh/u);
assert.match(css, /\.inspector-dialog-close[\s\S]*min-height:\s*44px/u);
assert.match(css, /overflow-x:\s*hidden/u);
assert.match(css, /overflow-y:\s*auto/u);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/u);

console.log(
  "inspector-viewer.mjs: PASS — six modes, CT-D/CT-G, safe dialog, ownership, hashes, regions, escaping and responsive CSS verified.",
);
