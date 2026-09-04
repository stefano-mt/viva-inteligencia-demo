import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as agencyModule from "../scripts/data/agencies.js";
import {
  DEEP_PROJECT_BY_AGENCY,
  PILOT_MINIMUMS,
  SNAPSHOT_PATHS,
  buildAgencyArtifacts,
  buildCanonicalRegistry,
  findAgencyPrivacyViolations,
  normalizeAgencyName,
  parseAgencyInputs,
  sha256,
  stableAgencyId,
  validateAgencyArtifacts
} from "../scripts/data/agencies.js";

const TEST_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROTOTYPE_ROOT = resolve(TEST_DIRECTORY, "..");
const REPOSITORY_ROOT = resolve(PROTOTYPE_ROOT, "..", "..");
const PILOT_DIRECTORY = join(
  REPOSITORY_ROOT,
  "data/source",
  "demo-pilot"
);

function readRepositoryText(relativePath) {
  return readFileSync(
    join(REPOSITORY_ROOT, ...relativePath.split("/")),
    "utf8"
  );
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function clone(value) {
  return structuredClone(value);
}

function indexBy(records, field) {
  return new Map(records.map((record) => [record[field], record]));
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function serializeCsv(rows, headers) {
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
  ].join("\n") + "\n";
}

function mutateInput(baseTexts, collectionName, mutate) {
  const parsed = parseAgencyInputs(baseTexts);
  const rows = clone(parsed.rows[collectionName]);
  mutate(rows);
  const headers = Object.keys(parsed.rows[collectionName][0]);
  return {
    ...baseTexts,
    [collectionName]: serializeCsv(rows, headers)
  };
}

function reverseInput(baseTexts, collectionName) {
  return mutateInput(baseTexts, collectionName, (rows) => rows.reverse());
}

function buildError(inputTexts) {
  try {
    buildAgencyArtifacts(inputTexts);
  } catch (error) {
    return error;
  }
  assert.fail("expected builder to fail");
}

function expectBuildError(inputTexts, pattern, message) {
  const error = buildError(inputTexts);
  assert.match(error.message, pattern, message);
  return error;
}

function expectValidationError(
  agenciesFile,
  pilotSelectionFile,
  inputTexts,
  pattern,
  message
) {
  const errors = validateAgencyArtifacts({
    agenciesFile,
    pilotSelectionFile,
    inputTexts
  });
  assert.ok(
    errors.some((error) => pattern.test(error)),
    `${message}\n${errors.join("\n")}`
  );
}

function actualTierCounts(entries) {
  return {
    base_count: entries.length,
    enriched_count: entries.filter((entry) =>
      ["enriched", "deep"].includes(entry.coverage_tier)
    ).length,
    deep_count: entries.filter((entry) => entry.coverage_tier === "deep").length
  };
}

const inputTexts = Object.fromEntries(
  Object.entries(SNAPSHOT_PATHS).map(([name, path]) => [
    name,
    readRepositoryText(path)
  ])
);
const parsedInputs = parseAgencyInputs(inputTexts);
const built = buildAgencyArtifacts(inputTexts);
const agenciesFile = readJson(join(PILOT_DIRECTORY, "agencies.json"));
const pilotSelectionFile = readJson(
  join(PILOT_DIRECTORY, "pilot-selection.json")
);

assert.deepEqual(
  agenciesFile,
  built.agenciesFile,
  "agencies.json must be derived from the current snapshot bytes"
);
assert.deepEqual(
  pilotSelectionFile,
  built.pilotSelectionFile,
  "pilot-selection.json must be derived from the current snapshot bytes"
);
assert.deepEqual(
  validateAgencyArtifacts({
    agenciesFile,
    pilotSelectionFile,
    inputTexts
  }),
  [],
  "agency artifacts must pass exhaustive contextual validation"
);
assert.deepEqual(
  findAgencyPrivacyViolations({ agenciesFile, pilotSelectionFile }),
  [],
  "published agency artifacts must exclude PII, raw payloads and local paths"
);
assert.equal(
  "buildAgencyArtifactsFromRows" in agencyModule,
  false,
  "rows plus detached hashes must not be a public artifact-emission API"
);
assert.equal(
  "reversedAgencyInputRows" in agencyModule,
  false,
  "detached row/snapshot helpers must not be public"
);

assert.deepEqual(
  buildAgencyArtifacts(inputTexts),
  buildAgencyArtifacts(inputTexts),
  "two builds from identical bytes must be deterministic"
);
for (const collectionName of Object.keys(SNAPSHOT_PATHS)) {
  const reversed = buildAgencyArtifacts(reverseInput(inputTexts, collectionName));
  assert.deepEqual(
    reversed.agenciesFile.agencies,
    built.agenciesFile.agencies,
    `${collectionName} row order must not change canonical agencies or tiers`
  );
  assert.deepEqual(
    reversed.pilotSelectionFile.selected_agency_ids,
    built.pilotSelectionFile.selected_agency_ids,
    `${collectionName} row order must not change ranking`
  );
}

assert.equal(normalizeAgencyName("NEXO INGENIERÍA"), "nexo ingenieria");
assert.equal(
  stableAgencyId("V&V GRUPO INMOBILIARIO"),
  "agency:v-v-grupo-inmobiliario"
);
assert.equal(stableAgencyId("GRUPO TyC"), "agency:grupo-tyc");

const agencyById = indexBy(agenciesFile.agencies, "agency_id");
const aliasByName = indexBy(agenciesFile.agency_aliases, "alias_original");
const selectedEntries = pilotSelectionFile.entries;
const selectedIds = new Set(pilotSelectionFile.selected_agency_ids);

assert.equal(agenciesFile.agencies.length, 180);
assert.equal(agenciesFile.agency_aliases.length, 192);
assert.equal(
  agenciesFile.agencies.length,
  new Set(agenciesFile.agencies.map((agency) => agency.agency_id)).size
);
assert.equal(
  agenciesFile.agency_aliases.length,
  new Set(
    agenciesFile.agency_aliases.map((alias) => alias.alias_original)
  ).size
);
assert.deepEqual(
  selectedEntries.map((entry) => entry.rank),
  Array.from({ length: selectedEntries.length }, (_, index) => index + 1)
);
assert.deepEqual(
  selectedEntries.map((entry) => entry.agency_id),
  pilotSelectionFile.selected_agency_ids
);

for (const name of ["GRUPO T&C", "GRUPO TyC"]) {
  assert.equal(aliasByName.get(name).agency_id, "agency:grupo-tyc");
  assert.equal(aliasByName.get(name).resolution, "rule_based");
}
assert.deepEqual(agencyById.get("agency:grupo-tyc").source_names, [
  "GRUPO T&C",
  "GRUPO TyC"
]);
assert.ok(selectedIds.has("agency:grupo-tyc"));

const expectedManualReviewNames = [
  "AKAMAI",
  "INMOBILIARIA HUANWIL",
  "ALBAMAR GRUPO INMOBILIARIO",
  "VIBRANT",
  "ALERCES INMOBILIARIA",
  "FUNDAMENTA",
  "ZAFIRA INMOBILIARIA",
  "LOS PORTALES",
  "LOS PORTALES DEPARTAMENTOS",
  "Cresiente",
  "ESPARQ EOM"
];
for (const name of expectedManualReviewNames) {
  assert.equal(aliasByName.get(name).resolution, "manual_review");
  assert.equal(aliasByName.get(name).agency_id, null);
}
const domainCollisionFixture = buildCanonicalRegistry([
  { agency_name: "MARCA UNO", domain: "shared.example" },
  { agency_name: "MARCA DOS", domain: "shared.example" }
]);
assert.deepEqual(domainCollisionFixture.agencies, []);
assert.ok(
  domainCollisionFixture.agency_aliases.every(
    (alias) =>
      alias.resolution === "manual_review" && alias.agency_id === null
  )
);

const actualCounts = actualTierCounts(selectedEntries);
assert.deepEqual(
  {
    base_count: pilotSelectionFile.counts.base_count,
    enriched_count: pilotSelectionFile.counts.enriched_count,
    deep_count: pilotSelectionFile.counts.deep_count
  },
  actualCounts
);
for (const [name, minimum] of Object.entries(PILOT_MINIMUMS)) {
  assert.ok(actualCounts[name] >= minimum, `${name} must demonstrate ${minimum}`);
}
assert.deepEqual(pilotSelectionFile.counts.exclusive_tier_counts, {
  base: selectedEntries.filter((entry) => entry.coverage_tier === "base").length,
  enriched: selectedEntries.filter(
    (entry) => entry.coverage_tier === "enriched"
  ).length,
  deep: selectedEntries.filter((entry) => entry.coverage_tier === "deep").length
});

const mandatoryMvpNames = parsedInputs.rows.scope
  .filter((row) => row.included_in_mvp === "true")
  .map((row) => row.agency_name);
assert.equal(mandatoryMvpNames.length, 10);
for (const name of mandatoryMvpNames) {
  assert.ok(
    [...selectedIds].some((agencyId) =>
      agencyById.get(agencyId).source_names.includes(name)
    ),
    `${name} mandatory MVP must be selected`
  );
}
assert.equal(
  agenciesFile.consolidation_report.selected_mandatory_mvp_count,
  10
);
for (const row of parsedInputs.rows.scope.filter(
  (record) => record.final_decision === "No-go legal/operativo"
)) {
  assert.ok(
    ![...selectedIds].some((agencyId) =>
      agencyById.get(agencyId).source_names.includes(row.agency_name)
    )
  );
}

const snapshotHashes = Object.fromEntries(
  Object.entries(SNAPSHOT_PATHS).map(([name, path]) => [
    path,
    sha256(inputTexts[name])
  ])
);
for (const artifact of [agenciesFile, pilotSelectionFile]) {
  assert.equal(artifact.source_snapshots.length, 5);
  for (const snapshot of artifact.source_snapshots) {
    assert.equal(snapshot.sha256, snapshotHashes[snapshot.path]);
    assert.doesNotMatch(snapshot.path, /^[A-Za-z]:[\\/]|^\/Users\//);
  }
}

for (const entry of selectedEntries) {
  assert.equal(agencyById.get(entry.agency_id).coverage_tier, entry.coverage_tier);
  if (!["enriched", "deep"].includes(entry.coverage_tier)) {
    assert.equal(entry.evidence.tier, null);
    continue;
  }
  const tier = entry.evidence.tier;
  assert.equal(tier.linked_source_count, 2);
  assert.equal(tier.matching.match_class, "match_high");
  assert.equal(tier.matching.requires_human_review, false);
  assert.equal(tier.matching.exact_join, true);
  assert.equal(tier.web.external_evidence_status, "unavailable");
  assert.ok(tier.web.external_evidence_absence_reason);
}

const deepEntries = selectedEntries.filter(
  (entry) => entry.coverage_tier === "deep"
);
assert.deepEqual(
  deepEntries.map((entry) => entry.agency_id).sort(),
  Object.keys(DEEP_PROJECT_BY_AGENCY).sort()
);
for (const entry of deepEntries) {
  const nexo = entry.evidence.tier.nexo;
  assert.equal(
    nexo.row_key.project_id,
    DEEP_PROJECT_BY_AGENCY[entry.agency_id]
  );
  assert.equal(nexo.evidence_kind, "structured_value");
  assert.ok(nexo.inspectable_typology);
  assert.ok(nexo.backed_fact_fields.length >= 3);
  assert.equal(
    nexo.sanitized_fragment_sha256,
    sha256(JSON.stringify(nexo.sanitized_fragment))
  );
}

const duplicateHighWeb = mutateInput(inputTexts, "web", (rows) => {
  const target = rows.find(
    (row) =>
      row.source_url.toLowerCase().replace(/\/+$/, "") ===
      "https://actual.pe/proyecto/edificio-salaverry-1"
  );
  rows.push(clone(target));
});
expectBuildError(
  duplicateHighWeb,
  /contradictory high matches:[\s\S]*WEB_JOIN_COUNT_2/,
  "high match must require exactly one web row"
);

const mismatchedWebAgency = mutateInput(inputTexts, "web", (rows) => {
  rows.find(
    (row) =>
      row.source_url.toLowerCase().replace(/\/+$/, "") ===
      "https://actual.pe/proyecto/edificio-salaverry-1"
  ).agency_name = "CANTABRIA";
});
expectBuildError(
  mismatchedWebAgency,
  /WEB_AGENCY_MISMATCH/,
  "high match web agency must resolve to the same canonical agency"
);

const mismatchedNexoAgency = mutateInput(inputTexts, "nexo", (rows) => {
  rows.find((row) => row.project_id === "4007").agency_name = "CANTABRIA";
});
expectBuildError(
  mismatchedNexoAgency,
  /NEXO_AGENCY_MISMATCH/,
  "high match Nexo agency must resolve to the same canonical agency"
);

const agencyFlagFalse = mutateInput(inputTexts, "matching", (rows) => {
  rows.find((row) => row.nexo_project_id === "4007").matched_on_agency = "false";
});
const flagError = expectBuildError(
  agencyFlagFalse,
  /MATCHED_ON_AGENCY_NOT_TRUE/,
  "high match must explicitly match on agency"
);
const reversedAgencyFlagFalse = reverseInput(agencyFlagFalse, "matching");
assert.equal(
  buildError(reversedAgencyFlagFalse).message,
  flagError.message,
  "contradictory high errors must be invariant to row order"
);

const highReview = mutateInput(inputTexts, "matching", (rows) => {
  rows.find((row) => row.nexo_project_id === "4007").requires_human_review =
    "true";
});
expectBuildError(
  highReview,
  /HIGH_REQUIRES_HUMAN_REVIEW/,
  "high matches requiring review must fail closed"
);

const downgradedDeep = mutateInput(inputTexts, "matching", (rows) => {
  const row = rows.find((record) => record.nexo_project_id === "4007");
  row.match_class = "match_medium";
  row.requires_human_review = "true";
});
expectBuildError(
  downgradedDeep,
  /deep tier has 4 demonstrated agencies/,
  "medium/reviewable matching must not satisfy deep"
);

const withoutMediumMatches = mutateInput(inputTexts, "matching", (rows) => {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (rows[index].match_class === "match_medium") rows.splice(index, 1);
  }
});
assert.deepEqual(
  buildAgencyArtifacts(withoutMediumMatches).pilotSelectionFile
    .selected_agency_ids,
  pilotSelectionFile.selected_agency_ids,
  "medium matching must not influence ranking"
);

const nineAutomatable = mutateInput(inputTexts, "scope", (rows) => {
  rows.find((row) => row.included_in_mvp === "true").included_in_mvp = "false";
});
expectBuildError(
  nineAutomatable,
  /exactly 10 records; found 9/,
  "the ten automatable agencies must be demonstrated"
);

const elevenAutomatable = mutateInput(inputTexts, "scope", (rows) => {
  rows.find(
    (row) =>
      row.included_in_mvp === "false" && row.final_decision === "Go condicionado"
  ).included_in_mvp = "true";
});
expectBuildError(
  elevenAutomatable,
  /exactly 10 records; found 11/,
  "the builder must also reject an invented eleventh automatable agency"
);

const mandatoryNoGo = mutateInput(inputTexts, "scope", (rows) => {
  rows.find((row) => row.included_in_mvp === "true").final_decision =
    "No-go técnico";
});
expectBuildError(
  mandatoryNoGo,
  /mandatory MVP agency is not selectable/,
  "every mandatory MVP agency must remain selectable"
);

const contradictoryAliasGroup = mutateInput(inputTexts, "scope", (rows) => {
  rows.find((row) => row.agency_name === "GRUPO TyC").final_decision =
    "No-go técnico";
});
expectBuildError(
  contradictoryAliasGroup,
  /alias group has contradictory Go\/no-go decisions/,
  "a consolidated alias group cannot mix Go and no-go"
);

const missingTycAlias = mutateInput(inputTexts, "scope", (rows) => {
  rows.splice(
    rows.findIndex((row) => row.agency_name === "GRUPO TyC"),
    1
  );
});
expectBuildError(
  missingTycAlias,
  /alias group is incomplete/,
  "both T&C original aliases must be demonstrated"
);

const staleContext = mutateInput(inputTexts, "scope", (rows) => {
  rows.find((row) => row.agency_name === "ACTUAL").coverage_critical_pct = "63";
});
expectValidationError(
  agenciesFile,
  pilotSelectionFile,
  staleContext,
  /source hashes do not match|snapshot hash is stale|deterministic snapshot derivation/,
  "old hashes must not validate against mutated source bytes"
);

const missingMandatoryArtifact = clone(built);
const mandatoryId = pilotSelectionFile.entries.find(
  (entry) => entry.metrics.mandatory_mvp
).agency_id;
missingMandatoryArtifact.pilotSelectionFile.entries =
  missingMandatoryArtifact.pilotSelectionFile.entries.filter(
    (entry) => entry.agency_id !== mandatoryId
  );
missingMandatoryArtifact.pilotSelectionFile.selected_agency_ids =
  missingMandatoryArtifact.pilotSelectionFile.selected_agency_ids.filter(
    (agencyId) => agencyId !== mandatoryId
  );
expectValidationError(
  missingMandatoryArtifact.agenciesFile,
  missingMandatoryArtifact.pilotSelectionFile,
  inputTexts,
  /selected agency flags|deterministic snapshot derivation/,
  "validator must reject an omitted mandatory agency"
);

const missingTycArtifact = clone(built);
missingTycArtifact.pilotSelectionFile.entries =
  missingTycArtifact.pilotSelectionFile.entries.filter(
    (entry) => entry.agency_id !== "agency:grupo-tyc"
  );
missingTycArtifact.pilotSelectionFile.selected_agency_ids =
  missingTycArtifact.pilotSelectionFile.selected_agency_ids.filter(
    (agencyId) => agencyId !== "agency:grupo-tyc"
  );
expectValidationError(
  missingTycArtifact.agenciesFile,
  missingTycArtifact.pilotSelectionFile,
  inputTexts,
  /GRUPO T&C alias group is not selected/,
  "validator must require Grupo T&C"
);

const mutationCases = [
  {
    name: "snapshot hash",
    pattern: /snapshot hash is stale|deterministic snapshot derivation/,
    mutate(artifact) {
      artifact.pilotSelectionFile.entries[0].evidence.tier.matching.snapshot_sha256 =
        "0".repeat(64);
    }
  },
  {
    name: "row key",
    pattern: /matching row key must resolve exactly once/,
    mutate(artifact) {
      artifact.pilotSelectionFile.entries[0].evidence.tier.matching.row_key.nexo_project_id =
        "missing";
    }
  },
  {
    name: "high-only",
    pattern: /match_class must be match_high|deterministic snapshot derivation/,
    mutate(artifact) {
      artifact.pilotSelectionFile.entries[0].evidence.tier.matching.match_class =
        "match_medium";
    }
  },
  {
    name: "no-review",
    pattern: /requires_human_review must be false|deterministic snapshot derivation/,
    mutate(artifact) {
      artifact.pilotSelectionFile.entries[0].evidence.tier.matching.requires_human_review =
        true;
    }
  },
  {
    name: "deep facts",
    pattern: /backed_fact_fields must contain at least 3|deep evidence predicate/,
    mutate(artifact) {
      artifact.pilotSelectionFile.entries
        .find((entry) => entry.coverage_tier === "deep")
        .evidence.tier.nexo.backed_fact_fields = ["district", "address"];
    }
  },
  {
    name: "deep typology",
    pattern: /inspectable_typology must be a non-empty string|deep evidence predicate/,
    mutate(artifact) {
      artifact.pilotSelectionFile.entries
        .find((entry) => entry.coverage_tier === "deep")
        .evidence.tier.nexo.inspectable_typology = "";
    }
  },
  {
    name: "external unavailable",
    pattern: /external_evidence_status must be unavailable|external evidence must remain unavailable/,
    mutate(artifact) {
      artifact.pilotSelectionFile.entries[0].evidence.tier.web.external_evidence_status =
        "available";
    }
  },
  {
    name: "exclusive counts",
    pattern: /exclusive tier counts/,
    mutate(artifact) {
      artifact.pilotSelectionFile.counts.exclusive_tier_counts.base += 1;
    }
  },
  {
    name: "cumulative counts",
    pattern: /enriched_count does not equal actual entries/,
    mutate(artifact) {
      artifact.pilotSelectionFile.counts.enriched_count -= 1;
    }
  },
  {
    name: "raw payload",
    pattern: /invalid keys|privacy: .*forbidden key/,
    mutate(artifact) {
      artifact.pilotSelectionFile.entries[0].raw_payload = { hidden: true };
    }
  },
  {
    name: "nested local path",
    pattern: /privacy: .*local or raw-output path/,
    mutate(artifact) {
      artifact.pilotSelectionFile.entries[0].evidence.scope.row_key.agency_names[0] =
        "C:\\Users\\Demo\\AppData\\Local\\Temp\\raw.json";
    }
  },
  {
    name: "extra shape key",
    pattern: /has invalid keys/,
    mutate(artifact) {
      artifact.pilotSelectionFile.entries[0].metrics.extra = true;
    }
  }
];
for (const testCase of mutationCases) {
  const mutated = clone(built);
  testCase.mutate(mutated);
  expectValidationError(
    mutated.agenciesFile,
    mutated.pilotSelectionFile,
    inputTexts,
    testCase.pattern,
    `validator must reject ${testCase.name}`
  );
}

const implementationSource = readFileSync(
  join(PROTOTYPE_ROOT, "scripts", "data", "agencies.js"),
  "utf8"
);
assert.doesNotMatch(
  implementationSource,
  /\bfetch\s*\(|node:https?|https?\.request\s*\(/,
  "agency implementation must remain local and perform no network calls"
);

console.log(
  `Agency pilot OK: ${agenciesFile.agencies.length} canonical agencies, ` +
    `${actualCounts.base_count} selected, ${actualCounts.enriched_count} enriched, ` +
    `${actualCounts.deep_count} deep; byte provenance, one-to-one joins, mandatory groups, ` +
    "shapes, privacy, deterministic failures and checker mutations verified."
);
