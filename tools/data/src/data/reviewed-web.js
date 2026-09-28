const REVIEW_POLICY = "demo-reviewed-web-2026-09-23";
const AUTHORIZATION_REFERENCE = "USER-DEMO-CORRECTIONS-MIRAFLORES-JESUS-MARIA-2026-09-23";
const REVIEW_TARGETS = [
  ["3981", "https://cantabriainmobiliaria.pe/proyecto/versia-miraflores", "https://cantabriainmobiliaria.pe/landing-versia/", "demo_reviewed", "project"],
  ["1940", "https://www.grupotoratto.com/departamento/monterosso", "https://www.grupotoratto.com/departamento/monterosso/", "demo_reviewed", "project"],
  ["3391", "https://www.asterhomes.com.pe/proyecto-reducto"],
  ["4146", "https://grattoinmobiliaria.com/proyectos/benavides-1361"],
  ["4157", "https://magbisconstrucciones.com/departamentos/duplex-801-parque-nu", null, "historical_sanitized", "unit"],
  ["4157", "https://magbisconstrucciones.com/departamentos/tipico-2-502-parque-nu", null, "historical_sanitized", "unit"],
  ["3485", "https://brazil.pe/proyecto/alejandria"],
  ["3589", "https://grupomaxx.pe/proyectos/beyond-residencial"],
  ["4174", "https://granadero.com.pe/proyecto/zegarra-920"],
].map(([projectId, originalUrl, sourceUrl, status = "historical_sanitized", scope = "project"]) => ({
  projectId, originalUrl, sourceUrl: sourceUrl ?? originalUrl, status, scope,
}));
const TARGET_BY_KEY = new Map(REVIEW_TARGETS.map((target) => [`${target.projectId}|${target.originalUrl}`, target]));
const ALLOWED_FIELDS = new Set([
  "project_name", "address", "typology", "bedrooms", "bedrooms_min", "bedrooms_max",
  "total_area", "total_area_min", "total_area_max", "unit_status", "unit_count",
  "list_price_avg", "currency", "delivery_date", "delivery_year", "description",
  "amenities", "financing_banks", "room_description",
]);
const NUMERIC_FIELDS = new Set([
  "bedrooms_min", "bedrooms_max", "total_area_min", "total_area_max", "unit_count", "list_price_avg", "delivery_year",
]);
const ARRAY_FIELDS = new Set(["amenities", "financing_banks"]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isTimestamp(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/u.test(value) && Number.isFinite(Date.parse(value));
}

function validateFields(fields) {
  for (const [field, value] of Object.entries(fields)) {
    if (!ALLOWED_FIELDS.has(field)) throw new Error(`Unexpected reviewed-web field: ${field}`);
    if (value === null) continue;
    if (NUMERIC_FIELDS.has(field)) {
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        throw new Error(`Invalid reviewed-web numeric field: ${field}`);
      }
    } else if (ARRAY_FIELDS.has(field)) {
      if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
        throw new Error(`Invalid reviewed-web list field: ${field}`);
      }
    } else if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Invalid reviewed-web text field: ${field}`);
    }
  }
  for (const [minimum, maximum] of [["total_area_min", "total_area_max"], ["bedrooms_min", "bedrooms_max"]]) {
    if (fields[minimum] != null && fields[maximum] != null && fields[minimum] > fields[maximum]) {
      throw new Error(`Inverted reviewed-web range: ${minimum}`);
    }
  }
  if (fields.list_price_avg != null || fields.unit_count != null
    || (fields.currency != null && fields.currency !== "unknown")) {
    throw new Error("This demo review does not establish website prices or available stock");
  }
}

/** A reviewed, field-allowlisted demo edition, never a staging/pilot importer. */
export function applyReviewedWebObservations(observations, matches, review) {
  if (!isRecord(review) || review.policy !== REVIEW_POLICY || review.purpose !== "controlled_demo"
    || review.productionCollectionAuthorized !== false || !Array.isArray(review.entries)
    || review.authorizationReference !== AUTHORIZATION_REFERENCE || !isTimestamp(review.reviewedAt)) {
    throw new Error("Invalid reviewed-web demo policy");
  }
  if (!Array.isArray(observations) || !Array.isArray(matches)) throw new Error("Missing reviewed-web input data");
  const nextObservations = structuredClone(observations);
  const nextMatches = structuredClone(matches);
  const seen = new Set();
  for (const entry of review.entries) {
    if (!isRecord(entry)) throw new Error("Invalid reviewed-web entry");
    const key = `${entry.projectId}|${entry.originalUrl}`;
    const target = TARGET_BY_KEY.get(key);
    if (!target || seen.has(key) || entry.status !== target.status || entry.scope !== target.scope
      || !/^[a-f0-9]{64}$/u.test(entry.evidenceSha256 ?? "")
      || !isRecord(entry.fields) || !Array.isArray(entry.notes) || !entry.notes.length
      || entry.notes.some((note) => typeof note !== "string" || !note.trim())
      || !Array.isArray(entry.withheldFields)) {
      throw new Error(`Invalid reviewed-web entry: ${key}`);
    }
    seen.add(key);
    const matched = nextMatches.filter((match) => String(match.nexo_project_id) === entry.projectId
      && match.web_project_url === entry.originalUrl && match.match_class === "match_high"
      && match.requires_human_review === false);
    if (!matched.length) throw new Error(`Reviewed-web project match not found: ${key}`);
    const observation = nextObservations.filter((row) => row.source_url === entry.originalUrl)
      .sort((a, b) => String(b.captured_at).localeCompare(String(a.captured_at)))[0];
    if (!observation) throw new Error(`Reviewed-web original observation not found: ${key}`);
    const sourceUrl = new URL(entry.sourceUrl ?? entry.originalUrl);
    if (sourceUrl.protocol !== "https:" || sourceUrl.username || sourceUrl.password
      || sourceUrl.hostname !== new URL(entry.originalUrl).hostname || sourceUrl.href !== target.sourceUrl) {
      throw new Error(`Reviewed-web source must retain the official HTTPS host: ${key}`);
    }
    validateFields(entry.fields);
    for (const field of entry.withheldFields) {
      if (!ALLOWED_FIELDS.has(field)) throw new Error(`Unexpected withheld field: ${field}`);
    }
    // Never mix a September extraction with fields from an older June page.
    if (entry.status === "demo_reviewed") {
      if (!isTimestamp(entry.capturedAt) || Date.parse(entry.capturedAt) > Date.parse(review.reviewedAt)) {
        throw new Error(`Missing capture date: ${key}`);
      }
      for (const field of ALLOWED_FIELDS) observation[field] = null;
      observation.captured_at = entry.capturedAt;
      observation.extraction_method = "reviewed_demo_observation";
      observation.field_confidence = null;
    }
    Object.assign(observation, structuredClone(entry.fields));
    for (const field of entry.withheldFields) observation[field] = null;
    if (observation.list_price_avg != null || observation.unit_count != null) {
      throw new Error("This demo review does not establish website prices or available stock");
    }
    observation.source_url = sourceUrl.href;
    observation.scope = entry.scope;
    observation.review = {
      policy: REVIEW_POLICY, status: entry.status, reviewedAt: review.reviewedAt,
      notes: [...entry.notes], withheldFields: [...entry.withheldFields],
      evidenceSha256: entry.evidenceSha256,
    };
    for (const match of matched) {
      match.web_project_url = sourceUrl.href;
      match.domain = sourceUrl.hostname.replace(/^www\./u, "");
    }
  }
  if (seen.size !== TARGET_BY_KEY.size) throw new Error("Incomplete reviewed-web coverage: expected 8 projects and 9 source URLs");
  return { observations: nextObservations, matches: nextMatches };
}
