export const INSPECTOR_QUALITY_PRECEDENCE = Object.freeze([
  "inconsistent",
  "illegible",
  "insufficient",
  "reviewable",
  "certified",
]);

export const INSPECTOR_ROW_ORDER = Object.freeze([
  "area",
  "floor_unit",
  "model",
  "bedrooms",
  "bathrooms",
  "other",
]);

const QUALITY_STATUSES = new Set(INSPECTOR_QUALITY_PRECEDENCE);
const PROVENANCE_CLASSIFICATIONS = new Set([
  "observed",
  "controlled",
  "simulated",
]);
const FACT_VALUE_KINDS = new Set(["observed", "derived", "simulated"]);
const PUBLISH_PERMISSIONS = new Set(["authorized", "restricted", "pending"]);
const AVAILABILITY_STATUSES = new Set([
  "available",
  "unavailable",
  "restricted",
]);
const EVIDENCE_KINDS = new Set([
  "fragment",
  "transcription",
  "structured_value",
  "image_region",
  "metadata",
]);
const CONTROLLED_TRANSCRIPTION_KINDS = new Set([
  "transcription",
  "structured_value",
  "metadata",
]);
const PUBLIC_ASSET_PATTERN =
  /^assets\/evidence\/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*(?:\/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)*$/u;

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value, name) {
  if (!isRecord(value)) throw new TypeError(`${name} must be an object`);
  return value;
}

function requireArray(value, name) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  return value;
}

function requireId(value, name) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

function requireBoolean(value, name) {
  if (typeof value !== "boolean") {
    throw new TypeError(`${name} must be a boolean`);
  }
  return value;
}

function requireEnum(value, values, name) {
  if (typeof value !== "string" || !values.has(value)) {
    throw new TypeError(`${name} has unsupported value ${String(value)}`);
  }
  return value;
}

function requireUniqueIds(records, idField, name) {
  const byId = new Map();
  for (const [index, record] of requireArray(records, name).entries()) {
    requireRecord(record, `${name}[${index}]`);
    const id = requireId(record[idField], `${name}[${index}].${idField}`);
    if (byId.has(id)) throw new Error(`${name} contains duplicate ${idField} ${id}`);
    byId.set(id, record);
  }
  return byId;
}

function requireIdList(value, name, { allowEmpty = true } = {}) {
  const ids = requireArray(value, name);
  if (!allowEmpty && ids.length === 0) {
    throw new RangeError(`${name} must not be empty`);
  }
  const seen = new Set();
  for (const [index, id] of ids.entries()) {
    requireId(id, `${name}[${index}]`);
    if (seen.has(id)) throw new Error(`${name} contains duplicate id ${id}`);
    seen.add(id);
  }
  return ids;
}

function resolveIds(ids, byId, name) {
  return ids.map((id) => {
    const record = byId.get(id);
    if (!record) throw new Error(`${name} references missing id ${id}`);
    return record;
  });
}

function normalizedFieldName(fact) {
  return String(fact?.field_name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase();
}

function rowKeyForFact(fact) {
  const field = normalizedFieldName(fact);
  const semanticType = String(fact?.semantic_type ?? "").toLowerCase();
  if (semanticType === "area" || field.includes("area")) return "area";
  if (
    field.includes("floor") ||
    field.includes("piso") ||
    field.includes("unit") ||
    field.includes("unidad") ||
    field.includes("department") ||
    field.includes("departamento")
  ) {
    return "floor_unit";
  }
  if (
    field.includes("bedroom") ||
    field.includes("dormitorio") ||
    field.includes("habitacion")
  ) {
    return "bedrooms";
  }
  if (
    field.includes("bathroom") ||
    field.includes("bano") ||
    field.includes("toilet")
  ) {
    return "bathrooms";
  }
  if (
    field === "model" ||
    field.includes("model") ||
    field.includes("typology") ||
    field.includes("tipologia")
  ) {
    return "model";
  }
  return "other";
}

function statusFrom(statuses, fallback = "certified") {
  return (
    INSPECTOR_QUALITY_PRECEDENCE.find((status) => statuses.has(status)) ??
    fallback
  );
}

function validateQualityStatus(value, name) {
  if (!QUALITY_STATUSES.has(value)) {
    throw new TypeError(`${name} has unsupported quality_status ${String(value)}`);
  }
}

function validateCompatibilityInputs({
  typology,
  observations,
  facts,
  issues,
  requiredFactIds,
}) {
  requireRecord(typology, "typology");
  requireId(typology.typology_id, "typology.typology_id");
  const observationById = requireUniqueIds(
    observations,
    "observation_id",
    "observations",
  );
  const factById = requireUniqueIds(facts, "fact_id", "facts");
  const issueById = requireUniqueIds(issues, "issue_id", "issues");

  for (const fact of facts) {
    validateQualityStatus(fact.quality_status, fact.fact_id);
    if (!observationById.has(fact.observation_id)) {
      throw new Error(
        `fact ${fact.fact_id} references missing observation ${String(
          fact.observation_id,
        )}`,
      );
    }
  }
  for (const issue of issues) {
    validateQualityStatus(issue.quality_status, issue.issue_id);
    requireIdList(issue.fact_ids, `${issue.issue_id}.fact_ids`);
    for (const factId of issue.fact_ids) {
      if (!factById.has(factId)) {
        throw new Error(`issue ${issue.issue_id} references missing fact ${factId}`);
      }
    }
  }

  const requiredIds =
    requiredFactIds === undefined
      ? facts.map(({ fact_id: factId }) => factId)
      : requireIdList(requiredFactIds, "requiredFactIds", { allowEmpty: false });
  if (requiredIds.length === 0) {
    throw new RangeError("required facts must not be empty");
  }
  for (const factId of requiredIds) {
    if (!factById.has(factId)) {
      throw new Error(`requiredFactIds references missing fact ${factId}`);
    }
  }

  return { factById, issueById, requiredIds };
}

export function evaluateCompatibility({
  typology,
  observations,
  facts,
  issues,
  requiredFactIds,
} = {}) {
  const { factById, requiredIds } = validateCompatibilityInputs({
    typology,
    observations,
    facts,
    issues,
    requiredFactIds,
  });
  const requiredSet = new Set(requiredIds);
  const blockingIssues = issues.filter(
    (issue) =>
      issue.benchmark_blocking === true &&
      issue.fact_ids.some((factId) => requiredSet.has(factId)),
  );
  const allBlockingFactIds = new Set(
    issues
      .filter((issue) => issue.benchmark_blocking === true)
      .flatMap((issue) => issue.fact_ids),
  );
  const requiredStatuses = new Set([
    ...requiredIds.map((factId) => factById.get(factId).quality_status),
    ...blockingIssues.map((issue) => issue.quality_status),
  ]);
  const rollupStatus = statusFrom(requiredStatuses);
  const eligibleFactIds = facts
    .filter(
      (fact) =>
        fact.quality_status === "certified" &&
        fact.benchmark_eligible === true &&
        !allBlockingFactIds.has(fact.fact_id),
    )
    .map(({ fact_id: factId }) => factId);
  const eligibleSet = new Set(eligibleFactIds);
  const excludedFactIds = facts
    .filter(({ fact_id: factId }) => !eligibleSet.has(factId))
    .map(({ fact_id: factId }) => factId);
  const benchmarkEligible =
    rollupStatus === "certified" &&
    requiredIds.every((factId) => eligibleSet.has(factId)) &&
    blockingIssues.length === 0;

  const rows = INSPECTOR_ROW_ORDER.map((key) => {
    const rowFacts = facts.filter((fact) => rowKeyForFact(fact) === key);
    const rowFactIds = new Set(rowFacts.map(({ fact_id: factId }) => factId));
    const rowIssues = issues.filter((issue) =>
      issue.fact_ids.some((factId) => rowFactIds.has(factId)),
    );
    const rowBlockingIssues = rowIssues.filter(
      (issue) => issue.benchmark_blocking === true,
    );
    const rowStatuses = new Set([
      ...rowFacts.map((fact) => fact.quality_status),
      ...rowBlockingIssues.map((issue) => issue.quality_status),
    ]);
    const observationIds = [
      ...new Set(rowFacts.map(({ observation_id: observationId }) => observationId)),
    ];
    return {
      key,
      factIds: rowFacts.map(({ fact_id: factId }) => factId),
      observationIds,
      issueIds: rowIssues.map(({ issue_id: issueId }) => issueId),
      status: rowFacts.length === 0 ? "insufficient" : statusFrom(rowStatuses),
      benchmarkBlocking: rowBlockingIssues.length > 0,
      eligibleFactIds: rowFacts
        .filter(({ fact_id: factId }) => eligibleSet.has(factId))
        .map(({ fact_id: factId }) => factId),
      excludedFactIds: rowFacts
        .filter(({ fact_id: factId }) => !eligibleSet.has(factId))
        .map(({ fact_id: factId }) => factId),
    };
  });

  return {
    rows,
    rollupStatus,
    benchmarkEligible,
    blockingIssueIds: blockingIssues.map(({ issue_id: issueId }) => issueId),
    eligibleFactIds,
    excludedFactIds,
    selectedTruthFactId: null,
  };
}

function validateModel(model) {
  requireRecord(model, "model");
  return {
    sources: requireUniqueIds(model.sources, "source_id", "model.sources"),
    agencies: requireUniqueIds(model.agencies, "agency_id", "model.agencies"),
    projects: requireUniqueIds(model.projects, "project_id", "model.projects"),
    typologies: requireUniqueIds(
      model.typologies,
      "typology_id",
      "model.typologies",
    ),
    observations: requireUniqueIds(
      model.observations,
      "observation_id",
      "model.observations",
    ),
    facts: requireUniqueIds(model.facts, "fact_id", "model.facts"),
    documents: requireUniqueIds(
      model.documents,
      "document_id",
      "model.documents",
    ),
    evidence: requireUniqueIds(
      model.evidence,
      "evidence_id",
      "model.evidence",
    ),
    issues: requireUniqueIds(model.issues, "issue_id", "model.issues"),
  };
}

function validateInspectorCaseLists(inspectorCase) {
  for (const field of [
    "source_ids",
    "observation_ids",
    "fact_ids",
    "document_ids",
    "evidence_ids",
    "issue_ids",
  ]) {
    requireIdList(inspectorCase[field], `inspectorCase.${field}`);
  }
  requireIdList(inspectorCase.required_fact_ids, "inspectorCase.required_fact_ids", {
    allowEmpty: false,
  });
}

function inspectableTypologiesForProject(inspector, projectId, maps) {
  const typologies = [];
  const seen = new Set();
  for (const inspectorCase of inspector.cases) {
    requireRecord(inspectorCase, "inspector.cases entry");
    if (inspectorCase.project_id !== projectId) continue;
    const typologyId = requireId(
      inspectorCase.typology_id,
      `${inspectorCase.case_id}.typology_id`,
    );
    const typology = maps.typologies.get(typologyId);
    if (!typology) {
      throw new Error(`${inspectorCase.case_id} references missing typology ${typologyId}`);
    }
    if (typology.project_id !== projectId) {
      throw new Error(`${typologyId} does not belong to project ${projectId}`);
    }
    if (!seen.has(typologyId)) {
      typologies.push(typology);
      seen.add(typologyId);
    }
  }
  return typologies;
}

export function buildEvidenceDossier({
  model,
  inspector,
  projectId,
  typologyId,
} = {}) {
  const maps = validateModel(model);
  requireRecord(inspector, "inspector");
  requireArray(inspector.cases, "inspector.cases");
  requireRecord(inspector.coverage, "inspector.coverage");
  requireId(projectId, "projectId");
  requireId(typologyId, "typologyId");

  requireUniqueIds(inspector.cases, "case_id", "inspector.cases");
  const matchingCases = inspector.cases.filter(
    (inspectorCase) =>
      inspectorCase.project_id === projectId &&
      inspectorCase.typology_id === typologyId,
  );
  if (matchingCases.length !== 1) {
    throw new Error(
      matchingCases.length === 0
        ? `no inspector case matches ${projectId} / ${typologyId}`
        : `inspector case selection is ambiguous for ${projectId} / ${typologyId}`,
    );
  }
  const inspectorCase = matchingCases[0];
  validateInspectorCaseLists(inspectorCase);

  const project = maps.projects.get(projectId);
  if (!project) throw new Error(`missing project ${projectId}`);
  if (!maps.agencies.has(project.agency_id)) {
    throw new Error(`project ${projectId} references missing agency ${project.agency_id}`);
  }
  const selectedTypology = maps.typologies.get(typologyId);
  if (!selectedTypology) throw new Error(`missing typology ${typologyId}`);
  if (selectedTypology.project_id !== projectId) {
    throw new Error(`typology ${typologyId} does not belong to project ${projectId}`);
  }

  const sources = resolveIds(
    inspectorCase.source_ids,
    maps.sources,
    "inspectorCase.source_ids",
  );
  const observations = resolveIds(
    inspectorCase.observation_ids,
    maps.observations,
    "inspectorCase.observation_ids",
  );
  const facts = resolveIds(
    inspectorCase.fact_ids,
    maps.facts,
    "inspectorCase.fact_ids",
  );
  const documents = resolveIds(
    inspectorCase.document_ids,
    maps.documents,
    "inspectorCase.document_ids",
  );
  const evidence = resolveIds(
    inspectorCase.evidence_ids,
    maps.evidence,
    "inspectorCase.evidence_ids",
  );
  const issues = resolveIds(
    inspectorCase.issue_ids,
    maps.issues,
    "inspectorCase.issue_ids",
  );
  const declaredSourceIds = new Set(inspectorCase.source_ids);
  const declaredObservationIds = new Set(inspectorCase.observation_ids);
  const declaredFactIds = new Set(inspectorCase.fact_ids);
  const declaredDocumentIds = new Set(inspectorCase.document_ids);
  const usedSourceIds = new Set();

  for (const observation of observations) {
    if (!declaredSourceIds.has(observation.source_id)) {
      throw new Error(
        `observation ${observation.observation_id} uses undeclared source ${observation.source_id}`,
      );
    }
    usedSourceIds.add(observation.source_id);
    if (
      ![
        projectId,
        typologyId,
        ...inspectorCase.document_ids,
      ].includes(observation.entity_id)
    ) {
      throw new Error(
        `observation ${observation.observation_id} belongs to another entity`,
      );
    }
  }
  for (const fact of facts) {
    if (!declaredObservationIds.has(fact.observation_id)) {
      throw new Error(
        `fact ${fact.fact_id} belongs to undeclared observation ${fact.observation_id}`,
      );
    }
    if (![projectId, typologyId].includes(fact.entity_id)) {
      throw new Error(`fact ${fact.fact_id} belongs to another entity`);
    }
  }
  for (const documentRecord of documents) {
    if (!declaredSourceIds.has(documentRecord.source_id)) {
      throw new Error(
        `document ${documentRecord.document_id} uses undeclared source ${documentRecord.source_id}`,
      );
    }
    usedSourceIds.add(documentRecord.source_id);
  }
  for (const evidenceRecord of evidence) {
    if (!declaredObservationIds.has(evidenceRecord.observation_id)) {
      throw new Error(
        `evidence ${evidenceRecord.evidence_id} belongs to undeclared observation`,
      );
    }
    if (!declaredDocumentIds.has(evidenceRecord.document_id)) {
      throw new Error(
        `evidence ${evidenceRecord.evidence_id} belongs to undeclared document`,
      );
    }
  }
  for (const issue of issues) {
    if (issue.entity_id !== typologyId) {
      throw new Error(`issue ${issue.issue_id} belongs to another typology`);
    }
    requireIdList(issue.fact_ids, `${issue.issue_id}.fact_ids`);
    if (issue.fact_ids.some((factId) => !declaredFactIds.has(factId))) {
      throw new Error(`issue ${issue.issue_id} references a fact outside the case`);
    }
  }
  if (
    inspectorCase.required_fact_ids.some((factId) => !declaredFactIds.has(factId))
  ) {
    throw new Error("required facts must be a subset of inspectorCase.fact_ids");
  }
  if (
    inspectorCase.source_ids.some((sourceId) => !usedSourceIds.has(sourceId))
  ) {
    throw new Error("inspectorCase contains an unused source");
  }
  if (
    inspectorCase.primary_evidence_id !== null &&
    !inspectorCase.evidence_ids.includes(inspectorCase.primary_evidence_id)
  ) {
    throw new Error("primary evidence must belong to the inspector case");
  }

  const evaluation = evaluateCompatibility({
    typology: selectedTypology,
    observations,
    facts,
    issues,
    requiredFactIds: inspectorCase.required_fact_ids,
  });
  const primaryEvidence =
    inspectorCase.primary_evidence_id === null
      ? null
      : maps.evidence.get(inspectorCase.primary_evidence_id);
  const decision = {
    qualityStatus: evaluation.rollupStatus,
    rollupStatus: evaluation.rollupStatus,
    benchmarkEligible: evaluation.benchmarkEligible,
    blockingIssueIds: evaluation.blockingIssueIds,
    eligibleFactIds: evaluation.eligibleFactIds,
    excludedFactIds: evaluation.excludedFactIds,
    selectedTruthFactId: null,
  };

  return clone({
    inspectorCase,
    project,
    typologies: inspectableTypologiesForProject(inspector, projectId, maps),
    selectedTypology,
    sources,
    observations,
    facts,
    documents,
    evidence,
    issues,
    primaryEvidence,
    compatibilityRows: evaluation.rows,
    decision,
    coverage: inspector.coverage,
  });
}

function compareOrdinal(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function projectedFact({
  fact,
  inspectorCase,
  provenanceClassification,
  issues,
  eligibleFactIds,
}) {
  const factId = requireId(fact.fact_id, "fact.fact_id");
  const observationId = requireId(
    fact.observation_id,
    `${factId}.observation_id`,
  );
  const fieldName = requireId(fact.field_name, `${factId}.field_name`);
  const semanticType = requireId(
    fact.semantic_type,
    `${factId}.semantic_type`,
  );
  const valueKind = requireEnum(
    fact.value_kind,
    FACT_VALUE_KINDS,
    `${factId}.value_kind`,
  );
  const sourceQualityStatus = requireEnum(
    fact.quality_status,
    QUALITY_STATUSES,
    `${factId}.quality_status`,
  );
  const sourceBenchmarkEligible = requireBoolean(
    fact.benchmark_eligible,
    `${factId}.benchmark_eligible`,
  );
  const blockingIssueIds = issues
    .filter(
      (issue) =>
        requireBoolean(
          issue.benchmark_blocking,
          `${issue.issue_id}.benchmark_blocking`,
        ) && issue.fact_ids.includes(factId),
    )
    .map(({ issue_id: issueId }) => issueId);
  const benchmarkEligible = eligibleFactIds.has(factId);
  const reasonCodes = [];
  if (blockingIssueIds.length > 0) reasonCodes.push("BLOCKING_ISSUE");
  if (sourceQualityStatus !== "certified") {
    reasonCodes.push("QUALITY_NOT_CERTIFIED");
  }
  if (!sourceBenchmarkEligible) reasonCodes.push("BENCHMARK_FLAG_FALSE");
  if (benchmarkEligible && reasonCodes.length > 0) {
    throw new Error(`${factId} is eligible but has exclusion reasons`);
  }
  if (!benchmarkEligible && reasonCodes.length === 0) {
    throw new Error(`${factId} is excluded without an exclusion reason`);
  }

  return {
    factId,
    observationId,
    fieldName,
    semanticType,
    valueKind,
    provenanceClassification,
    sourceQualityStatus,
    required: inspectorCase.required_fact_ids.includes(factId),
    eligibility: benchmarkEligible ? "eligible" : "excluded",
    benchmarkEligible,
    blockingIssueIds,
    reasonCodes,
  };
}

function projectedTypology(dossier) {
  const inspectorCase = dossier.inspectorCase;
  const caseId = requireId(inspectorCase.case_id, "inspectorCase.case_id");
  const projectId = requireId(
    inspectorCase.project_id,
    `${caseId}.project_id`,
  );
  const typologyId = requireId(
    inspectorCase.typology_id,
    `${caseId}.typology_id`,
  );
  const provenanceClassification = requireEnum(
    inspectorCase.provenance_classification,
    PROVENANCE_CLASSIFICATIONS,
    `${caseId}.provenance_classification`,
  );
  for (const issue of dossier.issues) {
    requireId(issue.issue_id, "issue.issue_id");
    requireBoolean(
      issue.benchmark_blocking,
      `${issue.issue_id}.benchmark_blocking`,
    );
  }
  const eligibleFactIds = new Set(dossier.decision.eligibleFactIds);
  const facts = dossier.facts.map((fact) =>
    projectedFact({
      fact,
      inspectorCase,
      provenanceClassification,
      issues: dossier.issues,
      eligibleFactIds,
    }),
  );
  const factIds = facts.map(({ factId }) => factId);
  const projectedEligibleFactIds = facts
    .filter(({ benchmarkEligible }) => benchmarkEligible)
    .map(({ factId }) => factId);
  const projectedExcludedFactIds = facts
    .filter(({ benchmarkEligible }) => !benchmarkEligible)
    .map(({ factId }) => factId);
  if (
    new Set(factIds).size !== factIds.length ||
    factIds.length !==
      projectedEligibleFactIds.length + projectedExcludedFactIds.length ||
    projectedEligibleFactIds.some((factId) =>
      projectedExcludedFactIds.includes(factId),
    )
  ) {
    throw new Error(`${caseId} has an invalid eligibility partition`);
  }
  if (
    JSON.stringify(projectedEligibleFactIds) !==
      JSON.stringify(dossier.decision.eligibleFactIds) ||
    JSON.stringify(projectedExcludedFactIds) !==
      JSON.stringify(dossier.decision.excludedFactIds)
  ) {
    throw new Error(`${caseId} eligibility projection diverges from decision`);
  }

  const benchmarkEligible = requireBoolean(
    dossier.decision.benchmarkEligible,
    `${caseId}.decision.benchmarkEligible`,
  );
  const rollupStatus = requireEnum(
    dossier.decision.rollupStatus,
    QUALITY_STATUSES,
    `${caseId}.decision.rollupStatus`,
  );
  const blockingIssueIds = dossier.decision.blockingIssueIds.map(
    (issueId, index) =>
      requireId(issueId, `${caseId}.blockingIssueIds[${index}]`),
  );
  const requiredFactIds = inspectorCase.required_fact_ids.map(
    (factId, index) =>
      requireId(factId, `${caseId}.requiredFactIds[${index}]`),
  );
  const requiredFactExcluded = requiredFactIds.some(
    (factId) => !eligibleFactIds.has(factId),
  );
  const reasonCodes = [];
  if (blockingIssueIds.length > 0) {
    reasonCodes.push("BLOCKING_REQUIRED_ISSUE");
  }
  if (requiredFactExcluded) reasonCodes.push("REQUIRED_FACT_EXCLUDED");
  if (rollupStatus !== "certified") {
    reasonCodes.push("ROLLUP_NOT_CERTIFIED");
  }
  if (benchmarkEligible && reasonCodes.length > 0) {
    throw new Error(`${caseId} is eligible but has exclusion reasons`);
  }
  if (!benchmarkEligible && reasonCodes.length === 0) {
    throw new Error(`${caseId} is excluded without an exclusion reason`);
  }

  return {
    caseId,
    projectId,
    typologyId,
    provenanceClassification,
    rollupStatus,
    eligibility: benchmarkEligible ? "eligible" : "excluded",
    benchmarkEligible,
    reasonCodes,
    requiredFactIds,
    blockingIssueIds,
    eligibleFactIds: projectedEligibleFactIds,
    excludedFactIds: projectedExcludedFactIds,
    selectedTruthFactId: null,
    facts,
  };
}

export function buildEligibilityProjection({ model, inspector } = {}) {
  requireRecord(model, "model");
  requireRecord(inspector, "inspector");
  const inspectorCases = requireArray(
    inspector.cases,
    "inspector.cases",
  );
  if (inspectorCases.length === 0) {
    throw new RangeError("inspector.cases must not be empty");
  }
  const orderedCases = inspectorCases
    .map((inspectorCase, index) => {
      requireRecord(inspectorCase, `inspector.cases[${index}]`);
      requireId(
        inspectorCase.case_id,
        `inspector.cases[${index}].case_id`,
      );
      return inspectorCase;
    })
    .sort((left, right) => compareOrdinal(left.case_id, right.case_id));
  const typologies = orderedCases.map((inspectorCase) =>
    projectedTypology(
      buildEvidenceDossier({
        model,
        inspector,
        projectId: inspectorCase.project_id,
        typologyId: inspectorCase.typology_id,
      }),
    ),
  );

  return clone({
    version: 1,
    scope: "inspected_facts_and_typologies_only",
    typologies,
  });
}

function validatePermissionRecord(record, name) {
  requireRecord(record, name);
  if (!PUBLISH_PERMISSIONS.has(record.publish_permission)) {
    throw new TypeError(
      `${name} has unsupported publish_permission ${String(
        record.publish_permission,
      )}`,
    );
  }
  if (!AVAILABILITY_STATUSES.has(record.availability)) {
    throw new TypeError(
      `${name} has unsupported availability ${String(record.availability)}`,
    );
  }
}

function validateBaseUrl(baseUrl) {
  if (typeof baseUrl !== "string") {
    throw new TypeError("baseUrl must be a string");
  }
  if (
    (baseUrl !== "" && !baseUrl.startsWith("/")) ||
    baseUrl.startsWith("//") ||
    /[\\?#%:]/u.test(baseUrl)
  ) {
    throw new TypeError("baseUrl must be a safe local application path");
  }
  const segments = baseUrl.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new TypeError("baseUrl must not contain traversal segments");
  }
  return baseUrl;
}

function validatePublicAssetPath(publicAssetPath) {
  if (
    typeof publicAssetPath !== "string" ||
    !PUBLIC_ASSET_PATTERN.test(publicAssetPath) ||
    /[\\?#%:]/u.test(publicAssetPath) ||
    publicAssetPath.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    throw new TypeError("document.public_asset_path is not a safe evidence path");
  }
  return publicAssetPath;
}

function localAssetUrl(baseUrl, publicAssetPath) {
  const safeBase = validateBaseUrl(baseUrl);
  const safePath = validatePublicAssetPath(publicAssetPath);
  if (safeBase === "") return safePath;
  return `${safeBase.replace(/\/+$/u, "")}/${safePath}`;
}

function blockedPresentation(mode, reason) {
  return {
    mode,
    publicUrl: null,
    canOpen: false,
    reason,
  };
}

export function resolveEvidencePresentation({
  document,
  evidence,
  baseUrl = "",
} = {}) {
  validatePermissionRecord(document, "document");
  validatePermissionRecord(evidence, "evidence");
  requireId(document.document_id, "document.document_id");
  requireId(evidence.evidence_id, "evidence.evidence_id");
  requireId(evidence.document_id, "evidence.document_id");
  validateBaseUrl(baseUrl);
  if (!EVIDENCE_KINDS.has(evidence.kind)) {
    throw new TypeError(`evidence has unsupported kind ${String(evidence.kind)}`);
  }
  if (evidence.document_id !== document.document_id) {
    throw new Error("evidence does not belong to document");
  }
  const permissions = [
    document.publish_permission,
    evidence.publish_permission,
  ];
  const availability = [document.availability, evidence.availability];

  if (
    permissions.includes("restricted") ||
    availability.includes("restricted")
  ) {
    return blockedPresentation(
      "restricted",
      "Evidencia restringida; solo metadata mínima disponible.",
    );
  }
  if (permissions.includes("pending")) {
    return blockedPresentation(
      "pending",
      "El permiso de publicación está pendiente.",
    );
  }
  if (availability.includes("unavailable")) {
    return blockedPresentation(
      "unavailable",
      "La referencia existe, pero no está disponible.",
    );
  }

  if (
    permissions.some((permission) => permission !== "authorized") ||
    availability.some((status) => status !== "available")
  ) {
    return blockedPresentation(
      "unavailable",
      "La evidencia no cumple las condiciones de publicación.",
    );
  }
  if (
    document.public_asset_path !== null &&
    evidence.kind === "image_region"
  ) {
    return {
      mode: "asset",
      publicUrl: localAssetUrl(baseUrl, document.public_asset_path),
      canOpen: true,
      reason: null,
    };
  }
  const hasFragment =
    typeof evidence.fragment === "string" && evidence.fragment.trim().length > 0;
  if (evidence.kind === "fragment" && hasFragment) {
    return {
      mode: "fragment",
      publicUrl: null,
      canOpen: true,
      reason: null,
    };
  }
  if (CONTROLLED_TRANSCRIPTION_KINDS.has(evidence.kind) && hasFragment) {
    return {
      mode: "controlled_transcription",
      publicUrl: null,
      canOpen: true,
      reason: null,
    };
  }
  return blockedPresentation(
    "unavailable",
    "La referencia no contiene una representación pública disponible.",
  );
}
