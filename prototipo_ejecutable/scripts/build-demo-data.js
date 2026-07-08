import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.resolve(ROOT, "..", "datos_relevantes");
const PUBLIC_DEMO_DIR = path.join(ROOT, "public", "demo-data");
const OUTPUT_PATH = path.join(PUBLIC_DEMO_DIR, "viva-platform-demo.json");

const CRITICAL_FIELDS = [
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
  "delivery_year",
];

async function main() {
  const projects = normalizeProjects(await readCsv(path.join(DATA_DIR, "viva_minimum_dataset_latest.csv")));
  const scope = normalizeScope(await readCsv(path.join(DATA_DIR, "service_scope_matrix.csv")));
  const matching = normalizeMatching(await readCsv(path.join(DATA_DIR, "nexo_web_project_match.csv")));
  const coverageRows = await readCsv(path.join(DATA_DIR, "webs_propias_source_field_feasibility.csv"));
  const quality = await readJson(path.join(DATA_DIR, "data_quality_latest.json"), {});
  const assistant = await readJson(path.join(DATA_DIR, "assistant_validation_latest.json"), {});

  const payload = {
    metadata: buildMetadata(projects, scope, matching, coverageRows, quality, assistant),
    executive: buildExecutive(projects),
    rankings: {
      districts: aggregateProjects(projects, "district").slice(0, 18),
      agencies: aggregateProjects(projects, "agency_name").slice(0, 18),
      typologies: aggregateProjects(projects, "typology").slice(0, 12),
      phases: aggregateProjects(projects, "project_phase").slice(0, 12),
    },
    projects,
    sourceScope: scope,
    scopeSummary: buildScopeSummary(scope),
    matching: {
      summary: countBy(matching, "match_class"),
      rows: matching,
    },
    coverage: buildCoverage(coverageRows),
    quality: normalizeQuality(quality),
    assistant: normalizeAssistant(assistant),
    pipeline: buildPipeline(),
    deployment: {
      mode: "static_mock_plus_local_backend",
      github_pages_ready: true,
      local_api_endpoints: [
        "/api/demo/platform",
        "/api/dashboard/latest",
        "/api/runs/latest",
      ],
      static_data_path: "demo-data/viva-platform-demo.json",
    },
  };

  await fs.mkdir(PUBLIC_DEMO_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Demo data written: ${path.relative(ROOT, OUTPUT_PATH)}`);
  console.log(`Projects: ${projects.length}`);
  console.log(`Sources: ${scope.length}`);
  console.log(`Matching rows: ${matching.length}`);
  console.log(`Coverage rows: ${coverageRows.length}`);
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function readCsv(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).filter((row) => row.some(Boolean)).map((row) => {
    const out = {};
    headers.forEach((header, index) => {
      out[header] = row[index] ?? "";
    });
    return out;
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function normalizeProjects(rows) {
  return rows.map((row, index) => {
    const listPrice = number(row.list_price_avg || row.price_min);
    const area = number(row.total_area || row.total_area_min || row.area_min);
    const unitCount = number(row.unit_count);
    const latestHistory = number(row.latest_price_history_from);
    const delta = listPrice !== null && latestHistory !== null ? listPrice - latestHistory : null;
    const deltaPct = delta !== null && latestHistory ? (delta / latestHistory) * 100 : null;
    return {
      id: row.project_id || `project_${index + 1}`,
      source: clean(row.source),
      source_type: clean(row.source_type),
      captured_at: row.captured_at,
      source_url: row.source_url,
      extraction_method: clean(row.extraction_method),
      agency_name: clean(row.agency_name) || "Sin inmobiliaria",
      project_name: clean(row.project_name) || "Sin proyecto",
      district: clean(row.district) || "Sin distrito",
      province: clean(row.province) || "Lima",
      department: clean(row.department) || "Lima",
      address: clean(row.address),
      latitude: number(row.latitude),
      longitude: number(row.longitude),
      project_phase: clean(row.project_phase || row.unit_status) || "Sin estado",
      typology: clean(row.typology) || "Sin tipologia",
      bedrooms: clean(row.bedrooms),
      bedrooms_min: number(row.bedrooms_min),
      bedrooms_max: number(row.bedrooms_max),
      total_area_min: number(row.total_area_min || row.area_min),
      total_area_max: number(row.total_area_max || row.area_max),
      total_area: area,
      unit_status: clean(row.unit_status),
      unit_count: unitCount,
      currency: clean(row.currency || "PEN"),
      list_price_avg: listPrice,
      price_min: number(row.price_min),
      price_per_m2_list: number(row.price_per_m2_list),
      latest_price_history_from: latestHistory,
      latest_price_history_date: row.latest_price_history_date,
      price_delta: delta === null ? null : round(delta, 2),
      price_delta_pct: deltaPct === null ? null : round(deltaPct, 2),
      delivery_year: number(row.delivery_year),
      delivery_date: row.delivery_date,
      update_date: row.update_date,
      income: number(row.income) ?? ((unitCount ?? 0) * (listPrice ?? 0)),
      total_m2: number(row.total_m2) ?? ((unitCount ?? 0) * (area ?? 0)),
      financing_banks: splitList(row.financing_banks),
      amenities: splitList(row.amenities),
      project_description: clean(row.project_description),
      project_contact: clean(row.project_contact),
      project_email: clean(row.project_email),
      project_phone: clean(row.project_phone),
      project_whatsapp: clean(row.project_whatsapp),
      field_confidence: clean(row.field_confidence || "media"),
      missing_required_fields: splitList(row.missing_required_fields, ","),
    };
  });
}

function normalizeScope(rows) {
  return rows.map((row) => ({
    run_id: row.run_id,
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
    next_action: clean(row.next_action),
  }));
}

function normalizeMatching(rows) {
  return rows.map((row) => ({
    run_id: row.run_id,
    agency_name: clean(row.agency_name),
    domain: clean(row.domain),
    web_project_url: row.web_project_url,
    web_project_name: clean(row.web_project_name),
    nexo_project_id: row.nexo_project_id,
    nexo_project_name: clean(row.nexo_project_name),
    match_score: number(row.match_score) ?? 0,
    match_class: clean(row.match_class || "sin_clase"),
    matched_on_agency: boolean(row.matched_on_agency),
    matched_on_project_name: boolean(row.matched_on_project_name),
    matched_on_district: boolean(row.matched_on_district),
    matched_on_address: boolean(row.matched_on_address),
    matched_on_coordinates: boolean(row.matched_on_coordinates),
    matched_on_slug: boolean(row.matched_on_slug),
    justification: clean(row.justification),
    requires_human_review: boolean(row.requires_human_review),
  }));
}

function buildMetadata(projects, scope, matching, coverageRows, quality, assistant) {
  const captured = projects.map((project) => project.captured_at).filter(Boolean).sort();
  return {
    generated_at: new Date().toISOString(),
    title: "Viva Inmobiliaria - Prototipo de Inteligencia Comercial",
    description: "Snapshot demo generado desde scrapers y matrices reales del PoC.",
    source_snapshot: {
      min_captured_at: captured[0] ?? null,
      max_captured_at: captured[captured.length - 1] ?? null,
      assistant_dataset_run_id: assistant?.metadata?.dataset_run_id ?? null,
    },
    counts: {
      projects: projects.length,
      agencies_in_market: new Set(projects.map((project) => project.agency_name)).size,
      districts: new Set(projects.map((project) => project.district)).size,
      evaluated_sources: scope.length,
      matching_rows: matching.length,
      coverage_rows: coverageRows.length,
      quality_issues: quality?.issues?.length ?? 0,
    },
  };
}

function buildExecutive(projects) {
  const activeProjects = new Set(projects.map((project) => projectKey(project))).size;
  const publishedUnits = sum(projects, "unit_count");
  const estimatedIncome = sum(projects, "income");
  const totalM2 = sum(projects, "total_m2");
  return {
    active_projects: activeProjects,
    published_units: round(publishedUnits, 0),
    estimated_income: round(estimatedIncome, 2),
    total_m2: round(totalM2, 2),
    avg_price_m2_list: round(avg(projects, "price_per_m2_list"), 2),
    avg_list_price: round(avg(projects, "list_price_avg"), 2),
    districts: new Set(projects.map((project) => project.district).filter(Boolean)).size,
    agencies: new Set(projects.map((project) => project.agency_name).filter(Boolean)).size,
    latest_price_changes: projects
      .filter((project) => project.price_delta_pct !== null)
      .sort((left, right) => Math.abs(right.price_delta_pct) - Math.abs(left.price_delta_pct))
      .slice(0, 15),
  };
}

function aggregateProjects(projects, field) {
  const groups = new Map();
  for (const project of projects) {
    const key = project[field] || "Sin dato";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(project);
  }
  return [...groups.entries()].map(([name, rows]) => ({
    name,
    projects: new Set(rows.map((project) => projectKey(project))).size,
    units: round(sum(rows, "unit_count"), 0),
    estimated_income: round(sum(rows, "income"), 2),
    total_m2: round(sum(rows, "total_m2"), 2),
    avg_price_m2_list: round(avg(rows, "price_per_m2_list"), 2),
    avg_list_price: round(avg(rows, "list_price_avg"), 2),
  })).sort((left, right) => right.projects - left.projects || right.units - left.units || left.name.localeCompare(right.name));
}

function buildScopeSummary(scope) {
  const mvp = scope.filter((row) => row.scope_level === "MVP automatizable");
  return {
    by_scope_level: countBy(scope, "scope_level"),
    by_final_decision: countBy(scope, "final_decision"),
    by_archetype: countBy(scope, "archetype_primary"),
    mvp_automatizable: mvp.sort((left, right) => right.viability_score - left.viability_score),
    conditioned: scope.filter((row) => row.scope_level === "MVP condicionado / enriquecimiento"),
    out_of_scope: scope.filter((row) => row.scope_level === "Fuera de alcance"),
    backlog: scope.filter((row) => row.scope_level === "Backlog posterior"),
  };
}

function buildCoverage(rows) {
  const byField = new Map();
  const byAgency = new Map();
  for (const row of rows) {
    addGrouped(byField, row.field_name, row);
    addGrouped(byAgency, row.agency_name, row);
  }
  return {
    fields: [...byField.entries()].map(([field, fieldRows]) => ({
      field_name: field,
      records_sampled: round(avg(fieldRows, "records_sampled"), 0),
      field_coverage_pct: round(avg(fieldRows, "field_coverage_pct"), 0),
      evidence_available_pct: round(avg(fieldRows, "evidence_available_pct"), 0),
      mismatch_rate_vs_nexo: round(avg(fieldRows, "mismatch_rate_vs_nexo"), 2),
      recommended_use: topValue(fieldRows, "recommended_use"),
      is_critical: CRITICAL_FIELDS.includes(field),
    })).sort((left, right) => Number(right.is_critical) - Number(left.is_critical) || right.field_coverage_pct - left.field_coverage_pct),
    agencies: [...byAgency.entries()].map(([agency, agencyRows]) => ({
      agency_name: agency,
      domain: clean(agencyRows[0]?.domain),
      archetype_primary: clean(agencyRows[0]?.archetype_primary),
      fields: agencyRows.length,
      avg_coverage_pct: round(avg(agencyRows, "field_coverage_pct"), 0),
      avg_evidence_pct: round(avg(agencyRows, "evidence_available_pct"), 0),
      primary_candidate_fields: agencyRows.filter((row) => row.recommended_use === "primary_candidate").length,
      review_fields: agencyRows.filter((row) => String(row.recommended_use).includes("review")).length,
    })).sort((left, right) => right.avg_coverage_pct - left.avg_coverage_pct),
    raw_sample: rows.slice(0, 240),
  };
}

function normalizeQuality(quality) {
  return {
    record_count: quality.record_count ?? null,
    critical_completeness_pct: quality.critical_completeness_pct ?? {},
    duplicate_candidates: quality.duplicate_candidates ?? [],
    outliers: quality.outliers ?? [],
    issues: quality.issues ?? [],
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
      pass_rate: rows.length ? rows.filter((row) => row.passed).length / rows.length : 0,
    },
    questions: rows.map((row) => ({
      id: row.id,
      question: clean(row.question),
      passed: Boolean(row.passed),
      elapsed_ms: row.elapsed_ms,
      guardrails: clean(row.guardrails),
      acceptance: clean(row.acceptance),
      answer: row.answer ?? null,
    })),
  };
}

function buildPipeline() {
  return [
    {
      id: "ingesta-nexo",
      label: "Ingesta Nexo",
      status: "operativo",
      detail: "Fuente base canonica para proyectos, precios publicados, unidades, areas y trazabilidad.",
      artifacts: ["viva_minimum_dataset_latest.csv", "multisource_sample_latest.json"],
    },
    {
      id: "webs-propias",
      label: "Discovery webs propias",
      status: "validado",
      detail: "Auditoria por dominio, robots, sitemap, stack tecnico y arquetipo.",
      artifacts: ["agency_web_discovery_matrix_validated.csv"],
    },
    {
      id: "extraccion-muestra",
      label: "Extraccion de muestra",
      status: "validado",
      detail: "Muestras trazables por arquetipo para estimar cobertura real por campo.",
      artifacts: ["webs_propias_sample_dataset.csv", "webs_propias_field_evidence.csv"],
    },
    {
      id: "matching",
      label: "Matching Nexo-web",
      status: "validado",
      detail: "Score por proyecto usando inmobiliaria, nombre, distrito, direccion, coordenadas y slug.",
      artifacts: ["nexo_web_project_match.csv"],
    },
    {
      id: "calidad",
      label: "Calidad y cobertura",
      status: "validado",
      detail: "Completitud critica, duplicados, outliers y decision de uso por campo.",
      artifacts: ["data_quality_latest.json", "webs_propias_source_field_feasibility.csv"],
    },
    {
      id: "dashboard",
      label: "Dashboard y asistente",
      status: "prototipo",
      detail: "Experiencia visual read-only para decisiones comerciales y preguntas controladas.",
      artifacts: ["viva-platform-demo.json", "assistant_validation_latest.json"],
    },
  ];
}

function addGrouped(map, key, row) {
  const safeKey = clean(key) || "Sin dato";
  if (!map.has(safeKey)) map.set(safeKey, []);
  map.get(safeKey).push(row);
}

function countBy(rows, field) {
  return [...rows.reduce((map, row) => {
    const key = clean(row[field]) || "Sin dato";
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map()).entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

function topValue(rows, field) {
  return countBy(rows, field)[0]?.name ?? null;
}

function projectKey(project) {
  return [project.agency_name, project.project_name, project.district].filter(Boolean).join("|");
}

function splitList(value, separator = "|") {
  return String(value ?? "")
    .split(separator)
    .map((item) => clean(item))
    .filter(Boolean);
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function boolean(value) {
  return ["true", "1", "yes", "si", "sí"].includes(String(value ?? "").trim().toLowerCase());
}

function number(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace("%", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + (number(row[field]) ?? 0), 0);
}

function avg(rows, field) {
  const values = rows.map((row) => number(row[field])).filter((value) => value !== null);
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
