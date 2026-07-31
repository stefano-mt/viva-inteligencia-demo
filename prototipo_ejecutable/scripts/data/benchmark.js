const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

const clean = (value) => {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || null;
};

const number = (value, { minimum = 0, exclusive = false } = {}) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (exclusive ? parsed <= minimum : parsed < minimum) return null;
  return parsed;
};

const roundHalfUp = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const normalizeTerm = (value) =>
  String(value ?? "").normalize("NFC").trim().toLocaleLowerCase("es");

const normalizeConfidence = (value) => {
  const normalized = normalizeTerm(value);
  if (["alta", "high"].includes(normalized)) return "high";
  if (["media", "medium"].includes(normalized)) return "medium";
  if (["baja", "low"].includes(normalized)) return "low";
  return "unknown";
};

const splitList = (value, separator) =>
  String(value ?? "")
    .split(separator)
    .map((item) => clean(item))
    .filter(Boolean);

const safeHttpUrl = (value) => {
  const normalized = clean(value);
  return normalized && /^https?:\/\//i.test(normalized) ? normalized : null;
};

const uniqueSorted = (values) => [...new Set(values)].sort(compareText);

const exclusionText = Object.freeze({
  restricted: "Fuente restringida por la política de publicación.",
  blocking_issue: "Issue bloqueante aplicable al benchmark.",
  conflicting_observations: "Observaciones incompatibles sin verdad seleccionada.",
  price_area_link_unresolved:
    "Precio y área son mínimos de proyecto sin vínculo de oferta o tipología demostrado.",
  currency: "Moneda fuera de la política PEN del benchmark.",
  area_denominator: "Denominador de área distinto de área total.",
  cutoff: "Observación posterior al corte fijo del benchmark.",
  missing: "Dato no informado por la fuente."
});

function buildCatalogIndex(catalog, policy) {
  const byTerm = new Map();
  const byId = new Map();
  for (const attribute of catalog.attributes ?? []) {
    if (byId.has(attribute.attribute_id)) {
      throw new Error(`Duplicate benchmark attribute ${attribute.attribute_id}`);
    }
    byId.set(attribute.attribute_id, attribute);
    for (const term of [attribute.normalized_label, ...(attribute.aliases ?? [])]) {
      const normalized = normalizeTerm(term);
      const owner = byTerm.get(normalized);
      if (owner && owner.attribute_id !== attribute.attribute_id) {
        throw new Error(
          `Ambiguous benchmark attribute alias ${term}: ${owner.attribute_id}/${attribute.attribute_id}`
        );
      }
      if (normalized) byTerm.set(normalized, attribute);
    }
  }
  return {
    byTerm,
    byId,
    ignored: new Set(
      (policy.ignored_attribute_tokens ?? []).map((token) => normalizeTerm(token))
    )
  };
}

function baseFact({
  factId,
  observationId,
  projectId,
  fieldName,
  originalValue,
  normalizedValue,
  unit,
  semanticType,
  areaType = null,
  priceType = null,
  currency = null,
  denominatorAreaType = null,
  confidence,
  eligible,
  exclusionReason = null,
  valueKind = "observed",
  derivation = null
}) {
  return {
    fact_id: factId,
    observation_id: observationId,
    entity_id: projectId,
    field_name: fieldName,
    original_value: originalValue,
    normalized_value: normalizedValue,
    unit,
    value_kind: valueKind,
    semantic_type: semanticType,
    area_type: areaType,
    price_type: priceType,
    currency,
    denominator_area_type: denominatorAreaType,
    confidence,
    quality_status: eligible ? "certified" : "reviewable",
    benchmark_eligible: eligible,
    exclusion_reason: eligible
      ? null
      : exclusionText[exclusionReason] ?? String(exclusionReason),
    derivation
  };
}

function methodologyFromPolicy(policy) {
  const methodology = policy.methodology;
  return {
    cutoff_at: policy.source.cutoff_at,
    minimum_quantitative_sample: methodology.minimum_quantitative_sample,
    minimum_qualitative_informed_sample:
      methodology.minimum_qualitative_informed_sample,
    quantile_method: methodology.quantile_method,
    price_type_policy: methodology.price_type_policy,
    allowed_area_denominators: [...methodology.allowed_area_denominators],
    pairing_policy: methodology.pairing_policy,
    exclusion_reason_precedence: [
      ...methodology.exclusion_reason_precedence
    ],
    certification_label: methodology.certification_label
  };
}

function publicAttributeCatalog(catalog) {
  return [...(catalog.attributes ?? [])]
    .map(({ attribute_id, category, normalized_label, aliases }) => ({
      attribute_id,
      category,
      normalized_label,
      aliases: [...aliases]
    }))
    .sort((left, right) => compareText(left.attribute_id, right.attribute_id));
}

function emptyCoverage(inputProjectIds) {
  return {
    input_project_ids: [...inputProjectIds],
    used_project_ids: [],
    missing_project_ids: [],
    excluded_projects: []
  };
}

function exclude(coverage, projectId, reasons) {
  coverage.excluded_projects.push({
    project_id: projectId,
    reasons: uniqueSorted(reasons)
  });
}

function sortCoverage(coverage, precedence) {
  const position = new Map(precedence.map((reason, index) => [reason, index]));
  coverage.used_project_ids.sort(compareText);
  coverage.missing_project_ids.sort(compareText);
  coverage.excluded_projects.sort((left, right) =>
    compareText(left.project_id, right.project_id)
  );
  for (const entry of coverage.excluded_projects) {
    entry.reasons.sort(
      (left, right) =>
        (position.get(left) ?? Number.MAX_SAFE_INTEGER) -
          (position.get(right) ?? Number.MAX_SAFE_INTEGER) ||
        compareText(left, right)
    );
  }
  return coverage;
}

function assertCoveragePartition(coverage, indicatorId) {
  const output = [
    ...coverage.used_project_ids,
    ...coverage.missing_project_ids,
    ...coverage.excluded_projects.map(({ project_id: projectId }) => projectId)
  ];
  if (
    output.length !== new Set(output).size ||
    coverage.input_project_ids.length !== output.length ||
    coverage.input_project_ids.some((projectId) => !output.includes(projectId))
  ) {
    throw new Error(`Invalid benchmark coverage partition for ${indicatorId}`);
  }
}

export function blockingBenchmarkProjectIds(model) {
  const typologyToProject = new Map(
    (model.typologies ?? []).map(({ typology_id: typologyId, project_id: projectId }) => [
      typologyId,
      projectId
    ])
  );
  const factToProject = new Map(
    (model.facts ?? []).map(({ fact_id: factId, entity_id: entityId }) => [
      factId,
      entityId.startsWith("project:")
        ? entityId
        : typologyToProject.get(entityId) ?? null
    ])
  );
  const result = new Set();
  for (const issue of model.issues ?? []) {
    if (!issue.benchmark_blocking) continue;
    const direct = issue.entity_id.startsWith("project:")
      ? issue.entity_id
      : typologyToProject.get(issue.entity_id) ?? factToProject.get(issue.entity_id);
    if (direct) result.add(direct);
    for (const factId of issue.fact_ids ?? []) {
      const projectId = factToProject.get(factId);
      if (projectId) result.add(projectId);
    }
  }
  return result;
}

export function classifyBenchmarkRecords(records, policy) {
  const groups = new Map();
  for (const record of records) {
    const current = groups.get(record.project_id) ?? [];
    current.push(record);
    groups.set(record.project_id, current);
  }
  const inputProjectIds = [...groups.keys()].sort(compareText);
  const coverage = emptyCoverage(inputProjectIds);
  const eligible = [];
  const orientative = [];

  for (const projectId of inputProjectIds) {
    const projectRecords = groups.get(projectId);
    if (projectRecords.some(({ publish_permission: permission }) => permission === "restricted")) {
      exclude(coverage, projectId, ["restricted"]);
      continue;
    }
    const complete = projectRecords.filter(
      (record) =>
        number(record.published_price, { exclusive: true }) !== null &&
        number(record.total_area, { exclusive: true }) !== null &&
        number(record.price_per_m2, { exclusive: true }) !== null
    );
    if (!complete.length) {
      coverage.missing_project_ids.push(projectId);
      continue;
    }
    const paired = complete.filter(
      (record) =>
        record.pairing_status === "source_paired" &&
        ["offer_id", "typology_id", "native_metric"].includes(
          record.pairing_basis
        ) &&
        (record.pairing_evidence_ids ?? []).length > 0 &&
        record.currency === "PEN" &&
        record.area_type === "total"
    );
    const pairedSignatures = new Map();
    for (const record of paired) {
      const signature = JSON.stringify([
        Number(record.published_price),
        record.currency,
        Number(record.total_area),
        record.area_type,
        Number(record.price_per_m2)
      ]);
      const provenance = pairedSignatures.get(signature) ?? [];
      provenance.push(record.observation_id);
      pairedSignatures.set(signature, provenance);
    }
    if (pairedSignatures.size > 1) {
      exclude(coverage, projectId, ["conflicting_observations"]);
      continue;
    }
    if (pairedSignatures.size === 1) {
      const [signature, provenanceObservationIds] = [...pairedSignatures][0];
      coverage.used_project_ids.push(projectId);
      eligible.push({
        project_id: projectId,
        normalized_value: JSON.parse(signature)[4],
        provenance_observation_ids: uniqueSorted(provenanceObservationIds)
      });
      continue;
    }
    const unresolved = complete.find(
      ({ pairing_status: status }) => status === "project_minima_pair_unresolved"
    );
    if (unresolved) {
      exclude(coverage, projectId, ["price_area_link_unresolved"]);
      orientative.push({
        project_id: projectId,
        normalized_value: Number(unresolved.price_per_m2),
        provenance_observation_ids: [unresolved.observation_id]
      });
      continue;
    }
    exclude(coverage, projectId, ["conflicting_observations"]);
  }

  sortCoverage(coverage, policy.methodology.exclusion_reason_precedence);
  assertCoveragePartition(coverage, "price_per_m2_total");
  return {
    coverage,
    eligible: eligible.sort((left, right) => compareText(left.project_id, right.project_id)),
    orientative: orientative.sort((left, right) =>
      compareText(left.project_id, right.project_id)
    )
  };
}

export function materializeMarketBenchmark({
  rows,
  projects,
  policy,
  catalog,
  blockingProjectIds = new Set()
}) {
  if (policy.source.source_id !== "source:nexo") {
    throw new Error("Market benchmark policy must target source:nexo");
  }
  const projectIds = projects
    .map(({ project_id: projectId }) => projectId)
    .filter((projectId) => projectId.startsWith("project:nexo-"))
    .sort(compareText);
  const rowByProjectId = new Map();
  for (const row of rows) {
    const projectId = `project:nexo-${row.project_id}`;
    if (rowByProjectId.has(projectId)) {
      throw new Error(`Duplicate market benchmark source row ${projectId}`);
    }
    rowByProjectId.set(projectId, row);
  }
  const catalogIndex = buildCatalogIndex(catalog, policy);
  const observations = [];
  const facts = [];
  const factIndex = [];
  const unknownAttributeTokens = new Set();
  const coverage = {
    price_per_m2_total: emptyCoverage(projectIds),
    units_reported: emptyCoverage(projectIds),
    parking_reported: emptyCoverage(projectIds),
    attributes_announced: emptyCoverage(projectIds)
  };
  const cutoff = Date.parse(policy.source.cutoff_at);

  for (const projectId of projectIds) {
    const row = rowByProjectId.get(projectId);
    if (!row) throw new Error(`Missing benchmark source row for ${projectId}`);
    const sourceId = projectId.slice("project:nexo-".length);
    const observationId = `observation:benchmark-nexo-${sourceId}`;
    const capturedAt = clean(row.captured_at);
    const afterCutoff = !capturedAt || Date.parse(capturedAt) > cutoff;
    const confidence = normalizeConfidence(row.field_confidence);
    observations.push({
      observation_id: observationId,
      source_id: policy.source.source_id,
      entity_type: "project",
      entity_id: projectId,
      captured_at: capturedAt,
      source_url: safeHttpUrl(row.source_url),
      extraction_method: "versioned_snapshot_materialization",
      evidence_ids: [],
      evidence_status: "unavailable",
      evidence_absence_reason:
        "El snapshot estructurado no incluye un activo de evidencia publicable."
    });

    const price = number(row[policy.field_semantics.published_price.source_field], {
      exclusive: true
    });
    const currency = ["PEN", "USD"].includes(row.currency)
      ? row.currency
      : "unknown";
    const area = number(row[policy.field_semantics.total_area.source_field], {
      exclusive: true
    });
    const units = number(row[policy.field_semantics.reported_units.source_field]);
    const parking = number(row[policy.field_semantics.parking.source_field]);
    const blocked = blockingProjectIds.has(projectId);
    let priceFactId = null;
    let areaFactId = null;
    let pricePerM2FactId = null;
    let unitFactId = null;
    let parkingFactId = null;
    const attributeFactIds = [];

    if (price !== null) {
      priceFactId = `fact:benchmark-nexo-${sourceId}-price-from`;
      const priceEligible = !blocked && !afterCutoff && currency === "PEN";
      facts.push(
        baseFact({
          factId: priceFactId,
          observationId,
          projectId,
          fieldName: "published_price_from",
          originalValue: row[policy.field_semantics.published_price.source_field],
          normalizedValue: price,
          unit: currency,
          semanticType: "price",
          priceType: "from",
          currency,
          confidence,
          eligible: priceEligible,
          exclusionReason: blocked
            ? "blocking_issue"
            : afterCutoff
              ? "cutoff"
              : "currency"
        })
      );
    }
    if (area !== null) {
      areaFactId = `fact:benchmark-nexo-${sourceId}-total-area`;
      facts.push(
        baseFact({
          factId: areaFactId,
          observationId,
          projectId,
          fieldName: "total_area_min",
          originalValue: row[policy.field_semantics.total_area.source_field],
          normalizedValue: area,
          unit: "m2",
          semanticType: "area",
          areaType: "total",
          confidence,
          eligible: !blocked && !afterCutoff,
          exclusionReason: blocked ? "blocking_issue" : "cutoff"
        })
      );
    }
    if (
      priceFactId &&
      areaFactId &&
      currency === "PEN" &&
      !afterCutoff &&
      !blocked
    ) {
      pricePerM2FactId = `fact:benchmark-nexo-${sourceId}-price-per-total-m2-orientative`;
      facts.push(
        baseFact({
          factId: pricePerM2FactId,
          observationId,
          projectId,
          fieldName: "price_per_total_m2_orientative",
          originalValue: null,
          normalizedValue: roundHalfUp(price / area, 2),
          unit: "PEN/m2",
          semanticType: "price_per_m2",
          priceType: "from",
          currency: "PEN",
          denominatorAreaType: "total",
          confidence,
          eligible: false,
          exclusionReason: "price_area_link_unresolved",
          valueKind: "derived",
          derivation: {
            formula: "published_price_from / total_area_min",
            input_fact_ids: [priceFactId, areaFactId],
            rounding: { mode: "half_up", digits: 2 }
          }
        })
      );
    }
    if (units !== null) {
      unitFactId = `fact:benchmark-nexo-${sourceId}-units-reported`;
      facts.push(
        baseFact({
          factId: unitFactId,
          observationId,
          projectId,
          fieldName: "reported_unit_count",
          originalValue: row[policy.field_semantics.reported_units.source_field],
          normalizedValue: units,
          unit: "count",
          semanticType: "count",
          confidence,
          eligible: !afterCutoff,
          exclusionReason: "cutoff"
        })
      );
    }
    if (parking !== null) {
      parkingFactId = `fact:benchmark-nexo-${sourceId}-parking-reported`;
      facts.push(
        baseFact({
          factId: parkingFactId,
          observationId,
          projectId,
          fieldName: "parking_count",
          originalValue: row[policy.field_semantics.parking.source_field],
          normalizedValue: parking,
          unit: "count",
          semanticType: "count",
          confidence,
          eligible: !afterCutoff,
          exclusionReason: "cutoff"
        })
      );
    }

    const attributeById = new Map();
    for (const originalToken of splitList(
      row[policy.field_semantics.attributes.source_field],
      policy.field_semantics.attributes.separator
    )) {
      const normalized = normalizeTerm(originalToken);
      if (catalogIndex.ignored.has(normalized)) continue;
      const attribute = catalogIndex.byTerm.get(normalized);
      if (!attribute) {
        unknownAttributeTokens.add(originalToken);
        continue;
      }
      if (!attributeById.has(attribute.attribute_id)) {
        attributeById.set(attribute.attribute_id, originalToken);
      }
    }
    for (const [attributeId, originalToken] of [...attributeById].sort(
      ([left], [right]) => compareText(left, right)
    )) {
      const suffix = attributeId.slice("attribute:".length).replace(/-/g, "_");
      const factId = `fact:benchmark-nexo-${sourceId}-attribute-${attributeId.slice(
        "attribute:".length
      )}`;
      facts.push(
        baseFact({
          factId,
          observationId,
          projectId,
          fieldName: `attribute_${suffix}`,
          originalValue: originalToken,
          normalizedValue: attributeId,
          unit: "text",
          semanticType: "attribute",
          confidence,
          eligible: !afterCutoff,
          exclusionReason: "cutoff"
        })
      );
      attributeFactIds.push(factId);
    }

    if (blocked) {
      exclude(coverage.price_per_m2_total, projectId, ["blocking_issue"]);
    } else if (afterCutoff) {
      exclude(coverage.price_per_m2_total, projectId, ["cutoff"]);
    } else if (price !== null && currency === "USD") {
      exclude(coverage.price_per_m2_total, projectId, ["currency"]);
    } else if (price === null || area === null || currency === "unknown") {
      coverage.price_per_m2_total.missing_project_ids.push(projectId);
    } else {
      exclude(coverage.price_per_m2_total, projectId, [
        "price_area_link_unresolved"
      ]);
    }

    for (const [indicatorId, factId] of [
      ["units_reported", unitFactId],
      ["parking_reported", parkingFactId]
    ]) {
      if (afterCutoff) {
        exclude(coverage[indicatorId], projectId, ["cutoff"]);
      } else if (factId) {
        coverage[indicatorId].used_project_ids.push(projectId);
      } else {
        coverage[indicatorId].missing_project_ids.push(projectId);
      }
    }
    if (afterCutoff) {
      exclude(coverage.attributes_announced, projectId, ["cutoff"]);
    } else if (attributeFactIds.length) {
      coverage.attributes_announced.used_project_ids.push(projectId);
    } else {
      coverage.attributes_announced.missing_project_ids.push(projectId);
    }

    factIndex.push({
      project_id: projectId,
      observation_id: observationId,
      total_area_fact_id: blocked ? null : areaFactId,
      published_price_fact_id: priceFactId,
      price_per_m2_fact_id: blocked ? null : pricePerM2FactId,
      pairing_status: blocked
        ? "conflicting"
        : price !== null && area !== null && currency !== "unknown"
          ? "project_minima_pair_unresolved"
          : "missing",
      pairing_basis: blocked
        ? "none"
        : price !== null && area !== null && currency !== "unknown"
          ? "project_minima"
          : "none",
      pairing_evidence_ids: [],
      reported_unit_count_fact_id: unitFactId,
      parking_count_fact_id: parkingFactId,
      attribute_fact_ids: attributeFactIds.sort(compareText)
    });
  }

  const precedence = policy.methodology.exclusion_reason_precedence;
  for (const [indicatorId, indicatorCoverage] of Object.entries(coverage)) {
    sortCoverage(indicatorCoverage, precedence);
    assertCoveragePartition(indicatorCoverage, indicatorId);
  }
  const observationIds = observations.map(({ observation_id: id }) => id);
  const factIds = facts.map(({ fact_id: id }) => id);
  if (new Set(observationIds).size !== observationIds.length) {
    throw new Error("Market benchmark generated duplicate observation IDs");
  }
  if (new Set(factIds).size !== factIds.length) {
    throw new Error("Market benchmark generated duplicate fact IDs");
  }

  return {
    observations: observations.sort((left, right) =>
      compareText(left.observation_id, right.observation_id)
    ),
    facts: facts.sort((left, right) => compareText(left.fact_id, right.fact_id)),
    benchmark: {
      version: 1,
      methodology: methodologyFromPolicy(policy),
      fact_index: factIndex.sort((left, right) =>
        compareText(left.project_id, right.project_id)
      ),
      attribute_catalog: publicAttributeCatalog(catalog),
      coverage: { indicators: coverage }
    },
    diagnostics: {
      unknown_attribute_tokens: [...unknownAttributeTokens].sort(compareText)
    }
  };
}
