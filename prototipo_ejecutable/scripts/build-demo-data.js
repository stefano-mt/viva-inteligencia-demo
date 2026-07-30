import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseCsv,
  validateAgencyArtifacts
} from "./data/agencies.js";
import { buildEvidenceBundle } from "./data/evidence.js";
import { buildGeographyModel } from "./data/geography.js";
import { materializeMeasureRecords } from "./data/measures.js";
import {
  loadContractSchema,
  validateFixture,
  validatePrivacy,
  validateRootDocument
} from "./data/validate.js";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));

export const DEFAULT_REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, "../..");
export const DEFAULT_OUTPUT_PATH = path.join(
  DEFAULT_REPOSITORY_ROOT,
  "prototipo_ejecutable",
  "public",
  "demo-data",
  "viva-platform-demo.json"
);
export const DEFAULT_GEOJSON_OUTPUT_PATH = path.join(
  DEFAULT_REPOSITORY_ROOT,
  "prototipo_ejecutable",
  "public",
  "demo-data",
  "district-boundaries.geojson"
);
export const DEFAULT_COVERAGE_REPORT_OUTPUT_PATH = path.join(
  DEFAULT_REPOSITORY_ROOT,
  "datos_relevantes",
  "demo-pilot",
  "coverage-report.json"
);

export const DATASET_ID = "dataset:viva-platform-demo-2026-07-28";
export const GENERATED_AT = "2026-07-28T01:24:28Z";
export const CUTOFF_AT = "2026-07-28T01:24:28Z";

const PATHS = Object.freeze({
  schema: "prototipo_ejecutable/contracts/demo-v2.schema.json",
  nexo: "datos_relevantes/viva_minimum_dataset_latest.csv",
  scope: "datos_relevantes/service_scope_matrix.csv",
  discovery: "datos_relevantes/agency_web_discovery_matrix_validated.csv",
  web: "datos_relevantes/webs_propias_sample_dataset.csv",
  matching: "datos_relevantes/nexo_web_project_match.csv",
  feasibility:
    "datos_relevantes/webs_propias_source_field_feasibility.csv",
  quality: "datos_relevantes/data_quality_latest.json",
  assistant: "datos_relevantes/assistant_validation_latest.json",
  agencies: "datos_relevantes/demo-pilot/agencies.json",
  pilotSelection: "datos_relevantes/demo-pilot/pilot-selection.json",
  sources: "datos_relevantes/demo-pilot/sources.json",
  observations: "datos_relevantes/demo-pilot/observations.json",
  documents: "datos_relevantes/demo-pilot/documents.json",
  evidence: "datos_relevantes/demo-pilot/evidence.json",
  evidenceManifest: "datos_relevantes/demo-pilot/evidence-manifest.json",
  inspectorCases: "datos_relevantes/demo-pilot/inspector-cases.json",
  transcriptions:
    "datos_relevantes/demo-pilot/evidence/ct-g-transcriptions.json",
  authorizedEvidence:
    "datos_relevantes/demo-pilot/evidence/ct-d-countertop-fragment.txt",
  typologies: "datos_relevantes/demo-pilot/typologies.json",
  facts: "datos_relevantes/demo-pilot/facts.json",
  issues: "datos_relevantes/demo-pilot/issues.json",
  events: "datos_relevantes/demo-pilot/events.json",
  geographyManifest: "datos_relevantes/geography/source-manifest.json",
  geographySource:
    "datos_relevantes/geography/district-boundaries-source.geojson",
  fixtureA: "datos_relevantes/demo-pilot/fixtures/ct-a.json",
  fixtureB: "datos_relevantes/demo-pilot/fixtures/ct-b.json",
  fixtureC: "datos_relevantes/demo-pilot/fixtures/ct-c.json",
  fixtureD: "datos_relevantes/demo-pilot/fixtures/ct-d.json",
  fixtureE: "datos_relevantes/demo-pilot/fixtures/ct-e.json",
  fixtureG: "datos_relevantes/demo-pilot/fixtures/ct-g.json",
  fixtureH: "datos_relevantes/demo-pilot/fixtures/ct-h.json",
  fixtureI: "datos_relevantes/demo-pilot/fixtures/ct-i.json"
});

export const REQUIRED_INPUT_PATHS = Object.freeze(
  [...new Set(Object.values(PATHS))].sort(compareText)
);

const FIXTURE_KEYS = Object.freeze([
  "fixtureA",
  "fixtureB",
  "fixtureD",
  "fixtureE",
  "fixtureG",
  "fixtureH"
]);

const CRITICAL_FIELDS = Object.freeze([
  "source_url",
  "agency_name",
  "project_name",
  "district",
  "typology",
  "bedrooms",
  "total_area",
  "unit_status",
  "unit_count",
  "list_price_avg",
  "delivery_year"
]);

const CONTACT_FIELD_NAMES = new Set([
  "contact",
  "email",
  "phone",
  "whatsapp",
  "project_contact",
  "project_email",
  "project_phone",
  "project_whatsapp"
]);

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareById(idField) {
  return (left, right) => compareText(left[idField], right[idField]);
}

function logicalAbsolutePath(repositoryRoot, logicalPath) {
  return path.join(repositoryRoot, ...logicalPath.split("/"));
}

function clean(value) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || null;
}

function requiredText(value, label, fallback = null) {
  const normalized = clean(value) ?? fallback;
  if (!normalized) throw new Error(`${label} must be a non-empty string`);
  return normalized;
}

function publicText(value) {
  const normalized = clean(value);
  if (normalized === null) return null;
  return validatePrivacy(normalized).length === 0 ? normalized : null;
}

function number(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace("%", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function boolean(value) {
  return ["true", "1", "yes", "si", "sí"].includes(
    String(value ?? "").trim().toLowerCase()
  );
}

function splitList(value, separator = "|") {
  return String(value ?? "")
    .split(separator)
    .map((item) => clean(item))
    .filter(Boolean);
}

function round(value, digits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + (number(row[field]) ?? 0), 0);
}

function average(rows, field) {
  const values = rows
    .map((row) => number(row[field]))
    .filter((value) => value !== null);
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : null;
}

function normalizeCurrency(value) {
  if (value === "PEN" || value === "USD") return value;
  return "unknown";
}

function normalizeConfidence(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["alta", "high"].includes(normalized)) return "high";
  if (["media", "medium"].includes(normalized)) return "medium";
  if (["baja", "low"].includes(normalized)) return "low";
  return "unknown";
}

function normalizeDateTime(value, label) {
  const normalized = clean(value);
  if (normalized === null) return null;
  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      normalized
    )
  ) {
    return normalized;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized}T00:00:00Z`;
  }
  const sqlLike =
    /^(\d{4}-\d{2}-\d{2})[ ](\d{2}:\d{2}:\d{2})$/.exec(normalized);
  if (sqlLike) return `${sqlLike[1]}T${sqlLike[2]}Z`;
  throw new Error(`${label} is not a supported deterministic date-time`);
}

function stableJson(value) {
  if (Array.isArray(value)) return value.map(stableJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort(compareText)
      .map((key) => [key, stableJson(value[key])])
  );
}

function equalJson(left, right) {
  return JSON.stringify(stableJson(left)) === JSON.stringify(stableJson(right));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalizeLogicalEol(value) {
  const text = Buffer.isBuffer(value) ? value.toString("utf8") : String(value);
  return text.replace(/\r\n?/g, "\n");
}

export function logicalInputSha256(value) {
  return sha256(canonicalizeLogicalEol(value));
}

export function binaryInputSha256(value) {
  return sha256(Buffer.isBuffer(value) ? value : Buffer.from(value));
}

function isBinaryInputPath(logicalPath) {
  return /\.(?:avif|bmp|gif|heic|jpe?g|png|tiff?|webp)$/i.test(logicalPath);
}

function manifestAssetInputPaths(manifest) {
  if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.assets)) {
    throw new Error("Evidence manifest must contain version 1 and an assets array");
  }
  const paths = manifest.assets.map((asset) => {
    const logicalPath = asset?.logical_path;
    if (
      typeof logicalPath !== "string" ||
      !/^assets\/evidence\/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/.test(
        logicalPath
      )
    ) {
      throw new Error(`Invalid evidence manifest asset path: ${logicalPath}`);
    }
    return `prototipo_ejecutable/public/${logicalPath}`;
  });
  if (new Set(paths).size !== paths.length) {
    throw new Error("Evidence manifest asset paths must be unique");
  }
  return paths.sort(compareText);
}

async function readLogicalPaths(repositoryRoot, logicalPaths, buffers) {
  for (const logicalPath of logicalPaths) {
    const absolutePath = logicalAbsolutePath(repositoryRoot, logicalPath);
    let content;
    try {
      content = await fs.readFile(absolutePath);
    } catch (error) {
      throw new Error(
        `Required input is missing or unreadable: ${logicalPath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
    buffers.set(logicalPath, content);
  }
}

async function readRequiredInputs(repositoryRoot) {
  const buffers = new Map();
  await readLogicalPaths(repositoryRoot, REQUIRED_INPUT_PATHS, buffers);
  const manifest = parseRequiredJson(
    buffers,
    PATHS.evidenceManifest,
    "object"
  );
  await readLogicalPaths(
    repositoryRoot,
    manifestAssetInputPaths(manifest),
    buffers
  );
  return buffers;
}

export async function discoverRequiredInputPaths(
  repositoryRoot = DEFAULT_REPOSITORY_ROOT
) {
  return [...(await readRequiredInputs(path.resolve(repositoryRoot))).keys()].sort(
    compareText
  );
}

function inputText(inputs, logicalPath) {
  const value = inputs.get(logicalPath);
  if (!value) throw new Error(`Required input was not loaded: ${logicalPath}`);
  return value.toString("utf8");
}

function parseRequiredJson(inputs, logicalPath, expectedType) {
  let value;
  try {
    value = JSON.parse(inputText(inputs, logicalPath));
  } catch (error) {
    throw new Error(
      `Invalid JSON in ${logicalPath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  if (expectedType === "array" && !Array.isArray(value)) {
    throw new Error(`${logicalPath} must contain a JSON array`);
  }
  if (
    expectedType === "object" &&
    (!value || typeof value !== "object" || Array.isArray(value))
  ) {
    throw new Error(`${logicalPath} must contain a JSON object`);
  }
  return value;
}

function parseRequiredCsv(inputs, logicalPath) {
  const rows = parseCsv(inputText(inputs, logicalPath));
  if (rows.length === 0) throw new Error(`${logicalPath} must not be empty`);
  return rows;
}

function buildInputFingerprints(inputs) {
  return [...inputs.keys()].sort(compareText).map((logicalPath, index) => ({
    input_id: `input:${String(index + 1).padStart(3, "0")}`,
    path: logicalPath,
    sha256: isBinaryInputPath(logicalPath)
      ? binaryInputSha256(inputs.get(logicalPath))
      : logicalInputSha256(inputs.get(logicalPath))
  }));
}

function normalizeLegacyProjects(rows) {
  const seen = new Set();
  return rows.map((row, index) => {
    const id = requiredText(
      row.project_id,
      `legacy source row ${index + 1}.project_id`
    );
    if (seen.has(id)) throw new Error(`Duplicate legacy project ID: ${id}`);
    seen.add(id);

    const listPrice = number(row.list_price_avg || row.price_min);
    const totalArea = number(
      row.total_area || row.total_area_min || row.area_min
    );
    const unitCount = number(row.unit_count);
    const latestHistory = number(row.latest_price_history_from);
    const delta =
      listPrice !== null && latestHistory !== null
        ? listPrice - latestHistory
        : null;
    const deltaPct =
      delta !== null && latestHistory !== null && latestHistory !== 0
        ? (delta / latestHistory) * 100
        : null;
    const missing = splitList(row.missing_required_fields, ",").filter(
      (field) => !CONTACT_FIELD_NAMES.has(field)
    );

    return {
      id,
      source: requiredText(
        row.source,
        `legacy project ${id}.source`,
        "Nexo Inmobiliario"
      ),
      source_type: requiredText(
        row.source_type,
        `legacy project ${id}.source_type`,
        "portal"
      ),
      captured_at: normalizeDateTime(
        row.captured_at,
        `legacy project ${id}.captured_at`
      ),
      source_url: clean(row.source_url),
      extraction_method: requiredText(
        row.extraction_method,
        `legacy project ${id}.extraction_method`,
        "versioned_snapshot"
      ),
      agency_name: requiredText(
        row.agency_name,
        `legacy project ${id}.agency_name`,
        "Sin inmobiliaria"
      ),
      project_name: requiredText(
        row.project_name,
        `legacy project ${id}.project_name`,
        "Sin proyecto"
      ),
      district: requiredText(
        row.district,
        `legacy project ${id}.district`,
        "Sin distrito"
      ),
      province: clean(row.province),
      department: clean(row.department),
      address: publicText(row.address),
      latitude: number(row.latitude),
      longitude: number(row.longitude),
      project_phase: clean(row.project_phase || row.unit_status),
      typology: clean(row.typology),
      bedrooms: clean(row.bedrooms),
      bedrooms_min: number(row.bedrooms_min),
      bedrooms_max: number(row.bedrooms_max),
      total_area_min: number(row.total_area_min || row.area_min),
      total_area_max: number(row.total_area_max || row.area_max),
      total_area: totalArea,
      unit_status: clean(row.unit_status),
      unit_count: unitCount,
      currency: normalizeCurrency(clean(row.currency)),
      list_price_avg: listPrice,
      price_min: number(row.price_min),
      price_per_m2_list: number(row.price_per_m2_list),
      latest_price_history_from: latestHistory,
      latest_price_history_date: normalizeDateTime(
        row.latest_price_history_date,
        `legacy project ${id}.latest_price_history_date`
      ),
      price_delta: delta === null ? null : round(delta, 2),
      price_delta_pct: deltaPct === null ? null : round(deltaPct, 2),
      delivery_year: number(row.delivery_year),
      delivery_date: normalizeDateTime(
        row.delivery_date,
        `legacy project ${id}.delivery_date`
      ),
      update_date: normalizeDateTime(
        row.update_date,
        `legacy project ${id}.update_date`
      ),
      income:
        number(row.income) ??
        (unitCount === null || listPrice === null
          ? null
          : unitCount * listPrice),
      total_m2:
        number(row.total_m2) ??
        (unitCount === null || totalArea === null
          ? null
          : unitCount * totalArea),
      financing_banks: splitList(row.financing_banks),
      amenities: splitList(row.amenities),
      project_description: clean(row.project_description),
      field_confidence: normalizeConfidence(row.field_confidence),
      missing_required_fields: [...new Set(missing)].sort(compareText)
    };
  });
}

function buildAuthoritativeProjects({
  nexoRows,
  agencies,
  aliases,
  fixtures
}) {
  const agencyIds = new Set(agencies.map((agency) => agency.agency_id));
  const aliasToAgency = new Map(
    aliases.map((alias) => [alias.alias_original, alias.agency_id])
  );
  const projects = [];
  const unresolvedLegacyIds = [];

  for (const row of nexoRows) {
    const agencyId = aliasToAgency.get(row.agency_name) ?? null;
    if (agencyId === null) {
      unresolvedLegacyIds.push(row.project_id);
      continue;
    }
    if (!agencyIds.has(agencyId)) {
      throw new Error(
        `Nexo project ${row.project_id} resolves to missing ${agencyId}`
      );
    }
    projects.push({
      project_id: `project:nexo-${row.project_id}`,
      agency_id: agencyId,
      canonical_name: requiredText(
        row.project_name,
        `Nexo project ${row.project_id}.project_name`
      ),
      source_names: [
        requiredText(
          row.project_name,
          `Nexo project ${row.project_id}.project_name`
        )
      ],
      location: {
        district: clean(row.district),
        province: clean(row.province),
        department: clean(row.department),
        address: publicText(row.address),
        latitude: number(row.latitude),
        longitude: number(row.longitude)
      },
      status: clean(row.project_phase || row.unit_status),
      first_seen_at: normalizeDateTime(
        row.captured_at,
        `Nexo project ${row.project_id}.captured_at`
      ),
      last_seen_at: normalizeDateTime(
        row.captured_at,
        `Nexo project ${row.project_id}.captured_at`
      ),
      quality_status: "reviewable"
    });
  }

  const byId = new Map(
    projects.map((project) => [project.project_id, project])
  );
  for (const fixture of fixtures) {
    for (const project of fixture.input.projects ?? []) {
      const existing = byId.get(project.project_id);
      if (existing) {
        if (fixture.case_id !== "CT-G") {
          throw new Error(
            `Unexpected authoritative project collision: ${project.project_id}`
          );
        }
        existing.source_names = [
          ...new Set([...existing.source_names, ...project.source_names])
        ].sort(compareText);
        existing.status = project.status;
        existing.last_seen_at = project.last_seen_at;
        existing.quality_status = project.quality_status;
        continue;
      }
      if (!agencyIds.has(project.agency_id)) {
        throw new Error(
          `Controlled project ${project.project_id} references missing ${project.agency_id}`
        );
      }
      const cloned = structuredClone(project);
      projects.push(cloned);
      byId.set(cloned.project_id, cloned);
    }
  }

  const ordered = projects.sort(compareById("project_id"));
  if (new Set(ordered.map((project) => project.project_id)).size !== ordered.length) {
    throw new Error("Authoritative projects contain duplicate IDs");
  }
  return {
    projects: ordered,
    unresolvedLegacyIds: unresolvedLegacyIds.sort(compareText)
  };
}

function controlledAgencies(fixtures) {
  const result = [];
  const seen = new Set();
  for (const fixture of fixtures) {
    if (!["CT-A", "CT-B", "CT-D", "CT-E"].includes(fixture.case_id)) {
      continue;
    }
    for (const agency of fixture.input.agencies ?? []) {
      if (seen.has(agency.agency_id)) {
        throw new Error(`Duplicate controlled agency ${agency.agency_id}`);
      }
      seen.add(agency.agency_id);
      result.push(structuredClone(agency));
    }
  }
  return result.sort(compareById("agency_id"));
}

function assertCatalogParity(actual, expected, label) {
  if (!equalJson(actual, expected)) {
    throw new Error(`${label} differs from its deterministic fixture union`);
  }
}

function buildPilot(pilotSelection, legacyProjects) {
  const districtCounts = new Map();
  for (const project of legacyProjects) {
    districtCounts.set(
      project.district,
      (districtCounts.get(project.district) ?? 0) + 1
    );
  }
  const districts = [...districtCounts.entries()]
    .sort(
      (left, right) =>
        right[1] - left[1] || compareText(left[0], right[0])
    )
    .slice(0, 7)
    .map(([district]) => district)
    .sort(compareText);
  const counts = pilotSelection.counts;
  return {
    pilot_id: "pilot:viva-demo-2026-07-28",
    version: pilotSelection.version,
    selected_at: GENERATED_AT,
    selection_rule:
      "Selección versionada de P1-03: obligatorias, elegibilidad local y ranking determinista.",
    selection_reason:
      "Demostrar cobertura base, enriquecida y profunda sin resolver aliases ambiguos por intuición.",
    agency_ids: [...pilotSelection.selected_agency_ids].sort(compareText),
    districts,
    counts: {
      market_raw_count: counts.market_raw_count,
      base_count: counts.base_count,
      enriched_count: counts.enriched_count,
      deep_count: counts.deep_count
    }
  };
}

function buildCertifiedAggregates(facts) {
  const groups = new Map();
  for (const fact of facts) {
    if (
      fact.benchmark_eligible !== true ||
      fact.quality_status !== "certified" ||
      typeof fact.normalized_value !== "number" ||
      !Number.isFinite(fact.normalized_value)
    ) {
      continue;
    }
    const dimensions = {
      semantic_type: fact.semantic_type,
      unit: fact.unit,
      currency: fact.currency,
      price_type: fact.price_type,
      area_type: fact.area_type,
      denominator_area_type: fact.denominator_area_type
    };
    const key = JSON.stringify(dimensions);
    const group = groups.get(key) ?? { ...dimensions, values: [] };
    group.values.push(fact.normalized_value);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map(({ values, ...dimensions }) => ({
      ...dimensions,
      count: values.length,
      mean: round(
        values.reduce((total, value) => total + value, 0) / values.length,
        2
      ),
      minimum: Math.min(...values),
      maximum: Math.max(...values)
    }))
    .sort((left, right) =>
      compareText(
        JSON.stringify([
          left.semantic_type,
          left.currency,
          left.price_type,
          left.area_type,
          left.denominator_area_type,
          left.unit
        ]),
        JSON.stringify([
          right.semantic_type,
          right.currency,
          right.price_type,
          right.area_type,
          right.denominator_area_type,
          right.unit
        ])
      )
    );
}

function monetaryRows(projects, currency = "PEN") {
  return projects.filter((project) => project.currency === currency);
}

function buildExecutive(projects, certifiedAggregates) {
  const penRows = monetaryRows(projects, "PEN");
  return {
    active_projects: new Set(projects.map(projectKey)).size,
    published_units: round(sum(projects, "unit_count"), 0),
    estimated_income: round(sum(penRows, "income"), 2),
    monetary_currency: "PEN",
    total_m2: round(sum(projects, "total_m2"), 2),
    avg_price_m2_list: round(average(penRows, "price_per_m2_list"), 2),
    price_per_m2_denominator_area_type: "total",
    avg_list_price: round(average(penRows, "list_price_avg"), 2),
    districts: new Set(projects.map((project) => project.district)).size,
    agencies: new Set(projects.map((project) => project.agency_name)).size,
    certified_aggregates: certifiedAggregates,
    latest_price_changes: projects
      .filter(
        (project) =>
          project.currency === "PEN" && project.price_delta_pct !== null
      )
      .sort(
        (left, right) =>
          Math.abs(right.price_delta_pct) -
            Math.abs(left.price_delta_pct) ||
          compareText(left.id, right.id)
      )
      .slice(0, 15)
  };
}

function aggregateProjects(projects, field) {
  const groups = new Map();
  for (const project of projects) {
    const key = project[field] || "Sin dato";
    const rows = groups.get(key) ?? [];
    rows.push(project);
    groups.set(key, rows);
  }
  return [...groups.entries()]
    .map(([name, rows]) => {
      const penRows = monetaryRows(rows, "PEN");
      return {
        name,
        projects: new Set(rows.map(projectKey)).size,
        units: round(sum(rows, "unit_count"), 0),
        estimated_income: round(sum(penRows, "income"), 2),
        monetary_currency: "PEN",
        total_m2: round(sum(rows, "total_m2"), 2),
        avg_price_m2_list: round(
          average(penRows, "price_per_m2_list"),
          2
        ),
        price_per_m2_denominator_area_type: "total",
        avg_list_price: round(average(penRows, "list_price_avg"), 2)
      };
    })
    .sort(
      (left, right) =>
        right.projects - left.projects ||
        right.units - left.units ||
        compareText(left.name, right.name)
    );
}

function normalizeScope(rows) {
  return rows.map((row) => ({
    run_id: requiredText(row.run_id, "scope.run_id"),
    scope_level: clean(row.scope_level),
    agency_name: clean(row.agency_name),
    domain: clean(row.domain),
    archetype_primary: clean(row.archetype_primary),
    nexo_project_count: number(row.nexo_project_count) ?? 0,
    web_project_count: number(row.web_project_count) ?? 0,
    matched_project_count: number(row.matched_project_count) ?? 0,
    coverage_critical_pct: number(row.coverage_critical_pct) ?? 0,
    requires_playwright: boolean(row.requires_playwright),
    extraction_cost_level: clean(row.extraction_cost_level),
    viability_score: number(row.viability_score) ?? 0,
    final_decision: clean(row.final_decision),
    included_in_mvp: boolean(row.included_in_mvp),
    condition_or_exclusion_reason: clean(row.condition_or_exclusion_reason),
    next_action: clean(row.next_action)
  }));
}

function normalizeMatching(rows) {
  return rows.map((row) => ({
    run_id: requiredText(row.run_id, "matching.run_id"),
    agency_name: clean(row.agency_name),
    domain: clean(row.domain),
    web_project_url: publicText(row.web_project_url),
    web_project_name: publicText(row.web_project_name),
    nexo_project_id: clean(row.nexo_project_id),
    nexo_project_name: clean(row.nexo_project_name),
    match_score: number(row.match_score) ?? 0,
    match_class: clean(row.match_class) ?? "sin_clase",
    matched_on_agency: boolean(row.matched_on_agency),
    matched_on_project_name: boolean(row.matched_on_project_name),
    matched_on_district: boolean(row.matched_on_district),
    matched_on_address: boolean(row.matched_on_address),
    matched_on_coordinates: boolean(row.matched_on_coordinates),
    matched_on_slug: boolean(row.matched_on_slug),
    justification: clean(row.justification),
    requires_human_review: boolean(row.requires_human_review)
  }));
}

function countBy(rows, field) {
  const counts = new Map();
  for (const row of rows) {
    const key = clean(row[field]) ?? "Sin dato";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort(
      (left, right) =>
        right.count - left.count || compareText(left.name, right.name)
    );
}

function buildScopeSummary(scope) {
  const mvp = scope.filter(
    (row) => row.scope_level === "MVP automatizable"
  );
  return {
    by_scope_level: countBy(scope, "scope_level"),
    by_final_decision: countBy(scope, "final_decision"),
    by_archetype: countBy(scope, "archetype_primary"),
    mvp_automatizable: [...mvp].sort(
      (left, right) =>
        right.viability_score - left.viability_score ||
        compareText(left.agency_name, right.agency_name)
    ),
    conditioned: scope.filter(
      (row) => row.scope_level === "MVP condicionado / enriquecimiento"
    ),
    out_of_scope: scope.filter(
      (row) => row.scope_level === "Fuera de alcance"
    ),
    backlog: scope.filter(
      (row) => row.scope_level === "Backlog posterior"
    )
  };
}

function addGrouped(map, key, row) {
  const safeKey = clean(key) ?? "Sin dato";
  const rows = map.get(safeKey) ?? [];
  rows.push(row);
  map.set(safeKey, rows);
}

function topValue(rows, field) {
  return countBy(rows, field)[0]?.name ?? null;
}

function buildCoverage(rows) {
  const byField = new Map();
  const byAgency = new Map();
  for (const row of rows) {
    addGrouped(byField, row.field_name, row);
    addGrouped(byAgency, row.agency_name, row);
  }
  return {
    fields: [...byField.entries()]
      .map(([field, fieldRows]) => ({
        field_name: field,
        records_sampled: round(average(fieldRows, "records_sampled"), 0),
        field_coverage_pct: round(
          average(fieldRows, "field_coverage_pct"),
          0
        ),
        evidence_available_pct: round(
          average(fieldRows, "evidence_available_pct"),
          0
        ),
        mismatch_rate_vs_nexo: round(
          average(fieldRows, "mismatch_rate_vs_nexo"),
          2
        ),
        recommended_use: topValue(fieldRows, "recommended_use"),
        is_critical: CRITICAL_FIELDS.includes(field)
      }))
      .sort(
        (left, right) =>
          Number(right.is_critical) - Number(left.is_critical) ||
          (right.field_coverage_pct ?? 0) -
            (left.field_coverage_pct ?? 0) ||
          compareText(left.field_name, right.field_name)
      ),
    agencies: [...byAgency.entries()]
      .map(([agency, agencyRows]) => ({
        agency_name: agency,
        domain: clean(agencyRows[0]?.domain),
        archetype_primary: clean(agencyRows[0]?.archetype_primary),
        fields: agencyRows.length,
        avg_coverage_pct: round(
          average(agencyRows, "field_coverage_pct"),
          0
        ),
        avg_evidence_pct: round(
          average(agencyRows, "evidence_available_pct"),
          0
        ),
        primary_candidate_fields: agencyRows.filter(
          (row) => row.recommended_use === "primary_candidate"
        ).length,
        review_fields: agencyRows.filter((row) =>
          String(row.recommended_use).includes("review")
        ).length
      }))
      .sort(
        (left, right) =>
          (right.avg_coverage_pct ?? 0) -
            (left.avg_coverage_pct ?? 0) ||
          compareText(left.agency_name, right.agency_name)
      ),
    raw_sample: rows.slice(0, 240).map((row) => ({
      run_id: clean(row.run_id),
      agency_name: clean(row.agency_name),
      domain: clean(row.domain),
      archetype_primary: clean(row.archetype_primary),
      field_name: clean(row.field_name),
      records_sampled: number(row.records_sampled),
      field_coverage_pct: number(row.field_coverage_pct),
      evidence_available_pct: number(row.evidence_available_pct),
      mismatch_rate_vs_nexo: number(row.mismatch_rate_vs_nexo),
      recommended_use: clean(row.recommended_use),
      decision_reason: clean(row.decision_reason)
    }))
  };
}

function normalizeQuality(quality) {
  return {
    record_count: number(quality.record_count),
    critical_completeness_pct:
      quality.critical_completeness_pct &&
      typeof quality.critical_completeness_pct === "object"
        ? quality.critical_completeness_pct
        : {},
    duplicate_candidates: Array.isArray(quality.duplicate_candidates)
      ? quality.duplicate_candidates
      : [],
    outliers: Array.isArray(quality.outliers) ? quality.outliers : [],
    issues: Array.isArray(quality.issues) ? quality.issues : []
  };
}

function normalizeAssistant(assistant) {
  const results = assistant.results ?? assistant.questions ?? [];
  const rows = Array.isArray(results) ? results : Object.values(results);
  return {
    metadata: assistant.metadata ?? {},
    guardrails: assistant.guardrails ?? {},
    score: assistant.score ?? {
      passed: rows.filter((row) => row.passed).length,
      total: rows.length,
      pass_rate:
        rows.length > 0
          ? rows.filter((row) => row.passed).length / rows.length
          : 0
    },
    questions: rows.map((row) => ({
      id: row.id,
      question: clean(row.question),
      passed: Boolean(row.passed),
      elapsed_ms: row.elapsed_ms,
      guardrails: clean(row.guardrails),
      acceptance: clean(row.acceptance),
      answer: row.answer ?? null
    }))
  };
}

function buildPipeline() {
  return [
    {
      id: "ingesta-nexo",
      label: "Ingesta Nexo",
      status: "snapshot_versionado",
      detail:
        "Fuente base para la proyección legacy; los aliases ambiguos no se fuerzan en el modelo canónico.",
      artifacts: ["viva_minimum_dataset_latest.csv"]
    },
    {
      id: "registro-canonico",
      label: "Registro canónico",
      status: "validado",
      detail:
        "Inmobiliarias, aliases y tiers derivados por P1-03 desde snapshots locales.",
      artifacts: ["agencies.json", "pilot-selection.json"]
    },
    {
      id: "evidencia",
      label: "Fuentes y evidencia",
      status: "validado",
      detail:
        "Trazabilidad P1-04 con permisos y disponibilidad explícitos.",
      artifacts: ["sources.json", "observations.json", "evidence.json"]
    },
    {
      id: "medidas",
      label: "Medidas e histórico",
      status: "validado",
      detail:
        "Hechos P1-05 tipados por moneda, precio y denominador.",
      artifacts: ["facts.json", "events.json", "issues.json"]
    },
    {
      id: "publicacion",
      label: "Artefacto público v2",
      status: "deterministico",
      detail:
        "Build offline, validado y compatible con las siete rutas existentes.",
      artifacts: ["viva-platform-demo.json", "district-boundaries.geojson"]
    }
  ];
}

function projectKey(project) {
  return [project.agency_name, project.project_name, project.district].join(
    "|"
  );
}

function assetExistsFor(repositoryRoot) {
  const publicRoot = path.resolve(
    repositoryRoot,
    "prototipo_ejecutable",
    "public"
  );
  return (logicalPath) => {
    if (
      typeof logicalPath !== "string" ||
      !logicalPath.startsWith("assets/evidence/") ||
      logicalPath.includes("\\") ||
      logicalPath.split("/").includes("..")
    ) {
      return false;
    }
    const candidate = path.resolve(publicRoot, ...logicalPath.split("/"));
    if (
      candidate !== publicRoot &&
      !candidate.startsWith(`${publicRoot}${path.sep}`)
    ) {
      return false;
    }
    return existsSync(candidate);
  };
}

function throwValidationErrors(label, errors) {
  if (errors.length === 0) return;
  throw new Error(
    `${label} failed:\n${errors
      .map((error) =>
        typeof error === "string"
          ? `- ${error}`
          : `- ${error.code} ${error.path}: ${error.message}`
      )
      .join("\n")}`
  );
}

async function buildDemoBundle({
  repositoryRoot = DEFAULT_REPOSITORY_ROOT
} = {}) {
  const root = path.resolve(repositoryRoot);
  const inputs = await readRequiredInputs(root);
  const sourceManifest = parseRequiredJson(
    inputs,
    PATHS.geographyManifest,
    "object"
  );
  const boundaryFeatureCollection = parseRequiredJson(
    inputs,
    PATHS.geographySource,
    "object"
  );
  const geoJsonSerialized = canonicalizeLogicalEol(
    inputText(inputs, PATHS.geographySource)
  );
  const geoJsonSha256 = sha256(geoJsonSerialized);
  const geoJsonBytes = Buffer.byteLength(geoJsonSerialized, "utf8");
  if (
    geoJsonSha256 !== sourceManifest.source.source_sha256 ||
    geoJsonBytes !== sourceManifest.source.source_bytes
  ) {
    throw new Error(
      "Approved geography source differs from its logical LF-normalized manifest hash/size"
    );
  }
  if (
    sourceManifest.derived.public_geojson_sha256 !== geoJsonSha256 ||
    sourceManifest.derived.public_geojson_bytes !== geoJsonBytes ||
    sourceManifest.derived.simplification_tolerance_degrees !== 0
  ) {
    throw new Error(
      "Geography manifest derived metadata does not match the unsimplified public artifact"
    );
  }

  const schema = loadContractSchema(logicalAbsolutePath(root, PATHS.schema));
  const agenciesFile = parseRequiredJson(inputs, PATHS.agencies, "object");
  const pilotSelection = parseRequiredJson(
    inputs,
    PATHS.pilotSelection,
    "object"
  );
  const agencyInputTexts = {
    scope: inputText(inputs, PATHS.scope),
    discovery: inputText(inputs, PATHS.discovery),
    web: inputText(inputs, PATHS.web),
    nexo: inputText(inputs, PATHS.nexo),
    matching: inputText(inputs, PATHS.matching)
  };
  throwValidationErrors(
    "Agency artifacts",
    validateAgencyArtifacts({
      agenciesFile,
      pilotSelectionFile: pilotSelection,
      inputTexts: agencyInputTexts
    })
  );

  const fixtures = FIXTURE_KEYS.map((key) =>
    parseRequiredJson(inputs, PATHS[key], "object")
  );
  const fixtureC = parseRequiredJson(inputs, PATHS.fixtureC, "object");
  const fixtureI = parseRequiredJson(inputs, PATHS.fixtureI, "object");
  const assetExists = assetExistsFor(root);
  for (const fixture of fixtures) {
    throwValidationErrors(
      `Fixture ${fixture.case_id}`,
      validateFixture(fixture, {
        schema,
        repositoryRoot: root,
        assetExists
      })
    );
  }

  const evidenceManifest = parseRequiredJson(
    inputs,
    PATHS.evidenceManifest,
    "object"
  );
  const inspectorCases = parseRequiredJson(
    inputs,
    PATHS.inspectorCases,
    "object"
  );
  const evidenceBundle = buildEvidenceBundle({
    repositoryRoot: root,
    readPublicAsset(logicalPath) {
      return inputs.get(`prototipo_ejecutable/public/${logicalPath}`) ?? null;
    }
  });
  if (!equalJson(evidenceBundle.manifest, evidenceManifest)) {
    throw new Error(
      "Evidence manifest changed between input discovery and validation"
    );
  }
  const typologies = parseRequiredJson(inputs, PATHS.typologies, "array");
  const facts = parseRequiredJson(inputs, PATHS.facts, "array");
  const issues = parseRequiredJson(inputs, PATHS.issues, "array");
  const events = parseRequiredJson(inputs, PATHS.events, "array");
  const measures = materializeMeasureRecords(
    fixtures.filter((fixture) =>
      ["CT-A", "CT-B", "CT-D", "CT-E", "CT-G"].includes(fixture.case_id)
    ),
    {
      supplemental: { typologies, facts, issues, events }
    }
  );
  assertCatalogParity(typologies, measures.typologies, "typologies.json");
  assertCatalogParity(facts, measures.facts, "facts.json");
  assertCatalogParity(issues, measures.issues, "issues.json");
  assertCatalogParity(events, measures.events, "events.json");

  const nexoRows = parseRequiredCsv(inputs, PATHS.nexo);
  const legacyProjects = normalizeLegacyProjects(nexoRows);
  if (legacyProjects.length !== 714) {
    throw new Error(
      `Legacy projection must contain exactly 714 records; found ${legacyProjects.length}`
    );
  }

  const registryAgencies = agenciesFile.agencies.map((agency) =>
    structuredClone(agency)
  );
  const additionalAgencies = controlledAgencies(fixtures);
  const agencies = [...registryAgencies, ...additionalAgencies].sort(
    compareById("agency_id")
  );
  if (new Set(agencies.map((agency) => agency.agency_id)).size !== agencies.length) {
    throw new Error("Integrated agencies contain duplicate IDs");
  }
  const agencyAliases = agenciesFile.agency_aliases
    .map((alias) => structuredClone(alias))
    .sort(
      (left, right) =>
        compareText(left.alias_normalized, right.alias_normalized) ||
        compareText(left.alias_original, right.alias_original)
    );
  const authoritative = buildAuthoritativeProjects({
    nexoRows,
    agencies,
    aliases: agencyAliases,
    fixtures
  });

  const model = {
    sources: evidenceBundle.sources,
    agencies,
    agencyAliases,
    projects: authoritative.projects,
    typologies,
    observations: evidenceBundle.observations,
    facts,
    documents: evidenceBundle.documents,
    evidence: evidenceBundle.evidence,
    issues,
    events
  };
  const geography = buildGeographyModel({
    observedProjects: legacyProjects,
    authoritativeProjects: model.projects,
    boundaryFeatureCollection,
    sourceManifest,
    boundaryArtifactPath: "demo-data/district-boundaries.geojson",
    boundaryArtifactSha256: geoJsonSha256
  });
  const miraflores = geography.districts.find(
    (district) => district.district_id === "150122"
  );
  if (
    miraflores?.observed_project_count !== 90 ||
    miraflores?.coordinate_valid_count !== 90 ||
    miraflores?.polygon_valid_count !== 90 ||
    miraflores?.authoritative_project_count !== 85 ||
    miraflores?.unreconciled_project_count !== 5
  ) {
    throw new Error(
      "CT-I publication gate failed: Miraflores must remain 90/90 with 85 authoritative + 5 gaps"
    );
  }
  if (
    miraflores.median_latitude !== fixtureI.expected.result.median_latitude ||
    miraflores.median_longitude !== fixtureI.expected.result.median_longitude
  ) {
    throw new Error("CT-I publication gate failed: Miraflores medians drifted");
  }
  const pilot = buildPilot(pilotSelection, legacyProjects);
  const scope = normalizeScope(parseRequiredCsv(inputs, PATHS.scope));
  const matching = normalizeMatching(
    parseRequiredCsv(inputs, PATHS.matching)
  );
  const feasibility = parseRequiredCsv(inputs, PATHS.feasibility).filter(
    (row) => !CONTACT_FIELD_NAMES.has(row.field_name)
  );
  const quality = parseRequiredJson(inputs, PATHS.quality, "object");
  const assistant = parseRequiredJson(inputs, PATHS.assistant, "object");
  const certifiedAggregates = buildCertifiedAggregates(facts);

  const payload = {
    metadata: {
      contract_version: "2.2.0",
      dataset_id: DATASET_ID,
      generated_at: GENERATED_AT,
      cutoff_at: CUTOFF_AT,
      input_fingerprints: buildInputFingerprints(inputs),
      publication: {
        is_public_artifact: true,
        contains_contact_pii: false,
        raw_payloads_included: false,
        restricted_assets_included: false,
        policy_version: "public-demo-v1"
      },
      title: "Viva Inmobiliaria - Prototipo de Inteligencia Comercial",
      description:
        "Snapshot público v2, determinista, trazable y compatible con la demo estática.",
      source_snapshot: {
        min_captured_at: "2026-01-01T00:00:00Z",
        max_captured_at: CUTOFF_AT,
        assistant_dataset_run_id:
          clean(assistant?.metadata?.dataset_run_id) ?? null
      },
      counts: {
        projects: legacyProjects.length,
        model_projects: model.projects.length,
        unresolved_legacy_projects:
          authoritative.unresolvedLegacyIds.length,
        agencies_in_market: new Set(
          legacyProjects.map((project) => project.agency_name)
        ).size,
        canonical_agencies: model.agencies.length,
        selected_agencies: pilot.agency_ids.length,
        districts: new Set(
          legacyProjects.map((project) => project.district)
        ).size,
        sources: model.sources.length,
        observations: model.observations.length,
        facts: model.facts.length,
        documents: model.documents.length,
        evidence: model.evidence.length,
        issues: model.issues.length,
        events: model.events.length,
        typologies: model.typologies.length,
        inspector_cases: inspectorCases.cases.length,
        inspector_assets: evidenceManifest.assets.length
      }
    },
    model,
    pilot,
    scenario_catalogs: structuredClone(fixtureC.input.scenario_catalogs),
    scenario_defaults: {
      version: 1,
      district_id: "150122",
      scope_mode: "district",
      quadrant_id: null,
      center_latitude: null,
      center_longitude: null,
      radius_meters: null,
      typology: "all",
      bedrooms: "all",
      target_area_m2: null,
      target_price_pen: null,
      delivery_year: "all",
      visualization: "geographic",
      source: "default"
    },
    geography,
    inspector: {
      version: inspectorCases.version,
      default_case_id: inspectorCases.default_case_id,
      cases: structuredClone(inspectorCases.cases).sort(
        compareById("case_id")
      ),
      assets: structuredClone(evidenceManifest.assets).sort(
        compareById("asset_id")
      ),
      coverage: structuredClone(inspectorCases.coverage)
    },
    projects: legacyProjects,
    executive: buildExecutive(legacyProjects, certifiedAggregates),
    rankings: {
      districts: aggregateProjects(legacyProjects, "district").slice(0, 18),
      agencies: aggregateProjects(legacyProjects, "agency_name").slice(0, 18),
      typologies: aggregateProjects(legacyProjects, "typology").slice(0, 12),
      phases: aggregateProjects(legacyProjects, "project_phase").slice(0, 12)
    },
    sourceScope: scope,
    scopeSummary: buildScopeSummary(scope),
    matching: {
      summary: countBy(matching, "match_class"),
      rows: matching
    },
    coverage: buildCoverage(feasibility),
    quality: normalizeQuality(quality),
    assistant: normalizeAssistant(assistant),
    pipeline: buildPipeline(),
    deployment: {
      mode: "static_versioned_demo",
      github_pages_ready: true,
      local_api_endpoints: [
        "api/demo/platform",
        "api/dashboard/latest",
        "api/runs/latest"
      ],
      static_data_path: "demo-data/viva-platform-demo.json"
    }
  };

  throwValidationErrors(
    "Root data contract",
    validateRootDocument(payload, { schema, assetExists })
  );
  return {
    payload,
    geoJsonSerialized,
    geoJsonSha256,
    geoJsonBytes,
    inputPaths: [...inputs.keys()].sort(compareText)
  };
}

export async function buildDemoPayload(options = {}) {
  return (await buildDemoBundle(options)).payload;
}

export function serializeDemoPayload(payload) {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

function countByValue(records, field) {
  const counts = new Map();
  for (const record of records) {
    const value = String(record[field]);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries([...counts].sort(([left], [right]) => compareText(left, right)));
}

export function buildCoverageReport(
  payload,
  serialized,
  { geoJsonSha256, geoJsonBytes }
) {
  const facts = payload.model.facts;
  const eligibleFacts = facts.filter((fact) => fact.benchmark_eligible);
  const excludedFacts = facts.filter((fact) => !fact.benchmark_eligible);
  const monetaryFacts = facts.filter((fact) =>
    ["price", "price_per_m2"].includes(fact.semantic_type)
  );
  const selectedAgencyIds = new Set(payload.pilot.agency_ids);
  const selectedModelProjects = payload.model.projects.filter((project) =>
    selectedAgencyIds.has(project.agency_id)
  );
  const inspectorCases = payload.inspector.cases;
  const qualityCaseDistribution = countByValue(
    inspectorCases,
    "expected_quality_status"
  );
  const miraflores = payload.geography.districts.find(
    (district) => district.district_id === "150122"
  );
  const certifiedEvents = payload.model.events.filter(
    (event) => event.quality_status === "certified"
  );
  const reviewableEvents = payload.model.events.filter(
    (event) => event.quality_status === "reviewable"
  );
  return {
    report_version: "2.0.0",
    dataset_id: payload.metadata.dataset_id,
    cutoff_at: payload.metadata.cutoff_at,
    source_artifact: {
      path: "prototipo_ejecutable/public/demo-data/viva-platform-demo.json",
      contract_version: payload.metadata.contract_version,
      sha256: sha256(serialized),
      byte_length: Buffer.byteLength(serialized, "utf8")
    },
    derivation: {
      authority:
        "$.model and $.inspector are authoritative; $.projects is the temporary legacy projection.",
      method:
        "All counts and distributions are recomputed offline from the deterministic 2.2 payload.",
      input_fingerprint_count: payload.metadata.input_fingerprints.length,
      counting_rules: [
        {
          code: "MODEL_COLLECTION_COUNTS",
          source_path: "$.model",
          operation: "array_length_by_collection"
        },
        {
          code: "INSPECTOR_COVERAGE",
          source_path: "$.inspector",
          operation: "derive cases, provenance, typologies and authorized assets"
        },
        {
          code: "BENCHMARK_EXCLUSIONS",
          source_path: "$.model.facts",
          operation:
            "group benchmark_eligible independently by quality_status, value_kind and semantic_type"
        }
      ],
      interpretation_rules: [
        "Counts grouped by different fact dimensions overlap and must not be added together.",
        "Controlled fixtures and controlled visual representations are not market observations.",
        "Visual evidence hashes identify raw binary bytes; textual fragment hashes identify canonical text."
      ]
    },
    universe: {
      legacy_projection: {
        project_count: payload.projects.length,
        distinct_agency_name_count: new Set(
          payload.projects.map((project) => project.agency_name)
        ).size,
        distinct_district_count: new Set(
          payload.projects.map((project) => project.district)
        ).size,
        currency_distribution: countByValue(payload.projects, "currency")
      },
      authoritative_model: {
        project_count: payload.model.projects.length,
        resolved_nexo_project_count: payload.model.projects.filter((project) =>
          project.project_id.startsWith("project:nexo-")
        ).length,
        controlled_fixture_project_count: payload.model.projects.filter(
          (project) => !project.project_id.startsWith("project:nexo-")
        ).length,
        canonical_agency_count: payload.model.agencies.length,
        market_canonical_agency_count: payload.model.agencies.filter(
          (agency) => !agency.agency_id.startsWith("agency:ct-")
        ).length,
        controlled_fixture_agency_count: payload.model.agencies.filter(
          (agency) => agency.agency_id.startsWith("agency:ct-")
        ).length
      },
      reconciliation: {
        unresolved_legacy_project_count:
          payload.metadata.counts.unresolved_legacy_projects,
        manual_review_alias_count: payload.model.agencyAliases.filter(
          (alias) => alias.resolution === "manual_review"
        ).length,
        resolved_alias_count: payload.model.agencyAliases.filter(
          (alias) => alias.resolution !== "manual_review"
        ).length
      }
    },
    pilot_coverage: {
      pilot_id: payload.pilot.pilot_id,
      selected_agency_count: payload.pilot.agency_ids.length,
      selected_model_project_count: selectedModelProjects.length,
      exclusive_tier_counts: countByValue(
        payload.model.agencies.filter((agency) => agency.pilot_selected),
        "coverage_tier"
      ),
      cumulative_tier_counts: structuredClone(payload.pilot.counts),
      selected_district_scope: structuredClone(payload.pilot.districts),
      references: [
        "$.pilot",
        "$.model.agencies[*].pilot_selected",
        "$.model.agencies[*].coverage_tier",
        "$.model.projects[*].agency_id"
      ]
    },
    inspector_coverage: {
      ...structuredClone(payload.inspector.coverage),
      case_quality_distribution: qualityCaseDistribution,
      benchmark_eligible_cases: inspectorCases.filter(
        (inspectorCase) => inspectorCase.expected_benchmark_eligible
      ).length,
      benchmark_excluded_cases: inspectorCases.filter(
        (inspectorCase) => !inspectorCase.expected_benchmark_eligible
      ).length,
      asset_byte_length: payload.inspector.assets.reduce(
        (total, asset) => total + asset.bytes,
        0
      ),
      reference: "$.inspector"
    },
    source_observation_and_evidence_coverage: {
      sources: {
        count: payload.model.sources.length,
        type_distribution: countByValue(payload.model.sources, "type"),
        legal_status_distribution: countByValue(
          payload.model.sources,
          "legal_status"
        ),
        access_mode_distribution: countByValue(
          payload.model.sources,
          "access_mode"
        ),
        records: payload.model.sources.map(
          ({ source_id, legal_status, access_mode }) => ({
            source_id,
            legal_status,
            access_mode
          })
        ),
        reference: "$.model.sources"
      },
      observations: {
        count: payload.model.observations.length,
        entity_type_distribution: countByValue(
          payload.model.observations,
          "entity_type"
        ),
        with_evidence_ids_count: payload.model.observations.filter(
          (observation) => observation.evidence_ids.length > 0
        ).length,
        without_evidence_ids_count: payload.model.observations.filter(
          (observation) => observation.evidence_ids.length === 0
        ).length,
        extraction_method_distribution: countByValue(
          payload.model.observations,
          "extraction_method"
        ),
        reference: "$.model.observations"
      },
      documents: {
        count: payload.model.documents.length,
        type_distribution: countByValue(
          payload.model.documents,
          "document_type"
        ),
        availability_distribution: countByValue(
          payload.model.documents,
          "availability"
        ),
        publish_permission_distribution: countByValue(
          payload.model.documents,
          "publish_permission"
        ),
        public_asset_path_count: payload.model.documents.filter(
          (document) => document.public_asset_path !== null
        ).length,
        reference: "$.model.documents"
      },
      evidence: {
        count: payload.model.evidence.length,
        kind_distribution: countByValue(payload.model.evidence, "kind"),
        availability_distribution: countByValue(
          payload.model.evidence,
          "availability"
        ),
        publish_permission_distribution: countByValue(
          payload.model.evidence,
          "publish_permission"
        ),
        authorized_and_available_count: payload.model.evidence.filter(
          (record) =>
            record.publish_permission === "authorized" &&
            record.availability === "available"
        ).length,
        reference: "$.model.evidence"
      }
    },
    model_coverage: {
      collection_counts: {
        sources: payload.model.sources.length,
        agencies: payload.model.agencies.length,
        projects: payload.model.projects.length,
        typologies: payload.model.typologies.length,
        observations: payload.model.observations.length,
        facts: facts.length,
        documents: payload.model.documents.length,
        evidence: payload.model.evidence.length,
        issues: payload.model.issues.length,
        events: payload.model.events.length
      },
      sources: {
        type_distribution: countByValue(payload.model.sources, "type"),
        legal_status_distribution: countByValue(
          payload.model.sources,
          "legal_status"
        ),
        access_mode_distribution: countByValue(
          payload.model.sources,
          "access_mode"
        )
      },
      observations: {
        extraction_method_distribution: countByValue(
          payload.model.observations,
          "extraction_method"
        ),
        with_evidence_ids_count: payload.model.observations.filter(
          (observation) => observation.evidence_ids.length > 0
        ).length,
        without_evidence_ids_count: payload.model.observations.filter(
          (observation) => observation.evidence_ids.length === 0
        ).length
      },
      documents: {
        type_distribution: countByValue(
          payload.model.documents,
          "document_type"
        ),
        availability_distribution: countByValue(
          payload.model.documents,
          "availability"
        ),
        public_asset_path_count: payload.model.documents.filter(
          (document) => document.public_asset_path !== null
        ).length
      },
      evidence: {
        kind_distribution: countByValue(payload.model.evidence, "kind"),
        availability_distribution: countByValue(
          payload.model.evidence,
          "availability"
        ),
        authorized_and_available_count: payload.model.evidence.filter(
          (record) =>
            record.publish_permission === "authorized" &&
            record.availability === "available"
        ).length
      }
    },
    analytical_quality_and_exclusions: {
      facts: {
        count: facts.length,
        quality_status_distribution: countByValue(facts, "quality_status"),
        value_kind_distribution: countByValue(facts, "value_kind"),
        benchmark_eligibility: {
          eligible: eligibleFacts.length,
          excluded: excludedFacts.length
        },
        eligible_by_quality_status: countByValue(
          eligibleFacts,
          "quality_status"
        ),
        eligible_by_value_kind: countByValue(eligibleFacts, "value_kind"),
        eligible_by_semantic_type: countByValue(
          eligibleFacts,
          "semantic_type"
        ),
        excluded_by_quality_status: countByValue(
          excludedFacts,
          "quality_status"
        ),
        excluded_by_value_kind: countByValue(excludedFacts, "value_kind"),
        excluded_by_semantic_type: countByValue(
          excludedFacts,
          "semantic_type"
        )
      },
      currency: {
        legacy_projection: countByValue(payload.projects, "currency"),
        model_monetary_facts: {
          count: monetaryFacts.length,
          currency_distribution: countByValue(monetaryFacts, "currency"),
          eligible: monetaryFacts.filter((fact) => fact.benchmark_eligible)
            .length,
          excluded: monetaryFacts.filter((fact) => !fact.benchmark_eligible)
            .length
        }
      },
      issues: {
        count: payload.model.issues.length,
        benchmark_blocking_count: payload.model.issues.filter(
          (issue) => issue.benchmark_blocking
        ).length,
        quality_status_distribution: countByValue(
          payload.model.issues,
          "quality_status"
        ),
        issue_code_distribution: countByValue(
          payload.model.issues,
          "issue_code"
        )
      },
      events: {
        count: payload.model.events.length,
        quality_status_distribution: countByValue(
          payload.model.events,
          "quality_status"
        ),
        cause_present_count: payload.model.events.filter(
          (event) => event.cause !== null
        ).length,
        cause_evidence_link_count: payload.model.events.reduce(
          (total, event) => total + event.cause_evidence_ids.length,
          0
        )
      }
    },
    fixture_coverage: [
      {
        case_id: "CT-A",
        source_path: "datos_relevantes/demo-pilot/fixtures/ct-a.json",
        purpose:
          "Separate built, total and derived free area and calculate scenario price per compatible denominator.",
        model_result: {
          fact_count: facts.filter((fact) => fact.fact_id.startsWith("fact:ct-a-"))
            .length,
          certified_eligible_area_fact_count: facts.filter(
            (fact) =>
              fact.fact_id.startsWith("fact:ct-a-") &&
              fact.semantic_type === "area" &&
              fact.benchmark_eligible
          ).length
        }
      },
      {
        case_id: "CT-B",
        source_path: "datos_relevantes/demo-pilot/fixtures/ct-b.json",
        purpose:
          "Preserve conflicting observed list prices without choosing a winner.",
        model_result: {
          fact_count: facts.filter((fact) => fact.fact_id.startsWith("fact:ct-b-"))
            .length,
          benchmark_eligible_fact_count: facts.filter(
            (fact) =>
              fact.fact_id.startsWith("fact:ct-b-") &&
              fact.benchmark_eligible
          ).length
        }
      },
      {
        case_id: "CT-D",
        source_path: "datos_relevantes/demo-pilot/fixtures/ct-d.json",
        purpose:
          "Distinguish evidenced, unobserved and restricted qualitative attributes.",
        model_result: {
          fact_count: facts.filter((fact) => fact.fact_id.startsWith("fact:ct-d-"))
            .length,
          authorized_available_evidence_count: payload.model.evidence.filter(
            (record) =>
              record.evidence_id.startsWith("evidence:ct-d-") &&
              record.publish_permission === "authorized" &&
              record.availability === "available"
          ).length
        }
      },
      {
        case_id: "CT-E",
        source_path: "datos_relevantes/demo-pilot/fixtures/ct-e.json",
        purpose: "Materialize deterministic history without inventing causes.",
        model_result: {
          fact_count: facts.filter((fact) => fact.fact_id.startsWith("fact:ct-e-"))
            .length,
          event_count: payload.model.events.length
        }
      },
      {
        case_id: "CT-G",
        source_path: "datos_relevantes/demo-pilot/fixtures/ct-g.json",
        purpose:
          "Preserve the Pardo Coast Tipo 7 card and plan as incompatible observations.",
        model_result: {
          fact_count: facts.filter((fact) =>
            fact.fact_id.startsWith("fact:pardo-coast-")
          ).length,
          benchmark_eligible_fact_count: facts.filter(
            (fact) =>
              fact.fact_id.startsWith("fact:pardo-coast-") &&
              fact.benchmark_eligible
          ).length,
          public_original_asset_count: payload.inspector.assets.filter(
            (asset) => asset.document_id.startsWith("document:pardo-coast-")
          ).length
        }
      },
      {
        case_id: "CT-H",
        source_path: "datos_relevantes/demo-pilot/fixtures/ct-h.json",
        purpose:
          "Demonstrate stable canonical IDs, conservative aliases and tiered pilot coverage.",
        model_result: {
          selected_agency_count: payload.pilot.agency_ids.length,
          cumulative_base_count: payload.pilot.counts.base_count,
          cumulative_enriched_count: payload.pilot.counts.enriched_count,
          cumulative_deep_count: payload.pilot.counts.deep_count,
          manual_review_alias_count: payload.model.agencyAliases.filter(
            (alias) => alias.resolution === "manual_review"
          ).length
        }
      }
    ],
    geography_coverage: {
      public_artifact: {
        path: "prototipo_ejecutable/public/demo-data/district-boundaries.geojson",
        sha256: geoJsonSha256,
        byte_length: geoJsonBytes,
        crs: payload.geography.crs,
        feature_count: payload.geography.districts.length,
        simplification_tolerance_degrees: 0,
        maximum_displacement_meters: 0,
        area_change_pct_max: 0
      },
      high_load_observed_project_count: payload.geography.assignments.length,
      coordinate_valid_project_count: payload.geography.assignments.filter(
        (assignment) => assignment.coordinate_valid
      ).length,
      polygon_valid_project_count: payload.geography.assignments.filter(
        (assignment) => assignment.polygon_valid
      ).length,
      outside_district_polygon_count: payload.geography.assignments.filter(
        (assignment) =>
          assignment.coordinate_valid && !assignment.polygon_valid
      ).length,
      authoritative_project_count: payload.geography.assignments.filter(
        (assignment) => assignment.authoritative_project_id !== null
      ).length,
      unreconciled_project_count: payload.geography.assignments.filter(
        (assignment) => assignment.authoritative_project_id === null
      ).length,
      miraflores_gate: {
        district_id: miraflores.district_id,
        observed_project_count: miraflores.observed_project_count,
        coordinate_valid_count: miraflores.coordinate_valid_count,
        polygon_valid_count: miraflores.polygon_valid_count,
        authoritative_project_count: miraflores.authoritative_project_count,
        unreconciled_project_count: miraflores.unreconciled_project_count,
        quadrant_observed_counts: Object.fromEntries(
          miraflores.quadrants.map((quadrant) => [
            quadrant.quadrant_id,
            quadrant.observed_project_ids.length
          ])
        )
      },
      references: [
        "$.geography",
        "$.geography.districts",
        "$.geography.assignments",
        "$.geography.exclusions",
        "datos_relevantes/geography/source-manifest.json#/derived"
      ]
    },
    phase_gaps: [
      {
        gap_id: "GAP-F4-BENCHMARK",
        target_phase: "F4",
        severity: "blocking_for_phase",
        current_evidence: {
          benchmark_eligible_fact_count: eligibleFacts.length,
          benchmark_eligible_price_fact_count: eligibleFacts.filter(
            (fact) => fact.semantic_type === "price"
          ).length,
          benchmark_eligible_price_per_m2_fact_count: eligibleFacts.filter(
            (fact) => fact.semantic_type === "price_per_m2"
          ).length,
          price_per_m2_fact_count: facts.filter(
            (fact) => fact.semantic_type === "price_per_m2"
          ).length,
          legacy_unknown_currency_project_count: payload.projects.filter(
            (project) => project.currency === "unknown"
          ).length
        },
        required_outcome:
          "Materialize market price and compatible area facts for the selected geography, grouped by currency, price type and denominator.",
        references: [
          "$.model.facts",
          "$.projects[*].currency",
          "fact:ct-a-price-per-built-m2",
          "fact:ct-a-price-per-total-m2"
        ]
      },
      {
        gap_id: "GAP-F5-HISTORY-ASSISTANT",
        target_phase: "F5",
        severity: "blocking_for_phase",
        current_evidence: {
          event_count: payload.model.events.length,
          certified_event_count: certifiedEvents.length,
          reviewable_event_count: reviewableEvents.length,
          event_with_observed_cause_count: payload.model.events.filter(
            (event) => event.cause !== null
          ).length,
          event_with_cause_evidence_count: payload.model.events.filter(
            (event) => event.cause_evidence_ids.length > 0
          ).length
        },
        required_outcome:
          "Expand dated observations beyond CT-E and resolve assistant answers against selected certified facts and evidence IDs.",
        references: [
          "$.model.events",
          "$.model.observations",
          "$.assistant.questions"
        ]
      }
    ],
    publication_safety: {
      is_public_source_artifact: payload.metadata.publication.is_public_artifact,
      source_pii_present: payload.metadata.publication.contains_contact_pii,
      source_raw_records_present:
        payload.metadata.publication.raw_payloads_included,
      restricted_assets_included:
        payload.metadata.publication.restricted_assets_included,
      report_pii_present: false,
      report_raw_records_present: false,
      report_local_paths_present: false
    }
  };
}

export function serializeCoverageReport(report) {
  return `${JSON.stringify(report, null, 2)}\n`;
}

function assertOutputDoesNotOverwriteInput(
  repositoryRoot,
  outputPath,
  inputPaths = REQUIRED_INPUT_PATHS
) {
  const resolvedOutput = path.resolve(outputPath);
  const inputPathSet = new Set(
    inputPaths.map((logicalPath) =>
      path.resolve(logicalAbsolutePath(repositoryRoot, logicalPath))
    )
  );
  if (inputPathSet.has(resolvedOutput)) {
    throw new Error(`Output path cannot overwrite an input: ${resolvedOutput}`);
  }
}

export async function buildDemoData({
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  outputPath = undefined,
  geoJsonOutputPath = undefined,
  coverageReportOutputPath = undefined,
  write = true
} = {}) {
  const root = path.resolve(repositoryRoot);
  const target = path.resolve(
    outputPath ??
      path.join(
        root,
        "prototipo_ejecutable",
        "public",
        "demo-data",
        "viva-platform-demo.json"
      )
  );
  const geographyTarget = path.resolve(
    geoJsonOutputPath ??
      path.join(
        root,
        "prototipo_ejecutable",
        "public",
        "demo-data",
        "district-boundaries.geojson"
      )
  );
  const coverageTarget = path.resolve(
    coverageReportOutputPath ??
      path.join(
        root,
        "datos_relevantes",
        "demo-pilot",
        "coverage-report.json"
      )
  );
  const {
    payload,
    geoJsonSerialized,
    geoJsonSha256,
    geoJsonBytes,
    inputPaths
  } = await buildDemoBundle({ repositoryRoot: root });
  assertOutputDoesNotOverwriteInput(root, target, inputPaths);
  assertOutputDoesNotOverwriteInput(root, geographyTarget, inputPaths);
  assertOutputDoesNotOverwriteInput(root, coverageTarget, inputPaths);
  const serialized = serializeDemoPayload(payload);
  const coverageReport = buildCoverageReport(payload, serialized, {
    geoJsonSha256,
    geoJsonBytes
  });
  const coverageReportSerialized = serializeCoverageReport(coverageReport);
  if (write) {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.mkdir(path.dirname(geographyTarget), { recursive: true });
    await fs.mkdir(path.dirname(coverageTarget), { recursive: true });
    await fs.writeFile(target, serialized, "utf8");
    await fs.writeFile(geographyTarget, geoJsonSerialized, "utf8");
    await fs.writeFile(coverageTarget, coverageReportSerialized, "utf8");
  }
  return {
    payload,
    serialized,
    sha256: sha256(serialized),
    outputPath: target,
    geoJsonSerialized,
    geoJsonSha256,
    geoJsonBytes,
    geoJsonOutputPath: geographyTarget,
    coverageReport,
    coverageReportSerialized,
    coverageReportSha256: sha256(coverageReportSerialized),
    coverageReportOutputPath: coverageTarget,
    inputPaths
  };
}

async function main() {
  const result = await buildDemoData();
  console.log(
    `Demo data written: ${path.relative(
      path.join(DEFAULT_REPOSITORY_ROOT, "prototipo_ejecutable"),
      result.outputPath
    )}`
  );
  console.log(`Legacy projects: ${result.payload.projects.length}`);
  console.log(`Model projects: ${result.payload.model.projects.length}`);
  console.log(`SHA-256: ${result.sha256}`);
  console.log(
    `GeoJSON: ${result.geoJsonBytes} bytes, SHA-256 ${result.geoJsonSha256}`
  );
  console.log(
    `Coverage report: ${Buffer.byteLength(
      result.coverageReportSerialized,
      "utf8"
    )} bytes, SHA-256 ${result.coverageReportSha256}`
  );
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
