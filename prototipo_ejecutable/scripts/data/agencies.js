import { createHash } from "node:crypto";

export const SNAPSHOT_PATHS = Object.freeze({
  scope: "datos_relevantes/service_scope_matrix.csv",
  discovery: "datos_relevantes/agency_web_discovery_matrix_validated.csv",
  web: "datos_relevantes/webs_propias_sample_dataset.csv",
  nexo: "datos_relevantes/viva_minimum_dataset_latest.csv",
  matching: "datos_relevantes/nexo_web_project_match.csv"
});

export const PILOT_MINIMUMS = Object.freeze({
  base_count: 30,
  enriched_count: 15,
  deep_count: 5
});

export const DEEP_PROJECT_BY_AGENCY = Object.freeze({
  "agency:actual": "4007",
  "agency:aster-homes": "3391",
  "agency:brazil-grupo-inmobiliario": "2965",
  "agency:cantabria": "3981",
  "agency:toratto-grupo-inmobiliario": "1940"
});

const TYC_SOURCE_NAMES = new Set(["GRUPO T&C", "GRUPO TyC"]);
const TYC_AGENCY_ID = "agency:grupo-tyc";
const ELIGIBLE_DECISIONS = new Set(["Go", "Go condicionado"]);
const BLOCKING_DISCOVERY_FLAGS = new Set([
  "blocked_access",
  "tos_restrictive",
  "robots_disallow_relevant_paths"
]);
const MATCH_CLASSES = new Set(["match_high", "match_medium"]);
const DEEP_FACT_FIELDS = Object.freeze([
  "district",
  "address",
  "latitude",
  "longitude",
  "bedrooms_min",
  "bedrooms_max",
  "bathrooms_min",
  "bathrooms_max",
  "total_area_min",
  "total_area_max",
  "unit_status",
  "unit_count",
  "price_min",
  "currency"
]);
const PUBLIC_DEEP_FRAGMENT_FIELDS = Object.freeze([
  "project_id",
  "project_name",
  "district",
  "typology",
  "bedrooms_min",
  "bedrooms_max",
  "bathrooms_min",
  "bathrooms_max",
  "total_area_min",
  "total_area_max",
  "unit_status",
  "unit_count",
  "price_min",
  "currency",
  "field_confidence"
]);
const NUMERIC_DEEP_FRAGMENT_FIELDS = new Set([
  "bedrooms_min",
  "bedrooms_max",
  "bathrooms_min",
  "bathrooms_max",
  "total_area_min",
  "total_area_max",
  "unit_count",
  "price_min"
]);

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareNumbersDescending(left, right) {
  return right - left;
}

function asNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isPresent(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function uniqueSorted(values) {
  return [...new Set(values.filter(isPresent))].sort(compareStrings);
}

function clone(value) {
  return structuredClone(value);
}

export function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function normalizeAgencyName(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("agency name must be a non-empty string");
  }
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeDomain(value) {
  if (!isPresent(value)) {
    return null;
  }
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

export function normalizeUrl(value) {
  if (!isPresent(value)) {
    return null;
  }
  return String(value).trim().replace(/\/+$/, "").toLowerCase();
}

export function stableAgencyId(value) {
  return `agency:${normalizeAgencyName(value).replace(/ /g, "-")}`;
}

export function parseCsv(csvText) {
  if (typeof csvText !== "string") {
    throw new TypeError("CSV input must be text");
  }

  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let line = 1;
  let rowStartLine = 1;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    const next = csvText[index + 1];

    if (quoted) {
      if (character === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
        if (character === "\n") {
          line += 1;
        }
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\r" && next === "\n") {
      row.push(field);
      rows.push({ values: row, line: rowStartLine });
      row = [];
      field = "";
      index += 1;
      line += 1;
      rowStartLine = line;
    } else if (character === "\n") {
      row.push(field);
      rows.push({ values: row, line: rowStartLine });
      row = [];
      field = "";
      line += 1;
      rowStartLine = line;
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new Error("CSV contains an unterminated quoted field");
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push({ values: row, line: rowStartLine });
  }
  while (rows.length > 0 && rows.at(-1).values.every((value) => value === "")) {
    rows.pop();
  }
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].values;
  if (new Set(headers).size !== headers.length) {
    throw new Error("CSV headers must be unique");
  }

  return rows.slice(1).map(({ values, line: sourceLine }) => {
    if (values.length !== headers.length) {
      throw new Error(
        `CSV row at line ${sourceLine} has ${values.length} fields; expected ${headers.length}`
      );
    }
    const record = Object.fromEntries(
      headers.map((header, index) => [header, values[index]])
    );
    Object.defineProperty(record, "__row_number", {
      value: sourceLine,
      enumerable: false,
      writable: false
    });
    return record;
  });
}

function snapshotDescriptor(path, text) {
  return {
    path,
    sha256: sha256(text)
  };
}

export function parseAgencyInputs(inputTexts) {
  const requiredKeys = Object.keys(SNAPSHOT_PATHS);
  for (const key of requiredKeys) {
    if (typeof inputTexts[key] !== "string") {
      throw new TypeError(`missing CSV text for ${key}`);
    }
  }
  return {
    rows: {
      scope: parseCsv(inputTexts.scope),
      discovery: parseCsv(inputTexts.discovery),
      web: parseCsv(inputTexts.web),
      nexo: parseCsv(inputTexts.nexo),
      matching: parseCsv(inputTexts.matching)
    },
    snapshots: Object.fromEntries(
      requiredKeys.map((key) => [
        key,
        snapshotDescriptor(SNAPSHOT_PATHS[key], inputTexts[key])
      ])
    )
  };
}

function sharedDomainReviewNames(scopeRows) {
  const byDomain = new Map();
  for (const record of scopeRows) {
    const domain = normalizeDomain(record.domain);
    if (!domain) {
      continue;
    }
    const names = byDomain.get(domain) ?? [];
    names.push(record.agency_name);
    byDomain.set(domain, names);
  }

  const manualNames = new Set();
  const groups = [];
  for (const [domain, rawNames] of byDomain) {
    const names = uniqueSorted(rawNames);
    if (names.length < 2) {
      continue;
    }
    if (names.every((name) => TYC_SOURCE_NAMES.has(name))) {
      continue;
    }
    groups.push({ domain, source_names: names });
    for (const name of names) {
      manualNames.add(name);
    }
  }
  groups.sort((left, right) => compareStrings(left.domain, right.domain));
  return { manualNames, groups };
}

function agencyIdForSourceName(sourceName, manualNames) {
  if (TYC_SOURCE_NAMES.has(sourceName)) {
    return TYC_AGENCY_ID;
  }
  if (manualNames.has(sourceName)) {
    return null;
  }
  return stableAgencyId(sourceName);
}

function canonicalNameForGroup(sourceNames) {
  if (sourceNames.some((name) => TYC_SOURCE_NAMES.has(name))) {
    return "GRUPO T&C";
  }
  return [...sourceNames].sort(compareStrings)[0];
}

function buildRegistrySkeleton(scopeRows) {
  const { manualNames, groups: manualReviewGroups } =
    sharedDomainReviewNames(scopeRows);
  const aliases = [];
  const agenciesById = new Map();

  const sortedScope = [...scopeRows].sort((left, right) =>
    compareStrings(left.agency_name, right.agency_name)
  );
  for (const row of sortedScope) {
    const agencyId = agencyIdForSourceName(row.agency_name, manualNames);
    aliases.push({
      alias_original: row.agency_name,
      alias_normalized: normalizeAgencyName(row.agency_name),
      agency_id: agencyId,
      resolution: agencyId === null ? "manual_review" : "rule_based",
      evidence_ids: []
    });
    if (agencyId === null) {
      continue;
    }

    const existing = agenciesById.get(agencyId) ?? {
      agency_id: agencyId,
      source_names: [],
      domains: []
    };
    existing.source_names.push(row.agency_name);
    const domain = normalizeDomain(row.domain);
    if (domain) {
      existing.domains.push(domain);
    }
    agenciesById.set(agencyId, existing);
  }

  const agencies = [...agenciesById.values()]
    .map((group) => {
      const sourceNames = uniqueSorted(group.source_names);
      const domains = uniqueSorted(group.domains);
      const canonicalName = canonicalNameForGroup(sourceNames);
      return {
        agency_id: group.agency_id,
        canonical_name: canonicalName,
        normalized_name: normalizeAgencyName(canonicalName),
        domain: domains.length === 1 ? domains[0] : null,
        pilot_selected: false,
        coverage_tier: null,
        source_names: sourceNames,
        selection_reason: null
      };
    })
    .sort((left, right) => compareStrings(left.agency_id, right.agency_id));

  return {
    agencies,
    agency_aliases: aliases,
    manual_review_groups: manualReviewGroups,
    sourceNameToAgencyId: new Map(
      aliases.map((alias) => [alias.alias_original, alias.agency_id])
    )
  };
}

export function buildCanonicalRegistry(scopeRows) {
  const registry = buildRegistrySkeleton(scopeRows);
  return {
    agencies: clone(registry.agencies),
    agency_aliases: clone(registry.agency_aliases),
    manual_review_groups: clone(registry.manual_review_groups)
  };
}

function indexRows(rows, keyFunction) {
  const index = new Map();
  for (const row of rows) {
    const key = keyFunction(row);
    if (!isPresent(key)) {
      continue;
    }
    const existing = index.get(key) ?? [];
    existing.push(row);
    index.set(key, existing);
  }
  return index;
}

function candidateMetrics(
  registry,
  scopeRows,
  discoveryRows,
  exactMatches
) {
  const byAgency = new Map(
    registry.agencies.map((agency) => [
      agency.agency_id,
      {
        agency_id: agency.agency_id,
        source_names: agency.source_names,
        final_decisions: [],
        discovery_flags: [],
        included_in_mvp: false,
        coverage: 0,
        viability: 0,
        high_matches: [],
        medium_matches: []
      }
    ])
  );

  for (const row of scopeRows) {
    const agencyId = registry.sourceNameToAgencyId.get(row.agency_name);
    const candidate = byAgency.get(agencyId);
    if (!candidate) {
      continue;
    }
    candidate.final_decisions.push(row.final_decision);
    candidate.included_in_mvp ||= row.included_in_mvp === "true";
    candidate.coverage = Math.max(
      candidate.coverage,
      asNumber(row.coverage_critical_pct)
    );
    candidate.viability = Math.max(
      candidate.viability,
      asNumber(row.viability_score)
    );
  }

  for (const row of discoveryRows) {
    const agencyId = registry.sourceNameToAgencyId.get(row.agency_name);
    const candidate = byAgency.get(agencyId);
    if (!candidate) {
      continue;
    }
    candidate.discovery_flags.push(row.legal_operational_flag);
  }

  for (const match of exactMatches) {
    const candidate = byAgency.get(match.agency_id);
    if (!candidate) {
      continue;
    }
    if (match.match_class === "match_high") {
      candidate.high_matches.push(match);
    } else {
      candidate.medium_matches.push(match);
    }
  }

  for (const candidate of byAgency.values()) {
    candidate.final_decisions = uniqueSorted(candidate.final_decisions);
    candidate.discovery_flags = uniqueSorted(candidate.discovery_flags);
    candidate.high_matches.sort(compareExactMatches);
    candidate.medium_matches.sort(compareExactMatches);
    candidate.mandatory =
      candidate.included_in_mvp || candidate.agency_id === TYC_AGENCY_ID;
    candidate.eligible =
      candidate.final_decisions.some((decision) =>
        ELIGIBLE_DECISIONS.has(decision)
      ) &&
      !candidate.discovery_flags.some((flag) =>
        BLOCKING_DISCOVERY_FLAGS.has(flag)
      );
  }
  return byAgency;
}

function compareExactMatches(left, right) {
  return (
    compareNumbersDescending(left.match_score, right.match_score) ||
    compareStrings(left.nexo_project_id, right.nexo_project_id) ||
    compareStrings(left.web_project_url, right.web_project_url)
  );
}

function exactProjectMatches(registry, rows) {
  const nexoByProjectId = indexRows(rows.nexo, (row) => row.project_id);
  const webByUrl = indexRows(rows.web, (row) => normalizeUrl(row.source_url));
  const deduplicated = new Map();
  const highContradictions = [];

  for (const row of rows.matching) {
    if (!MATCH_CLASSES.has(row.match_class)) {
      continue;
    }
    const agencyId = registry.sourceNameToAgencyId.get(row.agency_name);
    const webUrl = normalizeUrl(row.web_project_url);
    const nexoRows = nexoByProjectId.get(row.nexo_project_id) ?? [];
    const webRows = webByUrl.get(webUrl) ?? [];
    const reasons = [];
    if (!agencyId) reasons.push("MATCH_AGENCY_UNRESOLVED");
    if (row.matched_on_agency !== "true") {
      reasons.push("MATCHED_ON_AGENCY_NOT_TRUE");
    }
    if (!webUrl) reasons.push("WEB_URL_MISSING");
    if (nexoRows.length !== 1) {
      reasons.push(`NEXO_JOIN_COUNT_${nexoRows.length}`);
    }
    if (webRows.length !== 1) {
      reasons.push(`WEB_JOIN_COUNT_${webRows.length}`);
    }
    if (row.match_class === "match_high" && row.requires_human_review !== "false") {
      reasons.push("HIGH_REQUIRES_HUMAN_REVIEW");
    }
    if (agencyId && nexoRows.length === 1 && webRows.length === 1) {
      const nexoAgencyId = registry.sourceNameToAgencyId.get(
        nexoRows[0].agency_name
      );
      const webAgencyId = registry.sourceNameToAgencyId.get(
        webRows[0].agency_name
      );
      if (!nexoAgencyId || nexoAgencyId !== agencyId) {
        reasons.push("NEXO_AGENCY_MISMATCH");
      }
      if (!webAgencyId || webAgencyId !== agencyId) {
        reasons.push("WEB_AGENCY_MISMATCH");
      }
    }
    if (reasons.length > 0) {
      if (row.match_class === "match_high") {
        const stableKey = [
          row.agency_name || "<missing-agency>",
          row.web_project_url || "<missing-web-url>",
          row.nexo_project_id || "<missing-nexo-id>"
        ].join("|");
        highContradictions.push(
          `${stableKey}: ${[...new Set(reasons)].sort(compareStrings).join(",")}`
        );
      }
      continue;
    }

    const key = [
      agencyId,
      row.match_class,
      row.nexo_project_id,
      webUrl
    ].join("|");
    if (deduplicated.has(key)) {
      continue;
    }
    deduplicated.set(key, {
      agency_id: agencyId,
      source_agency_name: row.agency_name,
      match_class: row.match_class,
      match_score: asNumber(row.match_score),
      requires_human_review: row.requires_human_review === "true",
      nexo_project_id: row.nexo_project_id,
      web_project_url: row.web_project_url,
      matching_row_number: row.__row_number ?? null,
      nexo_row_number: nexoRows[0].__row_number ?? null,
      web_row_number: webRows[0].__row_number ?? null,
      nexo: nexoRows[0],
      web: webRows[0]
    });
  }

  if (highContradictions.length > 0) {
    throw new Error(
      `contradictory high matches:\n${uniqueSorted(highContradictions).join("\n")}`
    );
  }

  return [...deduplicated.values()].sort(
    (left, right) =>
      compareStrings(left.agency_id, right.agency_id) ||
      compareStrings(left.match_class, right.match_class) ||
      compareExactMatches(left, right)
  );
}

function candidateComparator(left, right) {
  return (
    compareNumbersDescending(
      left.high_matches.length,
      right.high_matches.length
    ) ||
    compareNumbersDescending(left.coverage, right.coverage) ||
    compareNumbersDescending(left.viability, right.viability) ||
    compareStrings(left.agency_id, right.agency_id)
  );
}

function deepFactFields(nexoRow) {
  return DEEP_FACT_FIELDS.filter((field) => isPresent(nexoRow[field]));
}

function qualifiedDeepMatch(candidate) {
  const expectedProjectId = DEEP_PROJECT_BY_AGENCY[candidate.agency_id];
  if (!expectedProjectId) {
    return null;
  }
  const match = candidate.high_matches.find(
    (record) =>
      record.nexo_project_id === expectedProjectId &&
      record.requires_human_review === false
  );
  if (!match || !isPresent(match.nexo.typology)) {
    return null;
  }
  const factFields = deepFactFields(match.nexo);
  if (factFields.length < 3) {
    return null;
  }
  return { match, factFields };
}

function sanitizedFragment(row) {
  return Object.fromEntries(
    PUBLIC_DEEP_FRAGMENT_FIELDS.filter((field) => isPresent(row[field])).map(
      (field) => [
        field,
        NUMERIC_DEEP_FRAGMENT_FIELDS.has(field)
          ? asNumber(row[field])
          : row[field]
      ]
    )
  );
}

function logicalSnapshotRef(snapshot, rowKey) {
  return {
    snapshot_path: snapshot.path,
    snapshot_sha256: snapshot.sha256,
    row_key: rowKey
  };
}

function tierEvidence(candidate, tier, snapshots) {
  const deep = tier === "deep" ? qualifiedDeepMatch(candidate) : null;
  const match =
    deep?.match ??
    candidate.high_matches.find(
      (record) => record.requires_human_review === false
    ) ??
    null;
  if (!match) {
    return null;
  }

  const matching = {
    ...logicalSnapshotRef(snapshots.matching, {
      agency_name: match.source_agency_name,
      web_project_url: match.web_project_url,
      nexo_project_id: match.nexo_project_id
    }),
    match_class: match.match_class,
    match_score: match.match_score,
    requires_human_review: match.requires_human_review,
    exact_join: true
  };
  const web = {
    ...logicalSnapshotRef(snapshots.web, {
      source_url: match.web.source_url
    }),
    source_type: match.web.source_type,
    external_evidence_status: "unavailable",
    external_evidence_absence_reason:
      "Referenced extractor artifact is not present in the versioned repository snapshot."
  };
  const nexo = {
    ...logicalSnapshotRef(snapshots.nexo, {
      project_id: match.nexo.project_id
    }),
    source: match.nexo.source,
    captured_at: match.nexo.captured_at
  };

  if (deep) {
    nexo.evidence_kind = "structured_value";
    nexo.inspectable_typology = match.nexo.typology;
    nexo.backed_fact_fields = deep.factFields;
    nexo.sanitized_fragment = sanitizedFragment(match.nexo);
    nexo.sanitized_fragment_sha256 = sha256(
      JSON.stringify(nexo.sanitized_fragment)
    );
  }

  return {
    linked_source_count: 2,
    matching,
    web,
    nexo
  };
}

function selectionReason(candidate, tier) {
  const reasons = [];
  if (candidate.included_in_mvp) {
    reasons.push("mandatory_mvp");
  }
  if (candidate.agency_id === TYC_AGENCY_ID) {
    reasons.push("ct_g_required_alias_group");
  }
  if (!candidate.mandatory) {
    reasons.push("ranked_completion");
  }
  if (tier === "deep") {
    reasons.push("high_exact_join_and_versioned_structured_evidence");
  } else if (tier === "enriched") {
    reasons.push("high_exact_join");
  } else {
    reasons.push("base_scope_only");
  }
  return reasons.join("; ");
}

function selectCandidates(metrics, desiredCount) {
  const candidates = [...metrics.values()];
  const eligible = candidates.filter((candidate) => candidate.eligible);
  const mandatory = eligible.filter((candidate) => candidate.mandatory);
  const ranked = [...eligible].sort(candidateComparator);
  const selectedIds = new Set(mandatory.map((candidate) => candidate.agency_id));

  for (const candidate of ranked) {
    if (selectedIds.size >= desiredCount) {
      break;
    }
    selectedIds.add(candidate.agency_id);
  }
  if (selectedIds.size < desiredCount) {
    throw new Error(
      `pilot selection has ${selectedIds.size} eligible agencies; requires ${desiredCount}`
    );
  }

  return ranked.filter((candidate) => selectedIds.has(candidate.agency_id));
}

function assertPilotPreconditions(registry, metrics, scopeRows) {
  const automatableRows = scopeRows.filter(
    (row) => row.included_in_mvp === "true"
  );
  if (automatableRows.length !== 10) {
    throw new Error(
      `automatable scope must contain exactly 10 records; found ${automatableRows.length}`
    );
  }
  const automatableIds = new Set();
  for (const row of automatableRows) {
    const agencyId = registry.sourceNameToAgencyId.get(row.agency_name);
    if (!agencyId) {
      throw new Error(`mandatory MVP alias is unresolved: ${row.agency_name}`);
    }
    const candidate = metrics.get(agencyId);
    if (!candidate?.eligible) {
      throw new Error(`mandatory MVP agency is not selectable: ${agencyId}`);
    }
    automatableIds.add(agencyId);
  }
  if (automatableIds.size !== 10) {
    throw new Error(
      `automatable scope must resolve to exactly 10 agencies; found ${automatableIds.size}`
    );
  }

  const tycAgency = registry.agencies.find(
    (agency) => agency.agency_id === TYC_AGENCY_ID
  );
  if (
    !tycAgency ||
    !["GRUPO T&C", "GRUPO TyC"].every((name) =>
      tycAgency.source_names.includes(name)
    )
  ) {
    throw new Error("GRUPO T&C / GRUPO TyC alias group is incomplete");
  }
  if (!metrics.get(TYC_AGENCY_ID)?.eligible) {
    throw new Error("GRUPO T&C alias group is not selectable");
  }

  for (const candidate of metrics.values()) {
    if (candidate.source_names.length < 2) continue;
    const hasGo = candidate.final_decisions.some((decision) =>
      ELIGIBLE_DECISIONS.has(decision)
    );
    const hasNoGo = candidate.final_decisions.some((decision) =>
      decision.startsWith("No-go")
    );
    if (hasGo && hasNoGo) {
      throw new Error(
        `alias group has contradictory Go/no-go decisions: ${candidate.agency_id}`
      );
    }
  }
  return automatableIds;
}

function buildConsolidationReport(registry, scopeRows, selected) {
  const decisions = Object.fromEntries(
    [...new Set(scopeRows.map((row) => row.final_decision))]
      .sort(compareStrings)
      .map((decision) => [
        decision,
        scopeRows.filter((row) => row.final_decision === decision).length
      ])
  );
  return {
    raw_scope_record_count: scopeRows.length,
    canonical_agency_count: registry.agencies.length,
    resolved_alias_count: registry.agency_aliases.filter(
      (alias) => alias.agency_id !== null
    ).length,
    manual_review_alias_count: registry.agency_aliases.filter(
      (alias) => alias.resolution === "manual_review"
    ).length,
    manual_review_groups: registry.manual_review_groups,
    rule_based_consolidations: [
      {
        agency_id: TYC_AGENCY_ID,
        source_names: ["GRUPO T&C", "GRUPO TyC"],
        resolution: "rule_based"
      }
    ],
    source_decision_counts: decisions,
    selected_mandatory_mvp_count: selected.filter(
      (candidate) => candidate.included_in_mvp
    ).length,
    selected_ct_g_alias_group: selected.some(
      (candidate) => candidate.agency_id === TYC_AGENCY_ID
    )
  };
}

function buildAgencyArtifactsFromParsed({ rows, snapshots }) {
  const registry = buildRegistrySkeleton(rows.scope);
  const exactMatches = exactProjectMatches(registry, rows);
  const metrics = candidateMetrics(
    registry,
    rows.scope,
    rows.discovery,
    exactMatches
  );
  const mandatoryMvpIds = assertPilotPreconditions(
    registry,
    metrics,
    rows.scope
  );
  const selected = selectCandidates(metrics, PILOT_MINIMUMS.base_count);
  const selectedIdSet = new Set(selected.map((candidate) => candidate.agency_id));
  for (const agencyId of mandatoryMvpIds) {
    if (!selectedIdSet.has(agencyId)) {
      throw new Error(`mandatory MVP agency was not selected: ${agencyId}`);
    }
  }
  if (!selectedIdSet.has(TYC_AGENCY_ID)) {
    throw new Error("GRUPO T&C alias group was not selected");
  }
  const selectedById = new Map(selected.map((candidate) => [candidate.agency_id, candidate]));
  const deepById = new Map();

  for (const candidate of selected) {
    const deep = qualifiedDeepMatch(candidate);
    if (deep) {
      deepById.set(candidate.agency_id, deep);
    }
  }
  if (deepById.size < PILOT_MINIMUMS.deep_count) {
    throw new Error(
      `deep tier has ${deepById.size} demonstrated agencies; requires ${PILOT_MINIMUMS.deep_count}`
    );
  }

  const agencies = registry.agencies.map((agency) => {
    const candidate = selectedById.get(agency.agency_id);
    if (!candidate) {
      return agency;
    }
    const tier = deepById.has(agency.agency_id)
      ? "deep"
      : candidate.high_matches.some(
            (match) => match.requires_human_review === false
          )
        ? "enriched"
        : "base";
    return {
      ...agency,
      pilot_selected: true,
      coverage_tier: tier,
      selection_reason: selectionReason(candidate, tier)
    };
  });
  const agencyById = new Map(
    agencies.map((agency) => [agency.agency_id, agency])
  );

  const entries = selected.map((candidate, index) => {
    const agency = agencyById.get(candidate.agency_id);
    const tier = agency.coverage_tier;
    return {
      rank: index + 1,
      agency_id: candidate.agency_id,
      coverage_tier: tier,
      selection_reason: agency.selection_reason,
      metrics: {
        high_exact_match_count: candidate.high_matches.filter(
          (match) => match.requires_human_review === false
        ).length,
        medium_exact_match_count: candidate.medium_matches.length,
        critical_coverage_pct: candidate.coverage,
        viability_score: candidate.viability,
        mandatory_mvp: candidate.included_in_mvp,
        final_decisions: candidate.final_decisions,
        discovery_flags: candidate.discovery_flags
      },
      evidence: {
        scope: logicalSnapshotRef(snapshots.scope, {
          agency_names: candidate.source_names
        }),
        discovery: logicalSnapshotRef(snapshots.discovery, {
          agency_names: candidate.source_names
        }),
        tier: tierEvidence(candidate, tier, snapshots)
      }
    };
  });

  const exclusiveTierCounts = {
    base: entries.filter((entry) => entry.coverage_tier === "base").length,
    enriched: entries.filter((entry) => entry.coverage_tier === "enriched")
      .length,
    deep: entries.filter((entry) => entry.coverage_tier === "deep").length
  };
  const counts = {
    market_raw_count: rows.scope.length,
    canonical_registry_count: agencies.length,
    base_count: entries.length,
    enriched_count: exclusiveTierCounts.enriched + exclusiveTierCounts.deep,
    deep_count: exclusiveTierCounts.deep,
    exclusive_tier_counts: exclusiveTierCounts
  };
  if (counts.base_count < PILOT_MINIMUMS.base_count) {
    throw new Error("base_count minimum is not demonstrated");
  }
  if (counts.enriched_count < PILOT_MINIMUMS.enriched_count) {
    throw new Error("enriched_count minimum is not demonstrated");
  }
  if (counts.deep_count < PILOT_MINIMUMS.deep_count) {
    throw new Error("deep_count minimum is not demonstrated");
  }

  const sourceSnapshots = Object.values(snapshots).sort((left, right) =>
    compareStrings(left.path, right.path)
  );
  const consolidationReport = buildConsolidationReport(
    registry,
    rows.scope,
    selected
  );

  return {
    agenciesFile: {
      version: "demo-pilot-agencies-v1",
      source_snapshots: sourceSnapshots,
      agencies,
      agency_aliases: registry.agency_aliases,
      consolidation_report: consolidationReport
    },
    pilotSelectionFile: {
      version: "demo-pilot-selection-v1",
      selection_rule: {
        target_count: PILOT_MINIMUMS.base_count,
        mandatory_groups: [
          "service_scope_matrix.included_in_mvp=true",
          "agency:grupo-tyc"
        ],
        eligibility:
          "Go or Go condicionado, excluding legal/operational blocking flags and unresolved aliases.",
        ordering: [
          "high_exact_match_count_desc",
          "critical_coverage_pct_desc",
          "viability_score_desc",
          "agency_id_asc"
        ],
        tier_policy: {
          base: "Selected agency with scope evidence.",
          enriched:
            "Selected agency with an exact high match joining the versioned web and Nexo snapshots; no human review required.",
          deep:
            "Enriched agency with at least three structured facts and an inspectable Nexo typology in versioned evidence."
        }
      },
      source_snapshots: sourceSnapshots,
      selected_agency_ids: entries.map((entry) => entry.agency_id),
      entries,
      counts,
      consolidation_report: consolidationReport
    }
  };
}

export function buildAgencyArtifacts(inputTexts) {
  return buildAgencyArtifactsFromParsed(parseAgencyInputs(inputTexts));
}

export function serializeAgencyArtifact(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

const AGENCY_ID_PATTERN = /^agency:[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const FORBIDDEN_PUBLIC_KEY =
  /(?:^|_)(?:contact|email|phone|whatsapp|payload|raw_payload|rawpayload|evidence_path)(?:_|$)/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_PATTERN = /(?:\+?51[\s().-]*)?9(?:[\s().-]*\d){8}/;
const LOCAL_PATH_PATTERN =
  /(?:(?:^|[\s"'(])(?:[A-Za-z]:[\\/]|\/Users\/|\/home\/[^/\\]+[\\/]|outputs[\\/])|AppData[\\/]|(?:^|[\\/])Temp[\\/])/i;

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort(compareStrings)
      .map((key) => [key, stableValue(value[key])])
  );
}

function valuesEqual(left, right) {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

function expectExactKeys(value, expectedKeys, path, errors) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }
  const actual = Object.keys(value).sort(compareStrings);
  const expected = [...expectedKeys].sort(compareStrings);
  if (!valuesEqual(actual, expected)) {
    errors.push(`${path} has invalid keys: ${actual.join(",")}`);
    return false;
  }
  return true;
}

function expectString(value, path, errors, { nullable = false } = {}) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${path} must be a non-empty string`);
  }
}

function expectNumber(value, path, errors, { integer = false } = {}) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    (integer && !Number.isInteger(value))
  ) {
    errors.push(`${path} must be a finite${integer ? " integer" : ""} number`);
  }
}

function validateSnapshotShape(snapshot, path, errors) {
  if (!expectExactKeys(snapshot, ["path", "sha256"], path, errors)) return;
  expectString(snapshot.path, `${path}.path`, errors);
  if (!SHA256_PATTERN.test(snapshot.sha256 ?? "")) {
    errors.push(`${path}.sha256 is invalid`);
  }
  if (LOCAL_PATH_PATTERN.test(snapshot.path ?? "")) {
    errors.push(`${path}.path must be repository-relative`);
  }
}

function validateLogicalRefShape(reference, path, rowKeyKeys, errors) {
  if (
    !expectExactKeys(
      reference,
      ["snapshot_path", "snapshot_sha256", "row_key"],
      path,
      errors
    )
  ) {
    return;
  }
  expectString(reference.snapshot_path, `${path}.snapshot_path`, errors);
  if (!SHA256_PATTERN.test(reference.snapshot_sha256 ?? "")) {
    errors.push(`${path}.snapshot_sha256 is invalid`);
  }
  if (
    expectExactKeys(reference.row_key, rowKeyKeys, `${path}.row_key`, errors)
  ) {
    for (const key of rowKeyKeys) {
      const value = reference.row_key[key];
      if (key === "agency_names") {
        if (
          !Array.isArray(value) ||
          value.length === 0 ||
          value.some((item) => typeof item !== "string" || !item)
        ) {
          errors.push(`${path}.row_key.${key} must be a non-empty string array`);
        }
      } else {
        expectString(value, `${path}.row_key.${key}`, errors);
      }
    }
  }
}

function validateConsolidationReportShape(report, path, errors) {
  if (
    !expectExactKeys(
      report,
      [
        "raw_scope_record_count",
        "canonical_agency_count",
        "resolved_alias_count",
        "manual_review_alias_count",
        "manual_review_groups",
        "rule_based_consolidations",
        "source_decision_counts",
        "selected_mandatory_mvp_count",
        "selected_ct_g_alias_group"
      ],
      path,
      errors
    )
  ) {
    return;
  }
  for (const key of [
    "raw_scope_record_count",
    "canonical_agency_count",
    "resolved_alias_count",
    "manual_review_alias_count",
    "selected_mandatory_mvp_count"
  ]) {
    expectNumber(report[key], `${path}.${key}`, errors, { integer: true });
  }
  if (typeof report.selected_ct_g_alias_group !== "boolean") {
    errors.push(`${path}.selected_ct_g_alias_group must be boolean`);
  }
  if (!Array.isArray(report.manual_review_groups)) {
    errors.push(`${path}.manual_review_groups must be an array`);
  } else {
    report.manual_review_groups.forEach((group, index) => {
      const groupPath = `${path}.manual_review_groups[${index}]`;
      if (
        expectExactKeys(group, ["domain", "source_names"], groupPath, errors)
      ) {
        expectString(group.domain, `${groupPath}.domain`, errors);
        if (
          !Array.isArray(group.source_names) ||
          group.source_names.length < 2 ||
          group.source_names.some((name) => typeof name !== "string" || !name)
        ) {
          errors.push(`${groupPath}.source_names must contain at least 2 names`);
        }
      }
    });
  }
  if (!Array.isArray(report.rule_based_consolidations)) {
    errors.push(`${path}.rule_based_consolidations must be an array`);
  } else {
    report.rule_based_consolidations.forEach((record, index) => {
      const recordPath = `${path}.rule_based_consolidations[${index}]`;
      if (
        expectExactKeys(
          record,
          ["agency_id", "source_names", "resolution"],
          recordPath,
          errors
        )
      ) {
        if (!AGENCY_ID_PATTERN.test(record.agency_id ?? "")) {
          errors.push(`${recordPath}.agency_id is invalid`);
        }
        if (
          !Array.isArray(record.source_names) ||
          record.source_names.length < 2
        ) {
          errors.push(`${recordPath}.source_names must contain at least 2 names`);
        }
        if (record.resolution !== "rule_based") {
          errors.push(`${recordPath}.resolution must be rule_based`);
        }
      }
    });
  }
  if (
    !report.source_decision_counts ||
    typeof report.source_decision_counts !== "object" ||
    Array.isArray(report.source_decision_counts)
  ) {
    errors.push(`${path}.source_decision_counts must be an object`);
  } else {
    for (const [decision, count] of Object.entries(
      report.source_decision_counts
    )) {
      expectString(decision, `${path}.source_decision_counts key`, errors);
      expectNumber(
        count,
        `${path}.source_decision_counts.${decision}`,
        errors,
        { integer: true }
      );
    }
  }
}

function validatePilotShape(agenciesFile, pilotSelectionFile, errors) {
  if (
    expectExactKeys(
      agenciesFile,
      [
        "version",
        "source_snapshots",
        "agencies",
        "agency_aliases",
        "consolidation_report"
      ],
      "$.agenciesFile",
      errors
    )
  ) {
    if (agenciesFile.version !== "demo-pilot-agencies-v1") {
      errors.push("$.agenciesFile.version is invalid");
    }
  }
  if (
    expectExactKeys(
      pilotSelectionFile,
      [
        "version",
        "selection_rule",
        "source_snapshots",
        "selected_agency_ids",
        "entries",
        "counts",
        "consolidation_report"
      ],
      "$.pilotSelectionFile",
      errors
    )
  ) {
    if (pilotSelectionFile.version !== "demo-pilot-selection-v1") {
      errors.push("$.pilotSelectionFile.version is invalid");
    }
  }

  for (const [fileName, snapshots] of [
    ["agenciesFile", agenciesFile?.source_snapshots],
    ["pilotSelectionFile", pilotSelectionFile?.source_snapshots]
  ]) {
    if (!Array.isArray(snapshots) || snapshots.length !== 5) {
      errors.push(`$.${fileName}.source_snapshots must contain exactly 5 records`);
      continue;
    }
    snapshots.forEach((snapshot, index) =>
      validateSnapshotShape(
        snapshot,
        `$.${fileName}.source_snapshots[${index}]`,
        errors
      )
    );
  }
  validateConsolidationReportShape(
    agenciesFile?.consolidation_report,
    "$.agenciesFile.consolidation_report",
    errors
  );
  validateConsolidationReportShape(
    pilotSelectionFile?.consolidation_report,
    "$.pilotSelectionFile.consolidation_report",
    errors
  );

  const agencies = agenciesFile?.agencies;
  if (!Array.isArray(agencies)) {
    errors.push("$.agenciesFile.agencies must be an array");
  } else {
    agencies.forEach((agency, index) => {
      const path = `$.agenciesFile.agencies[${index}]`;
      if (
        !expectExactKeys(
          agency,
          [
            "agency_id",
            "canonical_name",
            "normalized_name",
            "domain",
            "pilot_selected",
            "coverage_tier",
            "source_names",
            "selection_reason"
          ],
          path,
          errors
        )
      ) {
        return;
      }
      if (!AGENCY_ID_PATTERN.test(agency.agency_id ?? "")) {
        errors.push(`${path}.agency_id is invalid`);
      }
      expectString(agency.canonical_name, `${path}.canonical_name`, errors);
      if (!/^[a-z0-9]+(?: [a-z0-9]+)*$/.test(agency.normalized_name ?? "")) {
        errors.push(`${path}.normalized_name is invalid`);
      }
      if (agency.domain !== null) {
        expectString(agency.domain, `${path}.domain`, errors);
      }
      if (typeof agency.pilot_selected !== "boolean") {
        errors.push(`${path}.pilot_selected must be boolean`);
      }
      if (
        agency.coverage_tier !== null &&
        !["base", "enriched", "deep"].includes(agency.coverage_tier)
      ) {
        errors.push(`${path}.coverage_tier is invalid`);
      }
      if (
        !Array.isArray(agency.source_names) ||
        agency.source_names.length === 0 ||
        agency.source_names.some((name) => typeof name !== "string" || !name)
      ) {
        errors.push(`${path}.source_names is invalid`);
      }
      if (agency.selection_reason !== null) {
        expectString(
          agency.selection_reason,
          `${path}.selection_reason`,
          errors
        );
      }
    });
  }

  const aliases = agenciesFile?.agency_aliases;
  if (!Array.isArray(aliases)) {
    errors.push("$.agenciesFile.agency_aliases must be an array");
  } else {
    aliases.forEach((alias, index) => {
      const path = `$.agenciesFile.agency_aliases[${index}]`;
      if (
        !expectExactKeys(
          alias,
          [
            "alias_original",
            "alias_normalized",
            "agency_id",
            "resolution",
            "evidence_ids"
          ],
          path,
          errors
        )
      ) {
        return;
      }
      expectString(alias.alias_original, `${path}.alias_original`, errors);
      expectString(alias.alias_normalized, `${path}.alias_normalized`, errors);
      if (alias.agency_id !== null && !AGENCY_ID_PATTERN.test(alias.agency_id)) {
        errors.push(`${path}.agency_id is invalid`);
      }
      if (!["confirmed", "rule_based", "manual_review"].includes(alias.resolution)) {
        errors.push(`${path}.resolution is invalid`);
      }
      if (!Array.isArray(alias.evidence_ids)) {
        errors.push(`${path}.evidence_ids must be an array`);
      } else if (
        alias.evidence_ids.some(
          (evidenceId) =>
            typeof evidenceId !== "string" ||
            !/^[a-z][a-z0-9_-]*:[a-z0-9][a-z0-9._-]*$/.test(evidenceId)
        )
      ) {
        errors.push(`${path}.evidence_ids contains an invalid ID`);
      }
    });
  }

  if (
    expectExactKeys(
      pilotSelectionFile?.selection_rule,
      [
        "target_count",
        "mandatory_groups",
        "eligibility",
        "ordering",
        "tier_policy"
      ],
      "$.pilotSelectionFile.selection_rule",
      errors
    )
  ) {
    expectNumber(
      pilotSelectionFile.selection_rule.target_count,
      "$.pilotSelectionFile.selection_rule.target_count",
      errors,
      { integer: true }
    );
    if (
      !Array.isArray(pilotSelectionFile.selection_rule.mandatory_groups) ||
      !Array.isArray(pilotSelectionFile.selection_rule.ordering)
    ) {
      errors.push("$.pilotSelectionFile.selection_rule arrays are invalid");
    } else if (
      pilotSelectionFile.selection_rule.mandatory_groups.some(
        (value) => typeof value !== "string" || !value
      ) ||
      pilotSelectionFile.selection_rule.ordering.some(
        (value) => typeof value !== "string" || !value
      )
    ) {
      errors.push(
        "$.pilotSelectionFile.selection_rule arrays must contain strings"
      );
    }
    expectString(
      pilotSelectionFile.selection_rule.eligibility,
      "$.pilotSelectionFile.selection_rule.eligibility",
      errors
    );
    if (
      expectExactKeys(
        pilotSelectionFile.selection_rule.tier_policy,
        ["base", "enriched", "deep"],
        "$.pilotSelectionFile.selection_rule.tier_policy",
        errors
      )
    ) {
      for (const tier of ["base", "enriched", "deep"]) {
        expectString(
          pilotSelectionFile.selection_rule.tier_policy[tier],
          `$.pilotSelectionFile.selection_rule.tier_policy.${tier}`,
          errors
        );
      }
    }
  }

  const counts = pilotSelectionFile?.counts;
  if (
    expectExactKeys(
      counts,
      [
        "market_raw_count",
        "canonical_registry_count",
        "base_count",
        "enriched_count",
        "deep_count",
        "exclusive_tier_counts"
      ],
      "$.pilotSelectionFile.counts",
      errors
    )
  ) {
    for (const key of [
      "market_raw_count",
      "canonical_registry_count",
      "base_count",
      "enriched_count",
      "deep_count"
    ]) {
      expectNumber(counts[key], `$.pilotSelectionFile.counts.${key}`, errors, {
        integer: true
      });
    }
    if (
      expectExactKeys(
        counts.exclusive_tier_counts,
        ["base", "enriched", "deep"],
        "$.pilotSelectionFile.counts.exclusive_tier_counts",
        errors
      )
    ) {
      for (const tier of ["base", "enriched", "deep"]) {
        expectNumber(
          counts.exclusive_tier_counts[tier],
          `$.pilotSelectionFile.counts.exclusive_tier_counts.${tier}`,
          errors,
          { integer: true }
        );
      }
    }
  }

  const entries = pilotSelectionFile?.entries;
  if (
    !Array.isArray(pilotSelectionFile?.selected_agency_ids) ||
    pilotSelectionFile.selected_agency_ids.some(
      (agencyId) => !AGENCY_ID_PATTERN.test(agencyId)
    )
  ) {
    errors.push(
      "$.pilotSelectionFile.selected_agency_ids must be an agency ID array"
    );
  }
  if (!Array.isArray(entries)) {
    errors.push("$.pilotSelectionFile.entries must be an array");
    return;
  }
  entries.forEach((entry, index) => {
    const path = `$.pilotSelectionFile.entries[${index}]`;
    if (
      !expectExactKeys(
        entry,
        [
          "rank",
          "agency_id",
          "coverage_tier",
          "selection_reason",
          "metrics",
          "evidence"
        ],
        path,
        errors
      )
    ) {
      return;
    }
    expectNumber(entry.rank, `${path}.rank`, errors, { integer: true });
    if (!AGENCY_ID_PATTERN.test(entry.agency_id ?? "")) {
      errors.push(`${path}.agency_id is invalid`);
    }
    if (!["base", "enriched", "deep"].includes(entry.coverage_tier)) {
      errors.push(`${path}.coverage_tier is invalid`);
    }
    expectString(entry.selection_reason, `${path}.selection_reason`, errors);
    if (
      expectExactKeys(
        entry.metrics,
        [
          "high_exact_match_count",
          "medium_exact_match_count",
          "critical_coverage_pct",
          "viability_score",
          "mandatory_mvp",
          "final_decisions",
          "discovery_flags"
        ],
        `${path}.metrics`,
        errors
      )
    ) {
      for (const key of [
        "high_exact_match_count",
        "medium_exact_match_count",
        "critical_coverage_pct",
        "viability_score"
      ]) {
        expectNumber(entry.metrics[key], `${path}.metrics.${key}`, errors);
      }
      if (typeof entry.metrics.mandatory_mvp !== "boolean") {
        errors.push(`${path}.metrics.mandatory_mvp must be boolean`);
      }
      if (
        !Array.isArray(entry.metrics.final_decisions) ||
        !Array.isArray(entry.metrics.discovery_flags)
      ) {
        errors.push(`${path}.metrics decision arrays are invalid`);
      } else if (
        [...entry.metrics.final_decisions, ...entry.metrics.discovery_flags].some(
          (value) => typeof value !== "string" || !value
        )
      ) {
        errors.push(`${path}.metrics decision arrays must contain strings`);
      }
    }
    if (
      !expectExactKeys(
        entry.evidence,
        ["scope", "discovery", "tier"],
        `${path}.evidence`,
        errors
      )
    ) {
      return;
    }
    validateLogicalRefShape(
      entry.evidence.scope,
      `${path}.evidence.scope`,
      ["agency_names"],
      errors
    );
    validateLogicalRefShape(
      entry.evidence.discovery,
      `${path}.evidence.discovery`,
      ["agency_names"],
      errors
    );
    if (entry.coverage_tier === "base") {
      if (entry.evidence.tier !== null) {
        errors.push(`${path}.evidence.tier must be null for base`);
      }
      return;
    }
    const tier = entry.evidence.tier;
    if (
      !expectExactKeys(
        tier,
        ["linked_source_count", "matching", "web", "nexo"],
        `${path}.evidence.tier`,
        errors
      )
    ) {
      return;
    }
    if (tier.linked_source_count !== 2) {
      errors.push(`${path}.evidence.tier.linked_source_count must equal 2`);
    }
    const matchingPath = `${path}.evidence.tier.matching`;
    if (
      expectExactKeys(
        tier.matching,
        [
          "snapshot_path",
          "snapshot_sha256",
          "row_key",
          "match_class",
          "match_score",
          "requires_human_review",
          "exact_join"
        ],
        matchingPath,
        errors
      )
    ) {
      validateLogicalRefShape(
        {
          snapshot_path: tier.matching.snapshot_path,
          snapshot_sha256: tier.matching.snapshot_sha256,
          row_key: tier.matching.row_key
        },
        matchingPath,
        ["agency_name", "web_project_url", "nexo_project_id"],
        errors
      );
      if (tier.matching.match_class !== "match_high") {
        errors.push(`${matchingPath}.match_class must be match_high`);
      }
      if (tier.matching.requires_human_review !== false) {
        errors.push(`${matchingPath}.requires_human_review must be false`);
      }
      if (tier.matching.exact_join !== true) {
        errors.push(`${matchingPath}.exact_join must be true`);
      }
      expectNumber(tier.matching.match_score, `${matchingPath}.match_score`, errors);
    }
    const webPath = `${path}.evidence.tier.web`;
    if (
      expectExactKeys(
        tier.web,
        [
          "snapshot_path",
          "snapshot_sha256",
          "row_key",
          "source_type",
          "external_evidence_status",
          "external_evidence_absence_reason"
        ],
        webPath,
        errors
      )
    ) {
      validateLogicalRefShape(
        {
          snapshot_path: tier.web.snapshot_path,
          snapshot_sha256: tier.web.snapshot_sha256,
          row_key: tier.web.row_key
        },
        webPath,
        ["source_url"],
        errors
      );
      if (tier.web.external_evidence_status !== "unavailable") {
        errors.push(`${webPath}.external_evidence_status must be unavailable`);
      }
      expectString(tier.web.source_type, `${webPath}.source_type`, errors);
      expectString(
        tier.web.external_evidence_absence_reason,
        `${webPath}.external_evidence_absence_reason`,
        errors
      );
    }
    const nexoPath = `${path}.evidence.tier.nexo`;
    const nexoKeys =
      entry.coverage_tier === "deep"
        ? [
            "snapshot_path",
            "snapshot_sha256",
            "row_key",
            "source",
            "captured_at",
            "evidence_kind",
            "inspectable_typology",
            "backed_fact_fields",
            "sanitized_fragment",
            "sanitized_fragment_sha256"
          ]
        : [
            "snapshot_path",
            "snapshot_sha256",
            "row_key",
            "source",
            "captured_at"
          ];
    if (expectExactKeys(tier.nexo, nexoKeys, nexoPath, errors)) {
      validateLogicalRefShape(
        {
          snapshot_path: tier.nexo.snapshot_path,
          snapshot_sha256: tier.nexo.snapshot_sha256,
          row_key: tier.nexo.row_key
        },
        nexoPath,
        ["project_id"],
        errors
      );
      expectString(tier.nexo.source, `${nexoPath}.source`, errors);
      expectString(tier.nexo.captured_at, `${nexoPath}.captured_at`, errors);
      if (entry.coverage_tier === "deep") {
        if (tier.nexo.evidence_kind !== "structured_value") {
          errors.push(`${nexoPath}.evidence_kind must be structured_value`);
        }
        expectString(
          tier.nexo.inspectable_typology,
          `${nexoPath}.inspectable_typology`,
          errors
        );
        if (
          !Array.isArray(tier.nexo.backed_fact_fields) ||
          tier.nexo.backed_fact_fields.length < 3
        ) {
          errors.push(`${nexoPath}.backed_fact_fields must contain at least 3`);
        }
        if (
          !tier.nexo.sanitized_fragment ||
          typeof tier.nexo.sanitized_fragment !== "object" ||
          Array.isArray(tier.nexo.sanitized_fragment)
        ) {
          errors.push(`${nexoPath}.sanitized_fragment must be an object`);
        }
        if (!SHA256_PATTERN.test(tier.nexo.sanitized_fragment_sha256 ?? "")) {
          errors.push(`${nexoPath}.sanitized_fragment_sha256 is invalid`);
        }
      }
    }
  });
}

export function findAgencyPrivacyViolations(value) {
  const violations = [];
  function visit(current, path) {
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (current && typeof current === "object") {
      for (const [key, nested] of Object.entries(current)) {
        if (FORBIDDEN_PUBLIC_KEY.test(key)) {
          violations.push(`${path}.${key}: forbidden key`);
        }
        visit(nested, `${path}.${key}`);
      }
      return;
    }
    if (typeof current !== "string") return;
    if (EMAIL_PATTERN.test(current)) violations.push(`${path}: email-like value`);
    if (
      PHONE_PATTERN.test(current) &&
      !current.startsWith("http") &&
      !SHA256_PATTERN.test(current)
    ) {
      violations.push(`${path}: phone-like value`);
    }
    if (LOCAL_PATH_PATTERN.test(current)) {
      violations.push(`${path}: local or raw-output path`);
    }
  }
  visit(value, "$");
  return violations;
}

function validateContextualEvidence(
  agenciesFile,
  pilotSelectionFile,
  inputTexts,
  errors
) {
  let parsed;
  try {
    parsed = parseAgencyInputs(inputTexts);
  } catch (error) {
    errors.push(`snapshot context is invalid: ${error.message}`);
    return;
  }
  const expectedSnapshots = Object.values(parsed.snapshots).sort((left, right) =>
    compareStrings(left.path, right.path)
  );
  if (!valuesEqual(agenciesFile?.source_snapshots, expectedSnapshots)) {
    errors.push("agenciesFile source hashes do not match supplied snapshot bytes");
  }
  if (!valuesEqual(pilotSelectionFile?.source_snapshots, expectedSnapshots)) {
    errors.push(
      "pilotSelectionFile source hashes do not match supplied snapshot bytes"
    );
  }

  const registry = buildRegistrySkeleton(parsed.rows.scope);
  const matchingRows = parsed.rows.matching;
  const webByUrl = indexRows(parsed.rows.web, (row) =>
    normalizeUrl(row.source_url)
  );
  const nexoById = indexRows(parsed.rows.nexo, (row) => row.project_id);
  const contextualAgencies = Array.isArray(agenciesFile?.agencies)
    ? agenciesFile.agencies
    : [];
  const contextualEntries = Array.isArray(pilotSelectionFile?.entries)
    ? pilotSelectionFile.entries
    : [];
  const agencyById = new Map(
    contextualAgencies.map((agency) => [agency.agency_id, agency])
  );

  for (const entry of contextualEntries) {
    const agency = agencyById.get(entry.agency_id);
    const sourceNames = agency?.source_names ?? [];
    for (const [kind, rows] of [
      ["scope", parsed.rows.scope],
      ["discovery", parsed.rows.discovery]
    ]) {
      const reference = entry.evidence?.[kind];
      if (!valuesEqual(reference?.row_key?.agency_names, sourceNames)) {
        errors.push(`${entry.agency_id} ${kind} row key does not match aliases`);
      }
      if (
        reference?.snapshot_sha256 !== parsed.snapshots[kind].sha256 ||
        reference?.snapshot_path !== parsed.snapshots[kind].path
      ) {
        errors.push(`${entry.agency_id} ${kind} snapshot reference is invalid`);
      }
      for (const sourceName of sourceNames) {
        if (
          rows.filter((row) => row.agency_name === sourceName).length !== 1
        ) {
          errors.push(
            `${entry.agency_id} ${kind} row key does not resolve exactly once`
          );
        }
      }
    }
    if (!["enriched", "deep"].includes(entry.coverage_tier)) continue;
    const tier = entry.evidence?.tier;
    const rowKey = tier?.matching?.row_key ?? {};
    const exactMatchingRows = matchingRows.filter(
      (row) =>
        row.agency_name === rowKey.agency_name &&
        row.web_project_url === rowKey.web_project_url &&
        row.nexo_project_id === rowKey.nexo_project_id
    );
    if (exactMatchingRows.length !== 1) {
      errors.push(`${entry.agency_id} matching row key must resolve exactly once`);
      continue;
    }
    const matching = exactMatchingRows[0];
    const webRows = webByUrl.get(normalizeUrl(rowKey.web_project_url)) ?? [];
    const nexoRows = nexoById.get(rowKey.nexo_project_id) ?? [];
    if (webRows.length !== 1 || nexoRows.length !== 1) {
      errors.push(`${entry.agency_id} tier joins are not one-to-one`);
      continue;
    }
    const matchingAgencyId = registry.sourceNameToAgencyId.get(
      matching.agency_name
    );
    const webAgencyId = registry.sourceNameToAgencyId.get(webRows[0].agency_name);
    const nexoAgencyId = registry.sourceNameToAgencyId.get(
      nexoRows[0].agency_name
    );
    if (
      matchingAgencyId !== entry.agency_id ||
      webAgencyId !== entry.agency_id ||
      nexoAgencyId !== entry.agency_id
    ) {
      errors.push(`${entry.agency_id} tier join agency is inconsistent`);
    }
    if (
      matching.match_class !== "match_high" ||
      matching.requires_human_review !== "false" ||
      matching.matched_on_agency !== "true"
    ) {
      errors.push(`${entry.agency_id} tier evidence is not high-only/no-review`);
    }
    if (
      tier.matching?.snapshot_sha256 !== parsed.snapshots.matching.sha256 ||
      tier.web?.snapshot_sha256 !== parsed.snapshots.web.sha256 ||
      tier.nexo?.snapshot_sha256 !== parsed.snapshots.nexo.sha256
    ) {
      errors.push(`${entry.agency_id} tier snapshot hash is stale`);
    }
    if (
      tier.web?.external_evidence_status !== "unavailable" ||
      !isPresent(tier.web?.external_evidence_absence_reason)
    ) {
      errors.push(`${entry.agency_id} external evidence must remain unavailable`);
    }
    if (entry.coverage_tier === "deep") {
      const nexo = nexoRows[0];
      const facts = tier.nexo?.backed_fact_fields ?? [];
      if (
        !isPresent(nexo.typology) ||
        tier.nexo?.inspectable_typology !== nexo.typology ||
        facts.length < 3 ||
        facts.some(
          (field) => !DEEP_FACT_FIELDS.includes(field) || !isPresent(nexo[field])
        )
      ) {
        errors.push(`${entry.agency_id} deep evidence predicate is not met`);
      }
      const expectedFragment = sanitizedFragment(nexo);
      if (
        !valuesEqual(tier.nexo?.sanitized_fragment, expectedFragment) ||
        tier.nexo?.sanitized_fragment_sha256 !==
          sha256(JSON.stringify(expectedFragment))
      ) {
        errors.push(`${entry.agency_id} deep fragment is not reproducible`);
      }
    }
  }

  try {
    const expected = buildAgencyArtifacts(inputTexts);
    if (!valuesEqual(agenciesFile, expected.agenciesFile)) {
      errors.push("agenciesFile is not the deterministic snapshot derivation");
    }
    if (!valuesEqual(pilotSelectionFile, expected.pilotSelectionFile)) {
      errors.push(
        "pilotSelectionFile is not the deterministic snapshot derivation"
      );
    }
  } catch (error) {
    errors.push(`snapshot derivation failed: ${error.message}`);
  }
}

export function validateAgencyArtifacts({
  agenciesFile,
  pilotSelectionFile,
  inputTexts,
  snapshotTexts,
  context
}) {
  const errors = [];
  validatePilotShape(agenciesFile, pilotSelectionFile, errors);
  const agencies = Array.isArray(agenciesFile?.agencies)
    ? agenciesFile.agencies
    : [];
  const aliases = Array.isArray(agenciesFile?.agency_aliases)
    ? agenciesFile.agency_aliases
    : [];
  const entries = Array.isArray(pilotSelectionFile?.entries)
    ? pilotSelectionFile.entries
    : [];
  const agencyIds = new Set();

  for (const agency of agencies) {
    if (!agency || typeof agency !== "object" || Array.isArray(agency)) {
      errors.push("agency record must be an object");
      continue;
    }
    if (agencyIds.has(agency.agency_id)) {
      errors.push(`duplicate agency ID: ${agency.agency_id}`);
    }
    agencyIds.add(agency.agency_id);
    if (!AGENCY_ID_PATTERN.test(agency.agency_id)) {
      errors.push(`invalid agency ID: ${agency.agency_id}`);
    }
    if (
      agency.pilot_selected !== (agency.coverage_tier !== null) ||
      agency.pilot_selected !== (agency.selection_reason !== null)
    ) {
      errors.push(`selection fields are inconsistent for ${agency.agency_id}`);
    }
  }

  const aliasNames = new Set();
  for (const alias of aliases) {
    if (!alias || typeof alias !== "object" || Array.isArray(alias)) {
      errors.push("alias record must be an object");
      continue;
    }
    if (aliasNames.has(alias.alias_original)) {
      errors.push(`duplicate alias: ${alias.alias_original}`);
    }
    aliasNames.add(alias.alias_original);
    if (alias.agency_id !== null && !agencyIds.has(alias.agency_id)) {
      errors.push(
        `${alias.alias_original} references missing ${alias.agency_id}`
      );
    }
    if (alias.resolution === "manual_review" && alias.agency_id !== null) {
      errors.push(`${alias.alias_original} manual review must remain unresolved`);
    }
  }

  const selectedIds = entries
    .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
    .map((entry) => entry.agency_id);
  if (new Set(selectedIds).size !== selectedIds.length) {
    errors.push("pilot entries contain duplicate agency IDs");
  }
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push("pilot entry must be an object");
      continue;
    }
    if (!agencyIds.has(entry.agency_id)) {
      errors.push(`pilot entry references missing ${entry.agency_id}`);
    }
  }
  if (!valuesEqual(selectedIds, pilotSelectionFile?.selected_agency_ids)) {
    errors.push("selected_agency_ids must exactly match ranked entries");
  }
  const selectedAgencyIds = agencies
    .filter((agency) => agency?.pilot_selected)
    .map((agency) => agency.agency_id);
  if (
    selectedAgencyIds.length !== selectedIds.length ||
    selectedIds.some((agencyId) => !selectedAgencyIds.includes(agencyId))
  ) {
    errors.push("selected agency flags must exactly match pilot entries");
  }
  if (!selectedIds.includes(TYC_AGENCY_ID)) {
    errors.push("GRUPO T&C alias group is not selected");
  }

  const actualCounts = {
    base_count: entries.length,
    enriched_count: entries.filter((entry) =>
      ["enriched", "deep"].includes(entry?.coverage_tier)
    ).length,
    deep_count: entries.filter((entry) => entry?.coverage_tier === "deep").length
  };
  for (const [name, actual] of Object.entries(actualCounts)) {
    if (pilotSelectionFile?.counts?.[name] !== actual) {
      errors.push(`${name} does not equal actual entries`);
    }
    if (actual < PILOT_MINIMUMS[name]) {
      errors.push(`${name}=${actual} is below ${PILOT_MINIMUMS[name]}`);
    }
  }
  const exclusiveCounts = {
    base: entries.filter((entry) => entry?.coverage_tier === "base").length,
    enriched: entries.filter((entry) => entry?.coverage_tier === "enriched")
      .length,
    deep: entries.filter((entry) => entry?.coverage_tier === "deep").length
  };
  if (
    !valuesEqual(
      pilotSelectionFile?.counts?.exclusive_tier_counts,
      exclusiveCounts
    )
  ) {
    errors.push("exclusive tier counts do not equal actual entries");
  }
  if (
    exclusiveCounts.base + exclusiveCounts.enriched + exclusiveCounts.deep !==
    actualCounts.base_count
  ) {
    errors.push("exclusive tier counts do not partition the pilot");
  }

  const privacyViolations = findAgencyPrivacyViolations({
    agenciesFile,
    pilotSelectionFile
  });
  errors.push(...privacyViolations.map((violation) => `privacy: ${violation}`));
  const sourceTexts =
    inputTexts ??
    snapshotTexts ??
    context?.inputTexts ??
    context?.snapshotTexts ??
    null;
  if (!sourceTexts) {
    errors.push("snapshot context is required");
  } else {
    validateContextualEvidence(
      agenciesFile,
      pilotSelectionFile,
      sourceTexts,
      errors
    );
  }
  return errors;
}
