const PUBLIC_CONTRACT_VERSION = "2.3.0";
const LEGACY_RUNTIME_CONTRACTS = new Set(["2.1.0", "2.2.0"]);
const QUANTITATIVE_STATES = new Set([
  "ready",
  "orientative",
  "orientative_noncomparable",
  "insufficient",
  "excluded",
  "contract_unavailable",
  "error",
]);

const textCompare = (left, right) => String(left).localeCompare(String(right));
const sortedUnique = (values) =>
  [...new Set((Array.isArray(values) ? values : []).filter(Boolean).map(String))].sort(
    textCompare,
  );
const finitePositive = (value) =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
const round = (value, digits = 2) => {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

function recordMap(records, idField) {
  const result = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    const id = record?.[idField];
    if (typeof id !== "string" || !id || result.has(id)) return null;
    result.set(id, record);
  }
  return result;
}

function emptyPartition(inputProjectIds = []) {
  return {
    inputProjectIds: sortedUnique(inputProjectIds),
    usedProjectIds: [],
    missingProjectIds: sortedUnique(inputProjectIds),
    excludedProjects: [],
  };
}

function orderedReasons(reasons, precedence = []) {
  const order = new Map(precedence.map((reason, index) => [reason, index]));
  return sortedUnique(reasons).sort(
    (left, right) =>
      (order.get(left) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(right) ?? Number.MAX_SAFE_INTEGER) ||
      textCompare(left, right),
  );
}

function assertPartition(partition) {
  const input = new Set(partition.inputProjectIds);
  const used = new Set(partition.usedProjectIds);
  const missing = new Set(partition.missingProjectIds);
  const excluded = new Set(
    partition.excludedProjects.map(({ projectId }) => projectId),
  );
  if (
    input.size !== partition.inputProjectIds.length ||
    used.size !== partition.usedProjectIds.length ||
    missing.size !== partition.missingProjectIds.length ||
    excluded.size !== partition.excludedProjects.length
  ) {
    throw new Error("Benchmark partition contains duplicate project IDs");
  }
  for (const projectId of input) {
    const memberships =
      Number(used.has(projectId)) +
      Number(missing.has(projectId)) +
      Number(excluded.has(projectId));
    if (memberships !== 1) {
      throw new Error(`Benchmark partition is not exhaustive for ${projectId}`);
    }
  }
  if ([...used, ...missing, ...excluded].some((id) => !input.has(id))) {
    throw new Error("Benchmark partition contains a project outside its input");
  }
  return partition;
}

export function quantileR7(values, probability) {
  const sorted = (Array.isArray(values) ? values : [])
    .filter((value) => typeof value === "number" && Number.isFinite(value))
    .sort((left, right) => left - right);
  if (
    sorted.length === 0 ||
    typeof probability !== "number" ||
    !Number.isFinite(probability) ||
    probability < 0 ||
    probability > 1
  ) {
    return null;
  }
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const fraction = position - lower;
  return round(
    sorted[lower] + fraction * (sorted[upper] - sorted[lower]),
    6,
  );
}

export function quantitativeSampleStatus(sampleSize, minimum = 3) {
  if (!Number.isInteger(sampleSize) || sampleSize < 0) return "error";
  if (sampleSize === 0) return "insufficient";
  return sampleSize < minimum ? "orientative" : "ready";
}

export function qualitativeSampleStatus(informedSize, minimum = 5) {
  if (!Number.isInteger(informedSize) || informedSize < 0) return "error";
  if (informedSize === 0) return "insufficient";
  return informedSize < minimum ? "orientative" : "ready";
}

function describeSeries(values, status) {
  return {
    status,
    n: values.length,
    values: [...values].sort((left, right) => left - right),
    p25: values.length ? quantileR7(values, 0.25) : null,
    median: values.length ? quantileR7(values, 0.5) : null,
    p75: values.length ? quantileR7(values, 0.75) : null,
  };
}

function resolveProjectId(entityId, typologies, facts) {
  if (typeof entityId !== "string") return null;
  if (entityId.startsWith("project:")) return entityId;
  if (entityId.startsWith("typology:")) {
    return typologies.get(entityId)?.project_id ?? null;
  }
  if (entityId.startsWith("fact:")) {
    return resolveProjectId(facts.get(entityId)?.entity_id, typologies, facts);
  }
  return null;
}

function blockingProjectMap(model, typologies, facts) {
  const result = new Map();
  for (const issue of Array.isArray(model?.issues) ? model.issues : []) {
    if (issue?.benchmark_blocking !== true) continue;
    const projectIds = new Set();
    const direct = resolveProjectId(issue.entity_id, typologies, facts);
    if (direct) projectIds.add(direct);
    for (const factId of Array.isArray(issue.fact_ids) ? issue.fact_ids : []) {
      const fromFact = resolveProjectId(factId, typologies, facts);
      if (fromFact) projectIds.add(fromFact);
    }
    for (const projectId of projectIds) {
      const issues = result.get(projectId) ?? [];
      issues.push(issue);
      result.set(projectId, issues.sort((left, right) =>
        textCompare(left.issue_id, right.issue_id),
      ));
    }
  }
  return result;
}

function benchmarkReferencesAreClosed({
  entries,
  projects,
  observations,
  facts,
  evidence,
  typologies,
}) {
  const factReferenceFields = [
    "total_area_fact_id",
    "published_price_fact_id",
    "price_per_m2_fact_id",
    "reported_unit_count_fact_id",
    "parking_count_fact_id",
  ];
  const observationEvidenceIsClosed = (observation, projectId) =>
    Array.isArray(observation?.evidence_ids) &&
    observation.evidence_ids.every((evidenceId) => {
      const record = evidence.get(evidenceId);
      return (
        record &&
        record.observation_id === observation.observation_id &&
        resolveProjectId(observation.entity_id, typologies, facts) === projectId
      );
    });
  for (const entry of entries) {
    if (
      !entry ||
      !projects.has(entry.project_id) ||
      !observations.has(entry.observation_id) ||
      !Array.isArray(entry.attribute_fact_ids) ||
      !Array.isArray(entry.pairing_evidence_ids)
    ) {
      return false;
    }
    const observation = observations.get(entry.observation_id);
    if (
      resolveProjectId(observation.entity_id, typologies, facts) !==
        entry.project_id ||
      !observationEvidenceIsClosed(observation, entry.project_id)
    ) {
      return false;
    }
    const factIds = [
      ...factReferenceFields.map((field) => entry[field]).filter(Boolean),
      ...entry.attribute_fact_ids,
    ];
    for (const factId of factIds) {
      const fact = facts.get(factId);
      const factObservation = observations.get(fact?.observation_id);
      if (
        !fact ||
        !factObservation ||
        resolveProjectId(fact.entity_id, typologies, facts) !==
          entry.project_id ||
        resolveProjectId(factObservation.entity_id, typologies, facts) !==
          entry.project_id ||
        !observationEvidenceIsClosed(factObservation, entry.project_id)
      ) {
        return false;
      }
    }
    for (const evidenceId of entry.pairing_evidence_ids) {
      const record = evidence.get(evidenceId);
      if (!record || !observations.has(record.observation_id)) return false;
      const evidenceObservation = observations.get(record.observation_id);
      if (
        resolveProjectId(evidenceObservation.entity_id, typologies, facts) !==
          entry.project_id ||
        !observationEvidenceIsClosed(evidenceObservation, entry.project_id) ||
        !evidenceObservation.evidence_ids.includes(evidenceId)
      ) {
        return false;
      }
    }
  }
  return true;
}

function inspectorPathForProject(data, projectId) {
  const inspectorCase = (data?.inspector?.cases ?? [])
    .filter((candidate) => candidate.project_id === projectId)
    .sort((left, right) => textCompare(left.case_id, right.case_id))[0];
  return inspectorCase ? `#inspector/case/${inspectorCase.route_slug}` : null;
}

function restrictedProjectMap(entries, observations, evidence) {
  const result = new Map();
  for (const entry of entries) {
    const observation = observations.get(entry.observation_id);
    const restrictedEvidenceIds = (observation?.evidence_ids ?? []).filter(
      (evidenceId) => {
        const record = evidence.get(evidenceId);
        return (
          !record ||
          record.publish_permission !== "authorized" ||
          record.availability !== "available"
        );
      },
    );
    if (restrictedEvidenceIds.length > 0) {
      result.set(
        entry.project_id,
        sortedUnique([
          ...(result.get(entry.project_id) ?? []),
          ...restrictedEvidenceIds,
        ]),
      );
    }
  }
  return result;
}

function evidenceIsPublic(evidenceIds, evidence) {
  return evidenceIds.every((evidenceId) => {
    const record = evidence.get(evidenceId);
    return (
      record?.publish_permission === "authorized" &&
      record?.availability === "available"
    );
  });
}

function validMethodology(methodology) {
  const requiredReasons = [
    "restricted",
    "blocking_issue",
    "conflicting_observations",
    "price_area_link_unresolved",
    "currency",
    "area_denominator",
    "cutoff",
    "missing",
  ];
  return (
    methodology &&
    typeof methodology.cutoff_at === "string" &&
    Number.isFinite(Date.parse(methodology.cutoff_at)) &&
    methodology.minimum_quantitative_sample === 3 &&
    methodology.minimum_qualitative_informed_sample === 5 &&
    methodology.quantile_method === "R7" &&
    methodology.price_type_policy === "from" &&
    Array.isArray(methodology.allowed_area_denominators) &&
    methodology.allowed_area_denominators.length === 1 &&
    methodology.allowed_area_denominators[0] === "total" &&
    methodology.pairing_policy === "source_paired_only" &&
    Array.isArray(methodology.exclusion_reason_precedence) &&
    methodology.exclusion_reason_precedence.length ===
      new Set(methodology.exclusion_reason_precedence).size &&
    requiredReasons.every((reason) =>
      methodology.exclusion_reason_precedence.includes(reason),
    ) &&
    typeof methodology.certification_label === "string" &&
    methodology.certification_label.trim().length > 0
  );
}

function validEligiblePriceFact(fact, methodology) {
  return (
    fact?.semantic_type === "price_per_m2" &&
    finitePositive(fact.normalized_value) !== null &&
    fact.unit === "PEN/m2" &&
    fact.currency === "PEN" &&
    fact.price_type === methodology.price_type_policy &&
    methodology.allowed_area_denominators.includes(
      fact.denominator_area_type,
    ) &&
    fact.quality_status === "certified" &&
    fact.benchmark_eligible === true &&
    fact.value_kind === "derived" &&
    typeof fact.derivation?.formula === "string" &&
    fact.derivation.formula.trim().length > 0 &&
    fact.derivation?.rounding?.mode === "half_up" &&
    fact.derivation?.rounding?.digits === 2
  );
}

function validOrientativePriceFact(fact, methodology) {
  return (
    fact?.semantic_type === "price_per_m2" &&
    finitePositive(fact.normalized_value) !== null &&
    fact.unit === "PEN/m2" &&
    fact.currency === "PEN" &&
    fact.price_type === methodology.price_type_policy &&
    methodology.allowed_area_denominators.includes(
      fact.denominator_area_type,
    ) &&
    fact.quality_status === "reviewable" &&
    fact.benchmark_eligible === false &&
    fact.value_kind === "derived" &&
    typeof fact.derivation?.formula === "string" &&
    fact.derivation.formula.trim().length > 0 &&
    fact.derivation?.rounding?.mode === "half_up" &&
    fact.derivation?.rounding?.digits === 2
  );
}

function validPublishedPriceFact(fact, methodology) {
  return (
    fact?.semantic_type === "price" &&
    finitePositive(fact.normalized_value) !== null &&
    fact.unit === "PEN" &&
    fact.currency === "PEN" &&
    fact.price_type === methodology.price_type_policy &&
    fact.value_kind === "observed" &&
    fact.quality_status === "certified" &&
    fact.benchmark_eligible === true
  );
}

function validTotalAreaFact(fact, methodology) {
  return (
    fact?.semantic_type === "area" &&
    finitePositive(fact.normalized_value) !== null &&
    fact.unit === "m2" &&
    methodology.allowed_area_denominators.includes(fact.area_type) &&
    fact.value_kind === "observed" &&
    fact.quality_status === "certified" &&
    fact.benchmark_eligible === true
  );
}

function groupEntriesByProject(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const list = groups.get(entry.project_id) ?? [];
    list.push(entry);
    groups.set(
      entry.project_id,
      list.sort(
        (left, right) =>
          textCompare(left.observation_id, right.observation_id) ||
          textCompare(left.price_per_m2_fact_id ?? "", right.price_per_m2_fact_id ?? ""),
      ),
    );
  }
  return groups;
}

function uniqueEntrySignature(entry, facts) {
  const pricePerM2Fact = facts.get(entry.price_per_m2_fact_id);
  const publishedPriceFact = facts.get(entry.published_price_fact_id);
  const totalAreaFact = facts.get(entry.total_area_fact_id);
  const factSignature = (fact) => [
    fact?.semantic_type ?? null,
    fact?.normalized_value ?? null,
    fact?.unit ?? null,
    fact?.currency ?? null,
    fact?.price_type ?? null,
    fact?.area_type ?? null,
    fact?.denominator_area_type ?? null,
    fact?.quality_status ?? null,
    fact?.benchmark_eligible ?? null,
    fact?.exclusion_reason ?? null,
    fact?.derivation?.formula ?? null,
    sortedUnique(fact?.derivation?.input_fact_ids),
  ];
  return JSON.stringify([
    entry.pairing_status,
    entry.pairing_basis,
    factSignature(publishedPriceFact),
    factSignature(totalAreaFact),
    factSignature(pricePerM2Fact),
  ]);
}

export function buildQuantitativeBenchmark({
  projectIds,
  entries,
  facts,
  evidence,
  blockingProjects = new Map(),
  restrictedProjects = new Map(),
  methodology,
  inspectorPath = () => null,
} = {}) {
  const inputProjectIds = sortedUnique(projectIds);
  const factsById = facts instanceof Map ? facts : recordMap(facts, "fact_id");
  const evidenceById =
    evidence instanceof Map ? evidence : recordMap(evidence ?? [], "evidence_id");
  if (!factsById || !evidenceById || !validMethodology(methodology)) {
    return {
      ...describeSeries([], "error"),
      orientative: {
        ...describeSeries([], "insufficient"),
        canSupportPositioning: false,
      },
      coverage: emptyPartition(inputProjectIds),
      errorCodes: ["INVALID_QUANTITATIVE_INPUT"],
    };
  }

  const grouped = groupEntriesByProject(Array.isArray(entries) ? entries : []);
  const used = [];
  const missing = [];
  const excluded = [];
  const eligibleRecords = [];
  const orientativeRecords = [];

  for (const projectId of inputProjectIds) {
    const projectEntries = grouped.get(projectId) ?? [];
    const blockingIssues = blockingProjects.get(projectId) ?? [];
    const restrictedEvidenceIds = restrictedProjects.get(projectId) ?? [];
    const baseDetail = {
      projectId,
      inspectorPath: inspectorPath(projectId),
    };
    if (restrictedEvidenceIds.length > 0) {
      excluded.push({
        ...baseDetail,
        reasons: ["restricted"],
        detailCode: "restricted_observation_evidence",
        issueIds: [],
        evidenceIds: restrictedEvidenceIds,
      });
      continue;
    }
    if (blockingIssues.length > 0) {
      excluded.push({
        ...baseDetail,
        reasons: ["blocking_issue"],
        detailCode: "typology_link_unresolved",
        issueIds: blockingIssues.map(({ issue_id: issueId }) => issueId),
      });
      continue;
    }
    if (projectEntries.length === 0) {
      missing.push(projectId);
      continue;
    }
    const signatures = new Set(
      projectEntries.map((entry) => uniqueEntrySignature(entry, factsById)),
    );
    if (signatures.size > 1) {
      excluded.push({
        ...baseDetail,
        reasons: ["conflicting_observations"],
        detailCode: "conflicting_observations",
        issueIds: [],
      });
      continue;
    }
    const entry = projectEntries[0];
    const provenanceObservationIds = sortedUnique(
      projectEntries.map(({ observation_id: observationId }) => observationId),
    );
    const pairingEvidenceIds = sortedUnique(
      projectEntries.flatMap(
        ({ pairing_evidence_ids: evidenceIds }) => evidenceIds ?? [],
      ),
    );
    if (!evidenceIsPublic(pairingEvidenceIds, evidenceById)) {
      excluded.push({
        ...baseDetail,
        reasons: ["restricted"],
        detailCode: "restricted_pairing_evidence",
        issueIds: [],
      });
      continue;
    }
    if (entry.pairing_status === "missing") {
      missing.push(projectId);
      continue;
    }
    if (entry.pairing_status === "conflicting") {
      excluded.push({
        ...baseDetail,
        reasons: ["conflicting_observations"],
        detailCode: "conflicting_observations",
        issueIds: [],
      });
      continue;
    }
    const priceFact = factsById.get(entry.price_per_m2_fact_id);
    if (entry.pairing_status === "project_minima_pair_unresolved") {
      excluded.push({
        ...baseDetail,
        reasons: ["price_area_link_unresolved"],
        detailCode: "price_area_link_unresolved",
        issueIds: [],
      });
      const publishedPriceFact = factsById.get(entry.published_price_fact_id);
      const totalAreaFact = factsById.get(entry.total_area_fact_id);
      const inputFactIds = priceFact?.derivation?.input_fact_ids;
      if (
        validOrientativePriceFact(priceFact, methodology) &&
        validPublishedPriceFact(publishedPriceFact, methodology) &&
        validTotalAreaFact(totalAreaFact, methodology) &&
        Array.isArray(inputFactIds) &&
        inputFactIds.includes(entry.published_price_fact_id) &&
        inputFactIds.includes(entry.total_area_fact_id) &&
        round(
          publishedPriceFact.normalized_value / totalAreaFact.normalized_value,
          2,
        ) === priceFact.normalized_value
      ) {
        orientativeRecords.push({
          projectId,
          value: priceFact.normalized_value,
          factId: priceFact.fact_id,
          provenanceObservationIds,
          pairingEvidenceIds,
        });
      }
      continue;
    }
    if (entry.pairing_status !== "source_paired") {
      excluded.push({
        ...baseDetail,
        reasons: ["conflicting_observations"],
        detailCode: "unsupported_pairing_status",
        issueIds: [],
      });
      continue;
    }
    const publishedPriceFact = factsById.get(entry.published_price_fact_id);
    const totalAreaFact = factsById.get(entry.total_area_fact_id);
    const reasons = [];
    if (pairingEvidenceIds.length === 0) {
      reasons.push("conflicting_observations");
    }
    if (
      !["offer_id", "typology_id", "native_metric"].includes(
        entry.pairing_basis,
      )
    ) {
      reasons.push("conflicting_observations");
    }
    if (priceFact?.currency !== "PEN") reasons.push("currency");
    if (
      !methodology.allowed_area_denominators.includes(
        priceFact?.denominator_area_type,
      )
    ) {
      reasons.push("area_denominator");
    }
    if (!validEligiblePriceFact(priceFact, methodology)) {
      if (reasons.length === 0) reasons.push("conflicting_observations");
    }
    const inputFactIds = priceFact?.derivation?.input_fact_ids;
    if (
      !Array.isArray(inputFactIds) ||
      !inputFactIds.includes(entry.published_price_fact_id) ||
      !inputFactIds.includes(entry.total_area_fact_id) ||
      !validPublishedPriceFact(publishedPriceFact, methodology) ||
      !validTotalAreaFact(totalAreaFact, methodology)
    ) {
      reasons.push("conflicting_observations");
    }
    if (
      round(
        publishedPriceFact?.normalized_value /
          totalAreaFact?.normalized_value,
        2,
      ) !== priceFact?.normalized_value
    ) {
      reasons.push("conflicting_observations");
    }
    if (reasons.length > 0) {
      excluded.push({
        ...baseDetail,
        reasons: orderedReasons(
          reasons,
          methodology.exclusion_reason_precedence,
        ),
        detailCode: "ineligible_source_pair",
        issueIds: [],
      });
      continue;
    }
    used.push(projectId);
    eligibleRecords.push({
      projectId,
      value: priceFact.normalized_value,
      factId: priceFact.fact_id,
      provenanceObservationIds,
      pairingEvidenceIds,
    });
  }

  const coverage = assertPartition({
    inputProjectIds,
    usedProjectIds: sortedUnique(used),
    missingProjectIds: sortedUnique(missing),
    excludedProjects: excluded
      .map((record) => ({
        ...record,
        reasons: orderedReasons(
          record.reasons,
          methodology.exclusion_reason_precedence,
        ),
      }))
      .sort((left, right) => textCompare(left.projectId, right.projectId)),
  });
  const eligibleValues = eligibleRecords.map(({ value }) => value);
  const orientativeValues = orientativeRecords.map(({ value }) => value);
  const eligibleStatus = quantitativeSampleStatus(
    eligibleValues.length,
    methodology.minimum_quantitative_sample,
  );
  return {
    ...describeSeries(eligibleValues, eligibleStatus),
    currency: "PEN",
    priceType: methodology.price_type_policy,
    denominatorAreaType: methodology.allowed_area_denominators[0],
    records: eligibleRecords.sort((left, right) =>
      textCompare(left.projectId, right.projectId),
    ),
    orientative: {
      ...describeSeries(
        orientativeValues,
        orientativeValues.length
          ? "orientative_noncomparable"
          : "insufficient",
      ),
      records: orientativeRecords.sort((left, right) =>
        textCompare(left.projectId, right.projectId),
      ),
      canSupportPositioning: false,
    },
    coverage,
    errorCodes: [],
  };
}

export function buildQualitativeBenchmark({
  projectIds,
  entries,
  facts,
  observations,
  evidence,
  attributeCatalog,
  methodology,
} = {}) {
  const inputProjectIds = sortedUnique(projectIds);
  const factsById = facts instanceof Map ? facts : recordMap(facts, "fact_id");
  const observationsById =
    observations instanceof Map
      ? observations
      : recordMap(observations ?? [], "observation_id");
  const evidenceById =
    evidence instanceof Map ? evidence : recordMap(evidence ?? [], "evidence_id");
  const catalog = Array.isArray(attributeCatalog) ? attributeCatalog : [];
  const catalogById = recordMap(catalog, "attribute_id");
  if (
    !factsById ||
    !observationsById ||
    !evidenceById ||
    !catalogById ||
    !validMethodology(methodology)
  ) {
    return {
      status: "error",
      attributes: [],
      coverage: emptyPartition(inputProjectIds),
      errorCodes: ["INVALID_QUALITATIVE_INPUT"],
    };
  }
  const entriesByProject = groupEntriesByProject(
    Array.isArray(entries) ? entries : [],
  );
  const informed = [];
  const missing = [];
  const excluded = [];
  const factsByProject = new Map();
  const catalogIds = new Set(
    catalog.map(({ attribute_id: attributeId }) => attributeId),
  );
  for (const projectId of inputProjectIds) {
    const projectEntries = entriesByProject.get(projectId) ?? [];
    if (projectEntries.length === 0) {
      missing.push(projectId);
      factsByProject.set(projectId, []);
      continue;
    }
    const attributeSignatures = new Set(
      projectEntries.map((entry) =>
        JSON.stringify(sortedUnique(entry.attribute_fact_ids)),
      ),
    );
    if (attributeSignatures.size > 1) {
      excluded.push({
        projectId,
        reasons: ["conflicting_observations"],
        detailCode: "conflicting_attribute_observations",
      });
      factsByProject.set(projectId, []);
      continue;
    }
    const entry = projectEntries[0];
    if (!Array.isArray(entry.attribute_fact_ids) || entry.attribute_fact_ids.length === 0) {
      missing.push(projectId);
      factsByProject.set(projectId, []);
      continue;
    }
    const attributeFacts = entry.attribute_fact_ids
      .map((factId) => factsById.get(factId))
      .filter(Boolean);
    const factHasRestrictedEvidence = (fact) => {
      const observation = observationsById.get(fact.observation_id);
      return (observation?.evidence_ids ?? []).some((evidenceId) => {
        const record = evidenceById.get(evidenceId);
        return (
          !record ||
          record.publish_permission !== "authorized" ||
          record.availability !== "available"
        );
      });
    };
    const invalidFacts = attributeFacts.some(
      (fact) =>
        fact.semantic_type !== "attribute" ||
        (fact.benchmark_eligible !== true &&
          fact.normalized_value !== "unknown" &&
          !factHasRestrictedEvidence(fact)) ||
        (fact.benchmark_eligible === true && !catalogIds.has(fact.normalized_value)),
    );
    if (attributeFacts.length !== entry.attribute_fact_ids.length || invalidFacts) {
      excluded.push({
        projectId,
        reasons: ["conflicting_observations"],
        detailCode: "invalid_attribute_facts",
      });
      factsByProject.set(projectId, []);
      continue;
    }
    if (
      attributeFacts.some(
        (fact) =>
          fact.benchmark_eligible === true && !factHasRestrictedEvidence(fact),
      )
    ) {
      informed.push(projectId);
    } else if (attributeFacts.some(factHasRestrictedEvidence)) {
      excluded.push({
        projectId,
        reasons: ["restricted"],
        detailCode: "restricted_attribute_evidence",
      });
    } else {
      missing.push(projectId);
    }
    factsByProject.set(projectId, attributeFacts);
  }
  const coverage = assertPartition({
    inputProjectIds,
    usedProjectIds: sortedUnique(informed),
    missingProjectIds: sortedUnique(missing),
    excludedProjects: excluded.sort((left, right) =>
      textCompare(left.projectId, right.projectId),
    ),
  });

  const attributes = [...catalog]
    .sort((left, right) => textCompare(left.attribute_id, right.attribute_id))
    .map((attribute) => {
      const attributeToken = String(attribute.attribute_id)
        .replace(/^attribute:/, "")
        .replace(/[^a-z0-9]+/gi, "")
        .toLowerCase();
      let explicitlyUnknownProjectIds = informed.filter((projectId) =>
        (factsByProject.get(projectId) ?? []).some((fact) => {
          if (fact.normalized_value !== "unknown") return false;
          const factTarget =
            fact.attribute_id ??
            (String(fact.normalized_value).startsWith("attribute:")
              ? fact.normalized_value
              : fact.field_name);
          const factToken = String(factTarget ?? "")
            .replace(/^attribute:/, "")
            .replace(/[^a-z0-9]+/gi, "")
            .toLowerCase();
          return factToken === attributeToken;
        }),
      );
      const explicitlyRestrictedProjectIds = informed.filter((projectId) =>
        (factsByProject.get(projectId) ?? []).some((fact) => {
          const observation = observationsById.get(fact.observation_id);
          const restricted = (observation?.evidence_ids ?? []).some(
            (evidenceId) => {
              const record = evidenceById.get(evidenceId);
              return (
                !record ||
                record.publish_permission !== "authorized" ||
                record.availability !== "available"
              );
            },
          );
          if (!restricted) return false;
          const factTarget =
            fact.attribute_id ??
            (String(fact.normalized_value).startsWith("attribute:")
              ? fact.normalized_value
              : fact.field_name);
          const factToken = String(factTarget ?? "")
            .replace(/^attribute:/, "")
            .replace(/[^a-z0-9]+/gi, "")
            .toLowerCase();
          return factToken === attributeToken;
        }),
      );
      explicitlyUnknownProjectIds = explicitlyUnknownProjectIds.filter(
        (projectId) => !explicitlyRestrictedProjectIds.includes(projectId),
      );
      const attributeInformed = informed.filter(
        (projectId) =>
          !explicitlyUnknownProjectIds.includes(projectId) &&
          !explicitlyRestrictedProjectIds.includes(projectId),
      );
      const announcedProjectIds = [];
      const documentedProjectIds = [];
      const originals = [];
      for (const projectId of attributeInformed) {
        const matches = (factsByProject.get(projectId) ?? []).filter(
          (fact) => fact.normalized_value === attribute.attribute_id,
        );
        if (matches.length === 0) continue;
        announcedProjectIds.push(projectId);
        for (const fact of matches) {
          if (typeof fact.original_value === "string" && fact.original_value) {
            originals.push({
              projectId,
              factId: fact.fact_id,
              originalValue: fact.original_value,
            });
          }
          const observation = observationsById.get(fact.observation_id);
          if (
            (observation?.evidence_ids ?? []).some((evidenceId) => {
              const record = evidenceById.get(evidenceId);
              return (
                record?.publish_permission === "authorized" &&
                record?.availability === "available"
              );
            })
          ) {
            documentedProjectIds.push(projectId);
          }
        }
      }
      const status = qualitativeSampleStatus(
        attributeInformed.length,
        methodology.minimum_qualitative_informed_sample,
      );
      const attributeCoverage = assertPartition({
        inputProjectIds,
        usedProjectIds: sortedUnique(attributeInformed),
        missingProjectIds: sortedUnique([
          ...coverage.missingProjectIds,
          ...explicitlyUnknownProjectIds,
        ]),
        excludedProjects: [
          ...coverage.excludedProjects,
          ...explicitlyRestrictedProjectIds.map((projectId) => ({
            projectId,
            reasons: ["restricted"],
            detailCode: "restricted_attribute_evidence",
          })),
        ].sort((left, right) => textCompare(left.projectId, right.projectId)),
      });
      return {
        attributeId: attribute.attribute_id,
        category: attribute.category,
        label: attribute.normalized_label,
        status,
        announcedProjectIds: sortedUnique(announcedProjectIds),
        documentedProjectIds: sortedUnique(documentedProjectIds),
        inputProjectIds: attributeCoverage.inputProjectIds,
        usedProjectIds: attributeCoverage.usedProjectIds,
        informedProjectIds: attributeCoverage.usedProjectIds,
        missingProjectIds: attributeCoverage.missingProjectIds,
        excludedProjects: attributeCoverage.excludedProjects,
        coverage: attributeCoverage,
        announcedProjectCount: new Set(announcedProjectIds).size,
        documentedProjectCount: new Set(documentedProjectIds).size,
        informedProjectCount: attributeInformed.length,
        prevalencePercent:
          attributeInformed.length === 0
            ? null
            : round(
                (new Set(announcedProjectIds).size / attributeInformed.length) *
                  100,
                1,
              ),
        canDescribePattern: status === "ready",
        originalValues: originals.sort(
          (left, right) =>
            textCompare(left.projectId, right.projectId) ||
            textCompare(left.factId, right.factId),
        ),
      };
    });
  return {
    status: qualitativeSampleStatus(
      informed.length,
      methodology.minimum_qualitative_informed_sample,
    ),
    attributes,
    coverage,
    errorCodes: [],
  };
}

function valueCell(fact, state = null) {
  if (!fact) {
    return {
      state: "unknown",
      normalizedValue: null,
      originalValue: null,
      unit: null,
      currency: null,
      factId: null,
      confidence: null,
      exclusionReason: null,
    };
  }
  return {
    state:
      state ??
      (fact.benchmark_eligible === false
        ? "excluded"
        : fact.value_kind === "derived"
          ? "derived"
          : fact.value_kind === "simulated"
            ? "simulated"
            : fact.semantic_type === "attribute"
              ? "announced"
              : "observed"),
    normalizedValue: fact.normalized_value,
    originalValue: fact.original_value,
    unit: fact.unit,
    currency: fact.currency,
    factId: fact.fact_id,
    confidence: fact.confidence,
    exclusionReason: fact.exclusion_reason,
  };
}

function normalizeTargetScenario(targetScenario) {
  if (!targetScenario || typeof targetScenario !== "object") return null;
  const price = finitePositive(
    targetScenario.target_price_pen ?? targetScenario.list_price,
  );
  const area = finitePositive(
    targetScenario.target_area_m2 ?? targetScenario.total_area,
  );
  const pricePerM2 = price !== null && area !== null ? round(price / area, 2) : null;
  return {
    projectId: "target:viva",
    name: "Escenario Viva",
    agencyName: "Viva Inmobiliaria",
    district: targetScenario.district ?? null,
    deliveryStatus: targetScenario.delivery_status ?? null,
    publishedPrice: valueCell(
      price === null
        ? null
        : {
            normalized_value: price,
            original_value: null,
            unit: "PEN",
            currency: "PEN",
            fact_id: null,
            confidence: null,
            exclusion_reason: null,
            value_kind: "simulated",
            benchmark_eligible: false,
          },
      "simulated",
    ),
    totalArea: valueCell(
      area === null
        ? null
        : {
            normalized_value: area,
            original_value: null,
            unit: "m2",
            currency: null,
            fact_id: null,
            confidence: null,
            exclusion_reason: null,
            value_kind: "simulated",
            benchmark_eligible: false,
          },
      "simulated",
    ),
    pricePerM2: valueCell(
      pricePerM2 === null
        ? null
        : {
            normalized_value: pricePerM2,
            original_value: null,
            unit: "PEN/m2",
            currency: "PEN",
            fact_id: null,
            confidence: null,
            exclusion_reason: null,
            value_kind: "derived",
            benchmark_eligible: false,
          },
      "simulated",
    ),
    reportedUnits: valueCell(null),
    parking: valueCell(null),
    attributes: [],
    source: null,
    inspectorPath: null,
  };
}

function emptyContext(status, errorCodes = []) {
  return {
    scope: { projectIds: [], projectCount: 0 },
    status,
    quantitative: {
      pricePerM2Total: {
        ...describeSeries([], status === "error" ? "error" : "insufficient"),
        orientative: {
          ...describeSeries([], "insufficient"),
          canSupportPositioning: false,
        },
        coverage: emptyPartition(),
        records: [],
        errorCodes,
      },
    },
    qualitative: {
      status: status === "error" ? "error" : "insufficient",
      attributes: [],
      coverage: emptyPartition(),
      errorCodes,
    },
    coverage: {},
    methodology: null,
    projectSummaries: [],
    targetScenario: null,
    errorCodes,
  };
}

export function buildBenchmarkContext({
  data,
  scenarioContext,
  targetScenario = null,
} = {}) {
  const contractVersion = data?.metadata?.contract_version;
  if (LEGACY_RUNTIME_CONTRACTS.has(contractVersion)) {
    return emptyContext("contract_unavailable", ["BENCHMARK_CONTRACT_UNAVAILABLE"]);
  }
  if (contractVersion !== PUBLIC_CONTRACT_VERSION) {
    return emptyContext("error", ["UNSUPPORTED_PUBLIC_CONTRACT"]);
  }
  if (
    !data?.benchmark ||
    data.benchmark.version !== 1 ||
    !Array.isArray(data.benchmark.fact_index) ||
    !Array.isArray(data.benchmark.attribute_catalog) ||
    !data.benchmark.methodology ||
    !data?.model ||
    ![
      "projects",
      "agencies",
      "typologies",
      "observations",
      "facts",
      "evidence",
      "issues",
    ].every((field) => Array.isArray(data.model[field]))
  ) {
    return emptyContext("error", ["INVALID_BENCHMARK_CONTRACT"]);
  }
  const projects = recordMap(data.model.projects, "project_id");
  const agencies = recordMap(data.model.agencies, "agency_id");
  const typologies = recordMap(data.model.typologies, "typology_id");
  const observations = recordMap(data.model.observations, "observation_id");
  const facts = recordMap(data.model.facts, "fact_id");
  const evidence = recordMap(data.model.evidence, "evidence_id");
  const attributeCatalog = recordMap(
    data.benchmark.attribute_catalog,
    "attribute_id",
  );
  if (
    !projects ||
    !agencies ||
    !typologies ||
    !observations ||
    !facts ||
    !evidence ||
    !attributeCatalog ||
    !validMethodology(data.benchmark.methodology)
  ) {
    return emptyContext("error", ["DUPLICATE_OR_INVALID_MODEL_IDS"]);
  }
  if (
    !benchmarkReferencesAreClosed({
      entries: data.benchmark.fact_index,
      projects,
      observations,
      facts,
      evidence,
      typologies,
    })
  ) {
    return emptyContext("error", ["INVALID_BENCHMARK_REFERENCES"]);
  }
  const requestedIds = scenarioContext?.comparable_project_ids;
  if (!Array.isArray(requestedIds)) {
    return emptyContext("error", ["SCENARIO_COMPARABLE_IDS_REQUIRED"]);
  }
  const projectIds = sortedUnique(requestedIds);
  if (
    projectIds.length !== requestedIds.length ||
    projectIds.some((projectId) => !projects.has(projectId))
  ) {
    return emptyContext("error", ["INVALID_SCENARIO_COMPARABLE_IDS"]);
  }
  const entries = data.benchmark.fact_index.filter((entry) =>
    projectIds.includes(entry.project_id),
  );
  const blockingProjects = blockingProjectMap(data.model, typologies, facts);
  const restrictedProjects = restrictedProjectMap(
    entries,
    observations,
    evidence,
  );
  const quantitative = buildQuantitativeBenchmark({
    projectIds,
    entries,
    facts,
    evidence,
    blockingProjects,
    restrictedProjects,
    methodology: data.benchmark.methodology,
    inspectorPath: (projectId) => inspectorPathForProject(data, projectId),
  });
  const qualitative = buildQualitativeBenchmark({
    projectIds,
    entries,
    facts,
    observations,
    evidence,
    attributeCatalog: data.benchmark.attribute_catalog,
    methodology: data.benchmark.methodology,
  });
  if (quantitative.status === "error" || qualitative.status === "error") {
    return emptyContext("error", [
      ...quantitative.errorCodes,
      ...qualitative.errorCodes,
    ]);
  }

  const entriesByProject = groupEntriesByProject(entries);
  const quantitativeExclusions = new Map(
    quantitative.coverage.excludedProjects.map((record) => [
      record.projectId,
      record,
    ]),
  );
  const qualitativeByAttribute = new Map(
    qualitative.attributes.map((attribute) => [attribute.attributeId, attribute]),
  );
  const projectSummaries = projectIds.map((projectId) => {
    const project = projects.get(projectId);
    const projectEntries = entriesByProject.get(projectId) ?? [];
    const signatures = new Set(
      projectEntries.map((entry) => uniqueEntrySignature(entry, facts)),
    );
    const consistentEntry = signatures.size === 1 ? projectEntries[0] : null;
    const quantitativeExclusion = quantitativeExclusions.get(projectId);
    const hiddenMetricReasons = new Set([
      "restricted",
      "blocking_issue",
      "conflicting_observations",
    ]);
    const metricsAreHidden = (quantitativeExclusion?.reasons ?? []).some(
      (reason) => hiddenMetricReasons.has(reason),
    );
    const metricEntry = metricsAreHidden ? null : consistentEntry;
    const observation = observations.get(metricEntry?.observation_id);
    const observationHasRestrictedEvidence = (observation?.evidence_ids ?? []).some(
      (evidenceId) => {
        const record = evidence.get(evidenceId);
        return (
          !record ||
          record.publish_permission !== "authorized" ||
          record.availability !== "available"
        );
      },
    );
    const attributeFacts = sortedUnique(
      projectEntries.flatMap((entry) => entry.attribute_fact_ids ?? []),
    )
      .map((factId) => facts.get(factId))
      .filter(
        (fact) =>
          fact &&
          qualitativeByAttribute
            .get(fact.normalized_value)
            ?.announcedProjectIds.includes(projectId),
      );
    const pricePerM2Fact = facts.get(metricEntry?.price_per_m2_fact_id);
    return {
      projectId,
      name: project.canonical_name,
      agencyName: agencies.get(project.agency_id)?.canonical_name ?? null,
      district: project.location?.district ?? null,
      deliveryStatus: project.status ?? null,
      publishedPrice: valueCell(facts.get(metricEntry?.published_price_fact_id)),
      totalArea: valueCell(facts.get(metricEntry?.total_area_fact_id)),
      pricePerM2: valueCell(
        pricePerM2Fact,
        quantitativeExclusion && pricePerM2Fact ? "excluded" : null,
      ),
      reportedUnits: valueCell(
        facts.get(metricEntry?.reported_unit_count_fact_id),
      ),
      parking: valueCell(facts.get(metricEntry?.parking_count_fact_id)),
      attributes: attributeFacts
        .map((fact) => ({
          attributeId: fact.normalized_value,
          originalValue: fact.original_value,
          factId: fact.fact_id,
          state: "announced",
        }))
        .sort((left, right) => textCompare(left.attributeId, right.attributeId)),
      source: observation && !observationHasRestrictedEvidence
        ? {
            sourceId: observation.source_id,
            capturedAt: observation.captured_at,
            sourceUrl: observation.source_url,
            evidenceStatus: observation.evidence_status,
          }
        : null,
      inspectorPath: inspectorPathForProject(data, projectId),
    };
  });
  const status =
    quantitative.status === "ready" || quantitative.status === "orientative"
      ? quantitative.status
      : quantitative.orientative.n > 0
        ? "orientative_noncomparable"
        : qualitative.status === "ready"
          ? "ready"
          : "insufficient";
  if (!QUANTITATIVE_STATES.has(status)) {
    return emptyContext("error", ["INVALID_BENCHMARK_STATUS"]);
  }
  return {
    scope: {
      projectIds,
      projectCount: projectIds.length,
      districtId: scenarioContext?.district_id ?? null,
      scopeMode: scenarioContext?.scope_mode ?? null,
      quadrantId: scenarioContext?.quadrant_id ?? null,
      radiusMeters: scenarioContext?.radius_meters ?? null,
    },
    status,
    quantitative: { pricePerM2Total: quantitative },
    qualitative,
    coverage: {
      pricePerM2Total: quantitative.coverage,
      attributesAnnounced: qualitative.coverage,
    },
    methodology: {
      ...data.benchmark.methodology,
      allowed_area_denominators: [
        ...data.benchmark.methodology.allowed_area_denominators,
      ],
      exclusion_reason_precedence: [
        ...data.benchmark.methodology.exclusion_reason_precedence,
      ],
    },
    projectSummaries,
    targetScenario: normalizeTargetScenario(targetScenario),
    errorCodes: [],
  };
}

function validComparisonSummary(summary) {
  return (
    summary &&
    typeof summary.projectId === "string" &&
    summary.projectId &&
    [
      "publishedPrice",
      "totalArea",
      "pricePerM2",
      "reportedUnits",
      "parking",
    ].every((field) => summary[field] && typeof summary[field] === "object") &&
    Array.isArray(summary.attributes)
  );
}

function comparisonValue(summary, rowId) {
  const cells = {
    "price.published_from": summary.publishedPrice,
    "price.price_per_m2_total": summary.pricePerM2,
    "areas.total": summary.totalArea,
    "product.units_reported": summary.reportedUnits,
    "location.district": {
      state: summary.district ? "observed" : "unknown",
      normalizedValue: summary.district,
      originalValue: summary.district,
      unit: null,
      currency: null,
      factId: null,
      confidence: null,
      exclusionReason: null,
    },
    "delivery.status": {
      state: summary.deliveryStatus ? "observed" : "unknown",
      normalizedValue: summary.deliveryStatus,
      originalValue: summary.deliveryStatus,
      unit: null,
      currency: null,
      factId: null,
      confidence: null,
      exclusionReason: null,
    },
    "common_areas.announced": {
      state: summary.attributes.length ? "announced" : "unknown",
      normalizedValue: summary.attributes.map(({ attributeId }) => attributeId),
      originalValue: summary.attributes.map(({ originalValue }) => originalValue),
      unit: "attributes",
      currency: null,
      factId: null,
      confidence: null,
      exclusionReason: null,
    },
    "finishes.documented": valueCell(null),
    "parking.reported": summary.parking,
    "sources.confidence": {
      state: summary.source ? "observed" : "unknown",
      normalizedValue: summary.source?.evidenceStatus ?? null,
      originalValue: summary.source?.sourceId ?? null,
      unit: null,
      currency: null,
      factId: null,
      confidence: null,
      exclusionReason: null,
    },
  };
  return cells[rowId];
}

function valuesDiffer(values) {
  return new Set(
    values.map((value) => JSON.stringify(value?.normalizedValue ?? null)),
  ).size > 1;
}

function deriveConclusion({ rows, benchmarkContext, selectedCount }) {
  const findings = [];
  const priceRow = rows.find(({ id }) => id === "price.price_per_m2_total");
  const areaRow = rows.find(({ id }) => id === "areas.total");
  const attributeRow = rows.find(({ id }) => id === "common_areas.announced");
  if (selectedCount < 2) {
    findings.push({
      id: "finding:selection-insufficient",
      rowId: "sources.confidence",
      finding: "La selección todavía no permite una comparación lado a lado.",
      implication: "No existe base suficiente para priorizar una diferencia comercial.",
      nextAction: "Seleccionar al menos dos proyectos del escenario.",
      limitation: "La conclusión se limita por tamaño de selección.",
    });
  } else if (benchmarkContext.quantitative.pricePerM2Total.n === 0) {
    findings.push({
      id: "finding:price-insufficient",
      rowId: priceRow.id,
      finding: "No hay precio por m² elegible para posicionamiento.",
      implication: "El índice de mínimos solo describe publicaciones y no sustenta una recomendación de precio.",
      nextAction: "Validar una pareja precio–área de la misma oferta o tipología.",
      limitation: "Los cocientes no emparejados permanecen no comparables.",
    });
  }
  if (selectedCount >= 2 && areaRow && valuesDiffer(areaRow.values)) {
    findings.push({
      id: "finding:area-difference",
      rowId: areaRow.id,
      finding: "Las áreas totales publicadas difieren entre los proyectos seleccionados.",
      implication: "La lectura de precio debe conservar el mismo denominador de área total.",
      nextAction: "Revisar el valor original y la fuente de cada área.",
      limitation: "No se infieren áreas techadas o libres ausentes.",
    });
  }
  if (selectedCount >= 2 && attributeRow && valuesDiffer(attributeRow.values)) {
    findings.push({
      id: "finding:attribute-difference",
      rowId: attributeRow.id,
      finding: "Los atributos anunciados no son iguales entre los proyectos seleccionados.",
      implication: "La diferenciación visible puede investigarse sin asumir existencia física.",
      nextAction: "Abrir las fuentes disponibles y validar los atributos prioritarios.",
      limitation: "Anunciado no equivale a documentado o verificado.",
    });
  }
  return findings.slice(0, 3);
}

export function buildComparisonModel({
  benchmarkContext,
  selectedProjectIds = [],
  includeTargetScenario = false,
} = {}) {
  if (
    !benchmarkContext ||
    ["error", "contract_unavailable"].includes(benchmarkContext.status)
  ) {
    return {
      status: benchmarkContext?.status ?? "error",
      selected: [],
      removedProjectIds: sortedUnique(selectedProjectIds),
      groups: [],
      priorityRows: [],
      conclusion: [],
      limitations: ["Benchmark no disponible para el contrato activo."],
    };
  }
  if (
    !QUANTITATIVE_STATES.has(benchmarkContext.status) ||
    !Array.isArray(benchmarkContext.projectSummaries) ||
    benchmarkContext.projectSummaries.some(
      (summary) => !validComparisonSummary(summary),
    ) ||
    !benchmarkContext.quantitative?.pricePerM2Total ||
    !Number.isInteger(benchmarkContext.quantitative.pricePerM2Total.n) ||
    !Number.isInteger(
      benchmarkContext.quantitative.pricePerM2Total.orientative?.n,
    )
  ) {
    return {
      status: "error",
      selected: [],
      removedProjectIds: sortedUnique(selectedProjectIds),
      groups: [],
      priorityRows: [],
      conclusion: [],
      limitations: ["Benchmark no disponible para el contrato activo."],
    };
  }
  const allowed = recordMap(benchmarkContext.projectSummaries, "projectId");
  if (!allowed) {
    return {
      status: "error",
      selected: [],
      removedProjectIds: sortedUnique(selectedProjectIds),
      groups: [],
      priorityRows: [],
      conclusion: [],
      limitations: ["Benchmark no disponible para el contrato activo."],
    };
  }
  const uniqueRequested = [];
  for (const projectId of Array.isArray(selectedProjectIds)
    ? selectedProjectIds
    : []) {
    if (!uniqueRequested.includes(projectId)) uniqueRequested.push(projectId);
  }
  const validIds = uniqueRequested.filter((projectId) => allowed.has(projectId));
  const selectedIds = validIds.slice(0, 3);
  const removedProjectIds = uniqueRequested.filter(
    (projectId) => !selectedIds.includes(projectId),
  );
  const selected = selectedIds.map((projectId) => allowed.get(projectId));
  if (includeTargetScenario && benchmarkContext.targetScenario) {
    selected.push(benchmarkContext.targetScenario);
  }
  const definitions = [
    ["price", "Precio", [
      ["price.published_from", "Precio publicado desde"],
      ["price.price_per_m2_total", "Precio por m² de área total"],
    ]],
    ["areas", "Áreas", [["areas.total", "Área total"]]],
    ["product", "Producto", [["product.units_reported", "Unidades reportadas"]]],
    ["location", "Ubicación", [["location.district", "Distrito"]]],
    ["delivery", "Entrega", [["delivery.status", "Estado publicado"]]],
    ["common_areas", "Áreas comunes", [["common_areas.announced", "Atributos anunciados"]]],
    ["finishes", "Acabados", [["finishes.documented", "Acabados documentados"]]],
    ["parking", "Estacionamientos", [["parking.reported", "Estacionamientos reportados"]]],
    ["sources", "Fuentes y confianza", [["sources.confidence", "Fuente y cobertura"]]],
  ];
  const groups = definitions.map(([id, label, rows]) => ({
    id,
    label,
    rows: rows.map(([rowId, rowLabel]) => {
      const values = selected.map((summary) => ({
        projectId: summary.projectId,
        ...comparisonValue(summary, rowId),
      }));
      return {
        id: rowId,
        label: rowLabel,
        values,
        hasDifference: valuesDiffer(values),
        hasExcluded: values.some(({ state }) => state === "excluded"),
      };
    }),
  }));
  const rows = groups.flatMap(({ rows: groupRows }) => groupRows);
  const priorityRows = rows
    .filter(({ hasDifference, hasExcluded }) => hasDifference || hasExcluded)
    .map(({ id }) => id);
  const conclusion = deriveConclusion({
    rows,
    benchmarkContext,
    selectedCount: selectedIds.length,
  });
  const limitations = sortedUnique([
    ...(benchmarkContext.quantitative.pricePerM2Total.n === 0
      ? ["No existe precio por m² elegible en la muestra activa."]
      : []),
    ...(benchmarkContext.quantitative.pricePerM2Total.orientative.n > 0
      ? ["El índice orientativo de mínimos no sustenta posicionamiento de precio."]
      : []),
    ...(removedProjectIds.length
      ? ["La selección se corrigió al universo y máximo permitidos."]
      : []),
  ]);
  return {
    status: selectedIds.length >= 2 ? "ready" : "insufficient",
    selected: selected.map(({ projectId, name, agencyName }) => ({
      projectId,
      name,
      agencyName,
      simulated: projectId === "target:viva",
    })),
    removedProjectIds,
    groups,
    priorityRows,
    conclusion,
    limitations,
  };
}
