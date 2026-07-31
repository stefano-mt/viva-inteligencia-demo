import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_SCHEMA_PATH = resolve(
  SCRIPT_DIRECTORY,
  "../../contracts/demo-v2.schema.json"
);

const DEFINITION_BY_COLLECTION = Object.freeze({
  sources: "source",
  agencies: "agency",
  agencyAliases: "agencyAlias",
  agency_aliases: "agencyAlias",
  projects: "project",
  typologies: "typology",
  observations: "observation",
  facts: "fact",
  documents: "document",
  evidence: "evidence",
  issues: "issue",
  events: "event"
});

const ID_FIELD_BY_COLLECTION = Object.freeze({
  sources: "source_id",
  agencies: "agency_id",
  projects: "project_id",
  typologies: "typology_id",
  observations: "observation_id",
  facts: "fact_id",
  documents: "document_id",
  evidence: "evidence_id",
  issues: "issue_id",
  events: "event_id"
});

const COLLECTION_BY_ENTITY_TYPE = Object.freeze({
  agency: "agencies",
  project: "projects",
  typology: "typologies",
  document: "documents",
  observation: "observations",
  fact: "facts",
  event: "events"
});

const BAD_QUALITY = new Set(["inconsistent", "illegible", "insufficient"]);
const SUPPORTED_FORMATS = new Set(["date-time", "uri"]);
const FORBIDDEN_KEY =
  /(?:^|_)(?:contact|contacto|email|e_mail|phone|telefono|teléfono|whatsapp|payload|raw_payload|rawpayload)(?:_|$)/i;
const POLICY_KEYS = new Set(["contains_contact_pii", "raw_payloads_included"]);
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const WINDOWS_ABSOLUTE_PATH =
  /(?:^|[\s"'(])(?:[A-Za-z]:[\\/]|(?:\\\\|\/\/)[^\\/\s]+[\\/][^\\/\s]+)/;
const POSIX_ABSOLUTE_PATH = /(?:^|[\s"'(])\/(?!\/|\s)[^\s]+/;
const FILE_URI = /\bfile:\/\//i;
const TRAVERSAL = /(?:^|[\\/])\.\.(?:[\\/]|$)/;
const MOBILE_PHONE = /(?:\+?51[\s().-]*)?9(?:[\s().-]*\d){8}/;
const INTERNATIONAL_PHONE = /\+\d(?:[\s().-]*\d){6,14}/;
const FIXED_PHONE =
  /(?:^|[^\d])(?:(?:\(?0?\d{1,3}\)?[\s().-]+)\d{3,4}[\s.-]+\d{3,4}|[2-8]\d{2,3}[\s.]+\d{3,4})(?:[^\d]|$)/;
const ID_PATTERN = /^[a-z][a-z0-9_-]*:[a-z0-9][a-z0-9._-]*$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const RFC3339_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-](\d{2}):(\d{2}))$/;

export const SUPPORTED_SCHEMA_KEYWORDS = Object.freeze([
  "$schema",
  "$id",
  "$defs",
  "$ref",
  "title",
  "description",
  "type",
  "required",
  "properties",
  "additionalProperties",
  "items",
  "minItems",
  "maxItems",
  "uniqueItems",
  "minLength",
  "pattern",
  "format",
  "enum",
  "const",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "oneOf",
  "anyOf",
  "allOf",
  "not",
  "if",
  "then",
  "else"
]);

let cachedSchema;

export function assertSupportedSchema(schema) {
  const supported = new Set(SUPPORTED_SCHEMA_KEYWORDS);
  function visit(node, path) {
    if (typeof node === "boolean" || !node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (!supported.has(key)) {
        throw new Error(`Unsupported JSON Schema keyword at ${path}: ${key}`);
      }
      if (key === "format" && !SUPPORTED_FORMATS.has(value)) {
        throw new Error(`Unsupported JSON Schema format at ${path}: ${value}`);
      }
      if (key === "properties" || key === "$defs") {
        for (const [childKey, childSchema] of Object.entries(value)) {
          visit(childSchema, `${path}.${key}.${childKey}`);
        }
      } else if (["oneOf", "anyOf", "allOf"].includes(key)) {
        value.forEach((child, index) => visit(child, `${path}.${key}[${index}]`));
      } else if (
        ["items", "additionalProperties", "not", "if", "then", "else"].includes(key)
      ) {
        visit(value, `${path}.${key}`);
      }
    }
  }
  visit(schema, "$");
}

function isStrictRfc3339DateTime(value) {
  const match = RFC3339_DATE_TIME.exec(value);
  if (!match) return false;
  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
    ,
    zone,
    offsetHourText,
    offsetMinuteText
  ] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (
    month < 1 ||
    month > 12 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return false;
  }
  const leapYear =
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysByMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31
  ];
  if (day < 1 || day > daysByMonth[month - 1]) {
    return false;
  }
  if (
    zone !== "Z" &&
    (Number(offsetHourText) > 23 || Number(offsetMinuteText) > 59)
  ) {
    return false;
  }
  return !Number.isNaN(Date.parse(value));
}

export function loadContractSchema(schemaPath = DEFAULT_SCHEMA_PATH) {
  if (schemaPath === DEFAULT_SCHEMA_PATH && cachedSchema) return cachedSchema;
  if (!existsSync(schemaPath)) throw new Error(`Contract schema not found: ${schemaPath}`);
  let schema;
  try {
    schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  } catch (error) {
    throw new Error(
      `Contract schema is invalid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  assertSupportedSchema(schema);
  if (schemaPath === DEFAULT_SCHEMA_PATH) cachedSchema = schema;
  return schema;
}

export function validationError(code, path, message) {
  return { code, path, message };
}

function compareErrors(left, right) {
  const a = `${left.path}\u0000${left.code}\u0000${left.message}`;
  const b = `${right.path}\u0000${right.code}\u0000${right.message}`;
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function stableErrors(errors) {
  const unique = new Map();
  for (const error of errors) {
    unique.set(`${error.code}\u0000${error.path}\u0000${error.message}`, error);
  }
  return [...unique.values()].sort(compareErrors);
}

function typeMatches(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object")
    return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === type;
}

function equalJson(left, right) {
  function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.keys(value)
          .sort(compareText)
          .map((key) => [key, canonicalize(value[key])])
      );
    }
    return value;
  }
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function resolveReference(rootSchema, reference) {
  if (!reference.startsWith("#/")) throw new Error(`Unsupported schema reference: ${reference}`);
  let value = rootSchema;
  for (const rawPart of reference.slice(2).split("/")) {
    const part = rawPart.replace(/~1/g, "/").replace(/~0/g, "~");
    value = value?.[part];
  }
  if (value === undefined) throw new Error(`Unresolved schema reference: ${reference}`);
  return value;
}

function matchesSchema(value, schema, context) {
  return collectShapeErrors(value, schema, context).length === 0;
}

// Shape validation intentionally implements every JSON Schema keyword used by
// demo-v2.schema.json. Cross-record rules belong to validateModelSemantics.
function collectShapeErrors(value, schema, context) {
  if (typeof schema === "boolean") {
    return schema
      ? []
      : [validationError("SCHEMA_FALSE", context.path, "Value is forbidden")];
  }
  if (!schema || typeof schema !== "object") return [];
  if (schema.$ref) {
    return collectShapeErrors(
      value,
      resolveReference(context.rootSchema, schema.$ref),
      context
    );
  }

  const errors = [];
  if (schema.allOf) {
    for (const branch of schema.allOf) {
      errors.push(...collectShapeErrors(value, branch, context));
    }
  }
  if (
    schema.anyOf &&
    !schema.anyOf.some((branch) => matchesSchema(value, branch, context))
  ) {
    errors.push(
      validationError("SCHEMA_ANY_OF", context.path, "Value matches no anyOf branch")
    );
  }
  if (schema.oneOf) {
    const matchCount = schema.oneOf.filter((branch) =>
      matchesSchema(value, branch, context)
    ).length;
    if (matchCount !== 1) {
      errors.push(
        validationError(
          "SCHEMA_ONE_OF",
          context.path,
          `Value must match exactly one branch; matched ${matchCount}`
        )
      );
    }
  }
  if (schema.not && matchesSchema(value, schema.not, context)) {
    errors.push(validationError("SCHEMA_NOT", context.path, "Value matches forbidden shape"));
  }
  if (schema.if) {
    const branch = matchesSchema(value, schema.if, context) ? schema.then : schema.else;
    if (branch) errors.push(...collectShapeErrors(value, branch, context));
  }

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => typeMatches(value, type))) {
      errors.push(
        validationError(
          "SCHEMA_TYPE",
          context.path,
          `Expected ${types.join("|")}`
        )
      );
      return errors;
    }
  }
  if (Object.hasOwn(schema, "const") && !equalJson(value, schema.const)) {
    errors.push(
      validationError(
        "SCHEMA_CONST",
        context.path,
        `Expected constant ${JSON.stringify(schema.const)}`
      )
    );
  }
  if (schema.enum && !schema.enum.some((candidate) => equalJson(value, candidate))) {
    errors.push(
      validationError("SCHEMA_ENUM", context.path, "Value is outside the allowed enum")
    );
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(
        validationError("SCHEMA_MIN_LENGTH", context.path, "String is too short")
      );
    }
    if (schema.pattern && !new RegExp(schema.pattern, "u").test(value)) {
      errors.push(
        validationError("SCHEMA_PATTERN", context.path, "String does not match pattern")
      );
    }
    if (schema.format === "date-time" && !isStrictRfc3339DateTime(value)) {
      errors.push(
        validationError("SCHEMA_FORMAT_DATE_TIME", context.path, "Invalid date-time")
      );
    }
    if (schema.format === "uri") {
      try {
        new URL(value);
      } catch {
        errors.push(validationError("SCHEMA_FORMAT_URI", context.path, "Invalid URI"));
      }
    }
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(validationError("SCHEMA_MINIMUM", context.path, "Number is too small"));
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(validationError("SCHEMA_MAXIMUM", context.path, "Number is too large"));
    }
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
      errors.push(
        validationError("SCHEMA_EXCLUSIVE_MINIMUM", context.path, "Number is not above minimum")
      );
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(validationError("SCHEMA_MIN_ITEMS", context.path, "Array is too short"));
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(validationError("SCHEMA_MAX_ITEMS", context.path, "Array is too long"));
    }
    if (
      schema.uniqueItems &&
      new Set(value.map((item) => JSON.stringify(item))).size !== value.length
    ) {
      errors.push(
        validationError("SCHEMA_UNIQUE_ITEMS", context.path, "Array items must be unique")
      );
    }
    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(
          ...collectShapeErrors(item, schema.items, {
            ...context,
            path: `${context.path}[${index}]`
          })
        );
      });
    }
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const required of schema.required ?? []) {
      if (!Object.hasOwn(value, required)) {
        errors.push(
          validationError(
            "SCHEMA_REQUIRED",
            `${context.path}.${required}`,
            "Required property is missing"
          )
        );
      }
    }
    for (const [key, propertySchema] of Object.entries(schema.properties ?? {})) {
      if (Object.hasOwn(value, key)) {
        errors.push(
          ...collectShapeErrors(value[key], propertySchema, {
            ...context,
            path: `${context.path}.${key}`
          })
        );
      }
    }
    const known = new Set(Object.keys(schema.properties ?? {}));
    for (const key of Object.keys(value)) {
      if (known.has(key)) continue;
      if (schema.additionalProperties === false) {
        errors.push(
          validationError(
            "SCHEMA_ADDITIONAL_PROPERTY",
            `${context.path}.${key}`,
            "Additional property is not allowed"
          )
        );
      } else if (
        schema.additionalProperties &&
        typeof schema.additionalProperties === "object"
      ) {
        errors.push(
          ...collectShapeErrors(value[key], schema.additionalProperties, {
            ...context,
            path: `${context.path}.${key}`
          })
        );
      }
    }
  }
  return errors;
}

export function validateSchemaShape(
  value,
  schema,
  { rootSchema = loadContractSchema(), path = "$" } = {}
) {
  assertSupportedSchema(rootSchema);
  if (schema && typeof schema === "object") assertSupportedSchema(schema);
  const fragment =
    typeof schema === "string" ? rootSchema.$defs?.[schema] : schema ?? rootSchema;
  if (!fragment) {
    return [
      validationError("SCHEMA_DEFINITION_MISSING", path, `Unknown definition ${schema}`)
    ];
  }
  return stableErrors(collectShapeErrors(value, fragment, { rootSchema, path }));
}

export function validateEntityCatalog(
  collectionName,
  records,
  { schema = loadContractSchema(), path = `$${"."}${collectionName}` } = {}
) {
  assertSupportedSchema(schema);
  const definition = DEFINITION_BY_COLLECTION[collectionName];
  if (!definition) {
    return [
      validationError(
        "CATALOG_UNKNOWN",
        path,
        `No contract definition for collection ${collectionName}`
      )
    ];
  }
  if (!Array.isArray(records)) {
    return [validationError("CATALOG_TYPE", path, "Catalog must be an array")];
  }
  return stableErrors(
    records.flatMap((record, index) =>
      validateSchemaShape(record, definition, {
        rootSchema: schema,
        path: `${path}[${index}]`
      })
    )
  );
}

function collection(model, canonicalName) {
  if (canonicalName === "agencyAliases") {
    if (Array.isArray(model?.agencyAliases)) return model.agencyAliases;
    if (Array.isArray(model?.agency_aliases)) return model.agency_aliases;
    return undefined;
  }
  return Array.isArray(model?.[canonicalName]) ? model[canonicalName] : undefined;
}

function hasCollection(model, canonicalName) {
  return collection(model, canonicalName) !== undefined;
}

function mapBy(records, idField) {
  return new Map((records ?? []).map((record) => [record[idField], record]));
}

function push(errors, code, path, message) {
  errors.push(validationError(code, path, message));
}

function validateUnique(model, basePath, errors) {
  for (const [name, idField] of Object.entries(ID_FIELD_BY_COLLECTION)) {
    const records = collection(model, name);
    if (!records) continue;
    const seen = new Set();
    records.forEach((record, index) => {
      const id = record?.[idField];
      if (seen.has(id)) {
        push(errors, "DUPLICATE_ID", `${basePath}.${name}[${index}].${idField}`, `Duplicate ${id}`);
      }
      seen.add(id);
    });
  }
  const aliases = collection(model, "agencyAliases");
  if (aliases) {
    const seen = new Set();
    aliases.forEach((alias, index) => {
      if (seen.has(alias.alias_normalized)) {
        push(
          errors,
          "DUPLICATE_ALIAS",
          `${basePath}.agencyAliases[${index}].alias_normalized`,
          `Duplicate normalized alias ${alias.alias_normalized}`
        );
      }
      seen.add(alias.alias_normalized);
    });
  }
}

function checkReference(errors, map, id, path, label) {
  if (id !== null && id !== undefined && !map.has(id)) {
    push(errors, "REFERENCE_MISSING", path, `${label} ${id} does not exist`);
  }
}

function entityMaps(model) {
  return {
    agency: mapBy(collection(model, "agencies"), "agency_id"),
    project: mapBy(collection(model, "projects"), "project_id"),
    typology: mapBy(collection(model, "typologies"), "typology_id"),
    document: mapBy(collection(model, "documents"), "document_id"),
    observation: mapBy(collection(model, "observations"), "observation_id"),
    fact: mapBy(collection(model, "facts"), "fact_id"),
    event: mapBy(collection(model, "events"), "event_id")
  };
}

function validateReferences(model, basePath, errors) {
  const sources = mapBy(collection(model, "sources"), "source_id");
  const agencies = mapBy(collection(model, "agencies"), "agency_id");
  const projects = mapBy(collection(model, "projects"), "project_id");
  const observations = mapBy(collection(model, "observations"), "observation_id");
  const facts = mapBy(collection(model, "facts"), "fact_id");
  const documents = mapBy(collection(model, "documents"), "document_id");
  const evidence = mapBy(collection(model, "evidence"), "evidence_id");
  const entities = entityMaps(model);

  collection(model, "agencyAliases")?.forEach((alias, index) => {
    if (hasCollection(model, "agencies")) {
      checkReference(errors, agencies, alias.agency_id, `${basePath}.agencyAliases[${index}].agency_id`, "Agency");
    }
    if (hasCollection(model, "evidence")) {
      alias.evidence_ids?.forEach((id, evidenceIndex) =>
        checkReference(errors, evidence, id, `${basePath}.agencyAliases[${index}].evidence_ids[${evidenceIndex}]`, "Evidence")
      );
    }
    if (alias.resolution !== "manual_review" && alias.agency_id === null) {
      push(errors, "ALIAS_UNRESOLVED", `${basePath}.agencyAliases[${index}].agency_id`, "Resolved alias needs an agency");
    }
  });
  collection(model, "projects")?.forEach((project, index) => {
    if (hasCollection(model, "agencies")) checkReference(errors, agencies, project.agency_id, `${basePath}.projects[${index}].agency_id`, "Agency");
  });
  collection(model, "typologies")?.forEach((typology, index) => {
    if (hasCollection(model, "projects")) checkReference(errors, projects, typology.project_id, `${basePath}.typologies[${index}].project_id`, "Project");
  });
  collection(model, "observations")?.forEach((observation, index) => {
    if (hasCollection(model, "sources")) checkReference(errors, sources, observation.source_id, `${basePath}.observations[${index}].source_id`, "Source");
    const target = entities[observation.entity_type];
    if (
      target &&
      hasCollection(
        model,
        COLLECTION_BY_ENTITY_TYPE[observation.entity_type]
      )
    ) {
      checkReference(errors, target, observation.entity_id, `${basePath}.observations[${index}].entity_id`, "Entity");
    }
    if (hasCollection(model, "evidence")) {
      observation.evidence_ids?.forEach((id, evidenceIndex) =>
        checkReference(errors, evidence, id, `${basePath}.observations[${index}].evidence_ids[${evidenceIndex}]`, "Evidence")
      );
    }
  });
  collection(model, "facts")?.forEach((fact, index) => {
    if (hasCollection(model, "observations")) checkReference(errors, observations, fact.observation_id, `${basePath}.facts[${index}].observation_id`, "Observation");
    for (const [inputIndex, id] of (fact.derivation?.input_fact_ids ?? []).entries()) {
      checkReference(errors, facts, id, `${basePath}.facts[${index}].derivation.input_fact_ids[${inputIndex}]`, "Fact");
    }
  });
  collection(model, "documents")?.forEach((document, index) => {
    if (hasCollection(model, "sources")) checkReference(errors, sources, document.source_id, `${basePath}.documents[${index}].source_id`, "Source");
  });
  collection(model, "evidence")?.forEach((record, index) => {
    if (hasCollection(model, "observations")) checkReference(errors, observations, record.observation_id, `${basePath}.evidence[${index}].observation_id`, "Observation");
    if (hasCollection(model, "documents")) checkReference(errors, documents, record.document_id, `${basePath}.evidence[${index}].document_id`, "Document");
  });
  collection(model, "issues")?.forEach((issue, index) => {
    if (hasCollection(model, "facts")) {
      issue.fact_ids?.forEach((id, factIndex) =>
        checkReference(errors, facts, id, `${basePath}.issues[${index}].fact_ids[${factIndex}]`, "Fact")
      );
    }
    const target = entities[issue.entity_type];
    if (
      target &&
      hasCollection(model, COLLECTION_BY_ENTITY_TYPE[issue.entity_type])
    ) {
      checkReference(errors, target, issue.entity_id, `${basePath}.issues[${index}].entity_id`, "Entity");
    }
  });
  collection(model, "events")?.forEach((event, index) => {
    if (hasCollection(model, "facts")) {
      for (const field of ["previous_fact_id", "new_fact_id", "percentage_base_fact_id"]) {
        checkReference(errors, facts, event[field], `${basePath}.events[${index}].${field}`, "Fact");
      }
    }
    if (hasCollection(model, "evidence")) {
      event.cause_evidence_ids?.forEach((id, evidenceIndex) =>
        checkReference(errors, evidence, id, `${basePath}.events[${index}].cause_evidence_ids[${evidenceIndex}]`, "Evidence")
      );
    }
  });
}

function validateRanges(model, basePath, errors) {
  collection(model, "projects")?.forEach((project, index) => {
    if (
      project.first_seen_at &&
      project.last_seen_at &&
      Date.parse(project.first_seen_at) > Date.parse(project.last_seen_at)
    ) {
      push(errors, "DATE_RANGE_REVERSED", `${basePath}.projects[${index}].last_seen_at`, "last_seen_at precedes first_seen_at");
    }
  });
  collection(model, "typologies")?.forEach((typology, index) => {
    for (const [minimum, maximum] of [
      ["floor_min", "floor_max"],
      ["bedrooms_min", "bedrooms_max"],
      ["bathrooms_min", "bathrooms_max"]
    ]) {
      if (
        typology[minimum] !== null &&
        typology[maximum] !== null &&
        typology[minimum] > typology[maximum]
      ) {
        push(errors, "RANGE_REVERSED", `${basePath}.typologies[${index}].${maximum}`, `${maximum} is below ${minimum}`);
      }
    }
  });
}

function validateDerivationCycles(factRecords, basePath, errors) {
  const facts = mapBy(factRecords, "fact_id");
  const indexes = new Map(
    (factRecords ?? []).map((fact, index) => [fact.fact_id, index])
  );
  const state = new Map();
  const reported = new Set();

  function visit(factId, stack) {
    const currentState = state.get(factId);
    if (currentState === "done") return;
    if (currentState === "active") {
      const start = stack.indexOf(factId);
      const cycle = [...stack.slice(start), factId];
      const signature = [...new Set(cycle)].sort().join("|");
      if (!reported.has(signature)) {
        reported.add(signature);
        const index = indexes.get(factId);
        push(
          errors,
          "DERIVATION_CYCLE",
          `${basePath}.facts[${index}].derivation.input_fact_ids`,
          `Derived fact cycle: ${cycle.join(" -> ")}`
        );
      }
      return;
    }
    const fact = facts.get(factId);
    if (!fact || fact.value_kind !== "derived") return;
    state.set(factId, "active");
    for (const inputId of fact.derivation?.input_fact_ids ?? []) {
      visit(inputId, [...stack, factId]);
    }
    state.set(factId, "done");
  }

  for (const fact of factRecords ?? []) visit(fact.fact_id, []);
}

function validateFacts(model, basePath, errors) {
  const factRecords = collection(model, "facts");
  const facts = mapBy(factRecords, "fact_id");
  const observations = mapBy(collection(model, "observations"), "observation_id");
  validateDerivationCycles(factRecords, basePath, errors);
  factRecords?.forEach((fact, index) => {
    const path = `${basePath}.facts[${index}]`;
    if (fact.value_kind === "simulated" && fact.benchmark_eligible) {
      push(errors, "SIMULATED_ELIGIBLE", `${path}.benchmark_eligible`, "Simulated fact cannot enter market benchmark");
    }
    if (BAD_QUALITY.has(fact.quality_status) && fact.benchmark_eligible) {
      push(errors, "BAD_QUALITY_ELIGIBLE", `${path}.benchmark_eligible`, "Bad-quality fact cannot be eligible");
    }
    if (fact.benchmark_eligible === false && !(typeof fact.exclusion_reason === "string" && fact.exclusion_reason.length)) {
      push(errors, "EXCLUSION_REASON_MISSING", `${path}.exclusion_reason`, "Ineligible fact needs a reason");
    }
    if (fact.semantic_type === "price" && fact.currency && fact.unit !== fact.currency) {
      push(errors, "FACT_CURRENCY_UNIT_MISMATCH", `${path}.unit`, `Price unit ${fact.unit} differs from ${fact.currency}`);
    }
    if (
      fact.semantic_type === "price_per_m2" &&
      fact.currency &&
      fact.unit !== `${fact.currency}/m2`
    ) {
      push(errors, "FACT_CURRENCY_UNIT_MISMATCH", `${path}.unit`, `Price/m2 unit differs from ${fact.currency}`);
    }
    if (
      fact.semantic_type === "attribute" &&
      fact.original_value === null &&
      fact.normalized_value === false
    ) {
      push(errors, "UNKNOWN_NOT_FALSE", `${path}.normalized_value`, "Absent attribute must be unknown, not false");
    }
    if (fact.value_kind === "observed" && observations.size) {
      const observation = observations.get(fact.observation_id);
      if (observation && observation.evidence_status !== "available" && !observation.evidence_absence_reason) {
        push(errors, "OBSERVED_EVIDENCE_UNEXPLAINED", `${path}.observation_id`, "Observed fact lacks evidence or absence reason");
      }
    }
    if (fact.value_kind === "derived") {
      const inputs = (fact.derivation?.input_fact_ids ?? []).map((id) => facts.get(id)).filter(Boolean);
      if (
        fact.benchmark_eligible &&
        inputs.some(
          (input) =>
            !input.benchmark_eligible ||
            input.value_kind === "simulated" ||
            BAD_QUALITY.has(input.quality_status)
        )
      ) {
        push(errors, "DERIVED_INPUT_INELIGIBLE", `${path}.benchmark_eligible`, "Derived fact does not inherit input ineligibility");
      }
      const monetary = inputs.filter((input) =>
        ["price", "price_per_m2"].includes(input.semantic_type)
      );
      const currencies = new Set(monetary.map((input) => input.currency).filter(Boolean));
      if (currencies.size > 1) {
        push(errors, "DERIVED_CURRENCY_MISMATCH", `${path}.derivation.input_fact_ids`, "Derived fact mixes currencies");
      }
      if (
        ["price", "price_per_m2"].includes(fact.semantic_type) &&
        currencies.size === 1 &&
        !currencies.has(fact.currency)
      ) {
        push(errors, "DERIVED_OUTPUT_CURRENCY_MISMATCH", `${path}.currency`, "Derived output currency differs from its monetary inputs");
      }
      const priceTypes = new Set(
        monetary.map((input) => input.price_type).filter(Boolean)
      );
      if (
        ["price", "price_per_m2"].includes(fact.semantic_type) &&
        priceTypes.size === 1 &&
        !priceTypes.has(fact.price_type)
      ) {
        push(errors, "DERIVED_OUTPUT_PRICE_TYPE_MISMATCH", `${path}.price_type`, "Derived output price type differs from its monetary inputs");
      }
      const sameSemanticInputs = inputs.filter(
        (input) => input.semantic_type === fact.semantic_type
      );
      const sameSemanticUnits = new Set(
        sameSemanticInputs.map((input) => input.unit)
      );
      if (
        sameSemanticInputs.length > 0 &&
        sameSemanticUnits.size === 1 &&
        !sameSemanticUnits.has(fact.unit)
      ) {
        push(errors, "DERIVED_OUTPUT_UNIT_MISMATCH", `${path}.unit`, "Derived output unit differs from compatible inputs");
      }
      if (fact.semantic_type === "price_per_m2") {
        const denominator = inputs.find(
          (input) =>
            input.semantic_type === "area" &&
            input.area_type === fact.denominator_area_type
        );
        if (!denominator) {
          push(errors, "PRICE_PER_M2_DENOMINATOR_MISSING", `${path}.denominator_area_type`, "No input area matches denominator");
        }
        const price = inputs.find(
          (input) =>
            input.semantic_type === "price" && input.currency === fact.currency
        );
        if (!price) {
          push(errors, "PRICE_PER_M2_PRICE_MISSING", `${path}.currency`, "No input price matches currency");
        } else {
          if (fact.price_type !== price.price_type) {
            push(errors, "DERIVED_OUTPUT_PRICE_TYPE_MISMATCH", `${path}.price_type`, "Price/m2 output must preserve the input price type");
          }
          if (fact.unit !== `${price.currency}/m2`) {
            push(errors, "DERIVED_OUTPUT_UNIT_MISMATCH", `${path}.unit`, "Price/m2 output unit must match input currency");
          }
        }
      }
    }
  });
}

function validatePermissions(model, basePath, errors, options) {
  const documents = mapBy(collection(model, "documents"), "document_id");
  const observations = mapBy(
    collection(model, "observations"),
    "observation_id"
  );
  const evidence = mapBy(collection(model, "evidence"), "evidence_id");
  collection(model, "documents")?.forEach((document, index) => {
    const path = `${basePath}.documents[${index}]`;
    if (
      document.public_asset_path !== null &&
      (document.publish_permission !== "authorized" || document.availability !== "available")
    ) {
      push(errors, "RESTRICTED_ASSET_EXPOSED", `${path}.public_asset_path`, "Asset is not authorized and available");
    }
    if (document.public_asset_path) {
      if (typeof options.assetExists !== "function") {
        push(errors, "ASSET_CHECK_REQUIRED", `${path}.public_asset_path`, "Published asset requires an existence checker");
      } else if (!options.assetExists(document.public_asset_path)) {
        push(errors, "ASSET_NOT_FOUND", `${path}.public_asset_path`, "Published asset does not exist");
      }
    }
  });
  collection(model, "evidence")?.forEach((record, index) => {
    const path = `${basePath}.evidence[${index}]`;
    const document = documents.get(record.document_id);
    const observation = observations.get(record.observation_id);
    if (
      record.fragment !== null &&
      (record.publish_permission !== "authorized" ||
        record.availability !== "available")
    ) {
      push(errors, "RESTRICTED_FRAGMENT_EXPOSED", `${path}.fragment`, "Fragment is not authorized and available");
    }
    if (
      record.fragment !== null &&
      hasCollection(model, "documents") &&
      !document
    ) {
      push(errors, "EVIDENCE_FRAGMENT_DOCUMENT_REQUIRED", `${path}.document_id`, "Published fragment requires its document");
    }
    if (document) {
      if (
        record.publish_permission === "authorized" &&
        document.publish_permission !== "authorized"
      ) {
        push(errors, "EVIDENCE_DOCUMENT_PERMISSION_MISMATCH", `${path}.publish_permission`, "Evidence cannot be more public than its document");
      }
      if (
        record.availability === "available" &&
        document.availability !== "available"
      ) {
        push(errors, "EVIDENCE_DOCUMENT_AVAILABILITY_MISMATCH", `${path}.availability`, "Evidence cannot be more available than its document");
      }
      if (record.sha256 !== document.sha256) {
        push(errors, "EVIDENCE_DOCUMENT_SHA_MISMATCH", `${path}.sha256`, "Evidence and document hashes must match");
      }
      if (observation && observation.source_id !== document.source_id) {
        push(errors, "EVIDENCE_SOURCE_OWNER_MISMATCH", `${path}.document_id`, "Evidence observation and document must share a source");
      }
      if (
        observation?.entity_type === "document" &&
        observation.entity_id !== document.document_id
      ) {
        push(errors, "EVIDENCE_DOCUMENT_OWNER_MISMATCH", `${path}.document_id`, "Document observation points to a different document");
      }
      if (
        record.fragment !== null &&
        (document.publish_permission !== "authorized" ||
          document.availability !== "available" ||
          record.sha256 !== document.sha256)
      ) {
        push(errors, "EVIDENCE_FRAGMENT_DOCUMENT_RESTRICTED", `${path}.fragment`, "Fragment requires authorized, available, hash-matched evidence and document");
      }
    }
    if (
      observation &&
      !observation.evidence_ids.includes(record.evidence_id)
    ) {
      push(errors, "EVIDENCE_OBSERVATION_OWNER_MISMATCH", `${path}.observation_id`, "Observation does not own this evidence record");
    }
  });
  collection(model, "observations")?.forEach((observation, index) => {
    observation.evidence_ids?.forEach((evidenceId, evidenceIndex) => {
      const record = evidence.get(evidenceId);
      if (record && record.observation_id !== observation.observation_id) {
        push(
          errors,
          "OBSERVATION_EVIDENCE_OWNER_MISMATCH",
          `${basePath}.observations[${index}].evidence_ids[${evidenceIndex}]`,
          "Evidence belongs to a different observation"
        );
      }
    });
  });
}

function roundHalfUp(value, digits = 2) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(digits) ||
    digits < 0 ||
    digits > 8
  ) {
    return null;
  }
  const factor = 10 ** digits;
  const magnitude = Math.abs(value) * factor;
  if (!Number.isFinite(magnitude)) return null;
  const roundedMagnitude = Math.floor(
    magnitude + 0.5 + Number.EPSILON * Math.max(1, magnitude)
  );
  const result = (Math.sign(value) * roundedMagnitude) / factor;
  return Number.isFinite(result) ? result : null;
}

function validateEvents(model, basePath, errors) {
  const facts = mapBy(collection(model, "facts"), "fact_id");
  const observations = mapBy(collection(model, "observations"), "observation_id");
  const issues = collection(model, "issues");
  collection(model, "events")?.forEach((event, index) => {
    const path = `${basePath}.events[${index}]`;
    const previous = facts.get(event.previous_fact_id);
    const next = facts.get(event.new_fact_id);
    if (!previous || !next) return;
    for (const field of ["entity_id", "field_name", "semantic_type", "unit", "currency", "price_type", "area_type", "denominator_area_type"]) {
      if (previous[field] !== next[field]) {
        push(errors, `EVENT_${field.toUpperCase()}_MISMATCH`, path, `Event inputs differ on ${field}`);
      }
    }
    if (event.field_name !== previous.field_name) {
      push(errors, "EVENT_FIELD_NAME_MISMATCH", `${path}.field_name`, "Event field differs from facts");
    }
    if (event.entity_id !== previous.entity_id) {
      push(errors, "EVENT_ENTITY_MISMATCH", `${path}.entity_id`, "Event entity differs from facts");
    }
    if (event.percentage_base_fact_id !== previous.fact_id) {
      push(errors, "EVENT_PERCENTAGE_BASE_MISMATCH", `${path}.percentage_base_fact_id`, "Percentage base must be the previous fact");
    }
    let requiresReview =
      previous.quality_status !== "certified" ||
      next.quality_status !== "certified" ||
      previous.benchmark_eligible !== true ||
      next.benchmark_eligible !== true;
    if (typeof previous.normalized_value === "number" && typeof next.normalized_value === "number") {
      const delta = next.normalized_value - previous.normalized_value;
      if (event.delta !== delta) push(errors, "EVENT_DELTA_MISMATCH", `${path}.delta`, `Expected ${delta}`);
      const percentage = previous.normalized_value === 0 ? null : roundHalfUp((delta / previous.normalized_value) * 100);
      if (event.percentage !== percentage) push(errors, "EVENT_PERCENTAGE_MISMATCH", `${path}.percentage`, `Expected ${percentage}`);
      if (previous.normalized_value === 0 && issues && !issues.some((issue) => issue.entity_id === event.event_id && issue.issue_code === "PERCENT_BASE_ZERO")) {
        push(errors, "EVENT_ZERO_BASE_ISSUE_MISSING", path, "Zero base needs PERCENT_BASE_ZERO");
      }
      if (percentage !== null && Math.abs(percentage) > 50 && issues && !issues.some((issue) => issue.entity_id === event.event_id && issue.issue_code === "EXTREME_CHANGE_REVIEW")) {
        push(errors, "EVENT_EXTREME_ISSUE_MISSING", path, "Extreme change needs review issue");
      }
      requiresReview =
        requiresReview ||
        previous.normalized_value === 0 ||
        (percentage !== null && Math.abs(percentage) > 50);
    }
    const previousObservation = observations.get(previous.observation_id);
    const nextObservation = observations.get(next.observation_id);
    if (
      previousObservation &&
      nextObservation &&
      Date.parse(previousObservation.captured_at) >= Date.parse(nextObservation.captured_at)
    ) {
      push(errors, "EVENT_OBSERVATION_ORDER", path, "Previous observation must precede new observation");
    }
    if (nextObservation && event.observed_at !== nextObservation.captured_at) {
      push(errors, "EVENT_OBSERVED_AT_MISMATCH", `${path}.observed_at`, "observed_at must match new observation");
    }
    if (nextObservation && event.effective_at !== nextObservation.captured_at) {
      push(errors, "EVENT_EFFECTIVE_AT_MISMATCH", `${path}.effective_at`, "effective_at must match new observation");
    }
    if (requiresReview && event.quality_status === "certified") {
      push(errors, "EVENT_QUALITY_TOO_HIGH", `${path}.quality_status`, "Event quality cannot exceed its inputs or review conditions");
    }
    if (event.cause !== null && event.cause_evidence_ids.length === 0) {
      push(errors, "EVENT_CAUSE_EVIDENCE_MISSING", `${path}.cause_evidence_ids`, "Cause needs evidence");
    }
  });
}

function validateIssues(model, basePath, errors) {
  const facts = mapBy(collection(model, "facts"), "fact_id");
  collection(model, "issues")?.forEach((issue, index) => {
    if (!issue.benchmark_blocking) return;
    issue.fact_ids.forEach((id) => {
      const fact = facts.get(id);
      if (fact?.benchmark_eligible) {
        push(errors, "BLOCKING_ISSUE_ELIGIBLE_FACT", `${basePath}.issues[${index}].fact_ids`, `${id} remains eligible`);
      }
    });
  });
}

function validatePilot(model, pilot, basePath, errors) {
  if (!pilot || !hasCollection(model, "agencies")) return;
  const agencies = collection(model, "agencies");
  const selected = agencies.filter((agency) => agency.pilot_selected);
  const selectedIds = new Set(selected.map((agency) => agency.agency_id));
  const pilotIds = new Set(pilot.agency_ids);
  if (
    selectedIds.size !== pilotIds.size ||
    [...selectedIds].some((id) => !pilotIds.has(id))
  ) {
    push(errors, "PILOT_AGENCY_SET_MISMATCH", `${basePath}.pilot.agency_ids`, "Pilot IDs differ from selected agencies");
  }
  const actual = {
    base_count: selected.length,
    enriched_count: selected.filter((agency) => ["enriched", "deep"].includes(agency.coverage_tier)).length,
    deep_count: selected.filter((agency) => agency.coverage_tier === "deep").length
  };
  for (const [field, value] of Object.entries(actual)) {
    if (pilot.counts[field] !== value) {
      push(errors, "PILOT_TIER_COUNT_MISMATCH", `${basePath}.pilot.counts.${field}`, `Expected ${value}`);
    }
  }
}

function validateDeterministicOrder(model, basePath, errors) {
  for (const [name, idField] of Object.entries(ID_FIELD_BY_COLLECTION)) {
    const records = collection(model, name);
    if (!records || name === "events") continue;
    const actual = records.map((record) => record[idField]);
    const expected = [...actual].sort();
    if (actual.some((id, index) => id !== expected[index])) {
      push(errors, "COLLECTION_ORDER", `${basePath}.${name}`, `Collection must be ordered by ${idField}`);
    }
  }
  const aliases = collection(model, "agencyAliases");
  if (aliases) {
    const actual = aliases.map((alias) => alias.alias_normalized);
    const expected = [...actual].sort();
    if (actual.some((id, index) => id !== expected[index])) {
      push(errors, "COLLECTION_ORDER", `${basePath}.agencyAliases`, "Aliases must be ordered by alias_normalized");
    }
  }
  const events = collection(model, "events");
  if (events) {
    const actual = events.map((event) => event.event_id);
    const expected = [...events]
      .sort((left, right) =>
        left.effective_at === right.effective_at
          ? compareText(left.event_id, right.event_id)
          : compareText(left.effective_at, right.effective_at)
      )
      .map((event) => event.event_id);
    if (actual.some((id, index) => id !== expected[index])) {
      push(errors, "EVENT_ORDER", `${basePath}.events`, "Events must be ordered by effective_at then event_id");
    }
  }
}

function isPhoneLike(value) {
  if (
    ID_PATTERN.test(value) ||
    SHA256_PATTERN.test(value) ||
    isStrictRfc3339DateTime(value)
  ) {
    return false;
  }
  return (
    INTERNATIONAL_PHONE.test(value) ||
    MOBILE_PHONE.test(value) ||
    FIXED_PHONE.test(value)
  );
}

function isSafeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function decodedPathVariants(value) {
  const variants = [value];
  let current = value;
  for (let index = 0; index < 3; index += 1) {
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) break;
      variants.push(decoded);
      current = decoded;
    } catch {
      break;
    }
  }
  return variants;
}

function hasPrivatePath(value) {
  return (
    FILE_URI.test(value) ||
    WINDOWS_ABSOLUTE_PATH.test(value) ||
    POSIX_ABSOLUTE_PATH.test(value) ||
    /(?:^|[\\/])(?:AppData|Temp|outputs)[\\/]/i.test(value)
  );
}

export function validatePrivacy(value, path = "$") {
  const errors = [];
  function visit(item, currentPath) {
    if (Array.isArray(item)) {
      item.forEach((entry, index) => visit(entry, `${currentPath}[${index}]`));
      return;
    }
    if (item !== null && typeof item === "object") {
      for (const [key, child] of Object.entries(item)) {
        if (
          FORBIDDEN_KEY.test(key) &&
          !(POLICY_KEYS.has(key) && child === false)
        ) {
          push(errors, "PRIVACY_FORBIDDEN_KEY", `${currentPath}.${key}`, "Contact or raw-payload key is forbidden");
        }
        visit(child, `${currentPath}.${key}`);
      }
      return;
    }
    if (typeof item !== "string") return;
    if (EMAIL.test(item)) push(errors, "PRIVACY_EMAIL", currentPath, "Email-like value is forbidden");
    if (/whats\s*app/i.test(item)) push(errors, "PRIVACY_WHATSAPP", currentPath, "WhatsApp value is forbidden");
    const safeHttpUrl = isSafeHttpUrl(item);
    const pathVariants = decodedPathVariants(item);
    if (!safeHttpUrl && pathVariants.some(hasPrivatePath)) {
      push(errors, "PRIVACY_LOCAL_PATH", currentPath, "Local/output path is forbidden");
    }
    if (!safeHttpUrl && pathVariants.some((value) => TRAVERSAL.test(value))) {
      push(errors, "PRIVACY_PATH_TRAVERSAL", currentPath, "Path traversal is forbidden");
    }
    if (!safeHttpUrl && isPhoneLike(item)) push(errors, "PRIVACY_PHONE", currentPath, "Phone-like value is forbidden");
  }
  visit(value, path);
  return stableErrors(errors);
}

export function validateModelSemantics(
  model,
  {
    path = "$.model",
    pilot = undefined,
    assetExists = undefined,
    requireDeterministicOrder = false
  } = {}
) {
  const errors = [];
  validateUnique(model, path, errors);
  validateReferences(model, path, errors);
  validateRanges(model, path, errors);
  validateFacts(model, path, errors);
  validatePermissions(model, path, errors, { assetExists });
  validateEvents(model, path, errors);
  validateIssues(model, path, errors);
  validatePilot(model, pilot, path.replace(/\.model$/, ""), errors);
  if (requireDeterministicOrder) validateDeterministicOrder(model, path, errors);
  errors.push(...validatePrivacy(model, path));
  return stableErrors(errors);
}

export function validatePartialModel(
  model,
  {
    schema = loadContractSchema(),
    path = "$",
    pilot,
    assetExists,
    requireDeterministicOrder = false
  } = {}
) {
  assertSupportedSchema(schema);
  if (model === null || typeof model !== "object" || Array.isArray(model)) {
    return [validationError("PARTIAL_MODEL_TYPE", path, "Partial model must be an object")];
  }
  const errors = [];
  for (const [name, definition] of Object.entries(DEFINITION_BY_COLLECTION)) {
    if (!Object.hasOwn(model, name)) continue;
    if (!Array.isArray(model[name])) {
      push(errors, "CATALOG_TYPE", `${path}.${name}`, "Catalog must be an array");
      continue;
    }
    model[name].forEach((record, index) => {
      errors.push(
        ...validateSchemaShape(record, definition, {
          rootSchema: schema,
          path: `${path}.${name}[${index}]`
        })
      );
    });
  }
  if (pilot !== undefined) {
    errors.push(
      ...validateSchemaShape(pilot, "pilot", {
        rootSchema: schema,
        path: `${path}.pilot`
      })
    );
  }
  errors.push(
    ...validateModelSemantics(model, {
      path,
      pilot,
      assetExists,
      requireDeterministicOrder
    })
  );
  return stableErrors(errors);
}

function validateRootSemantics(document, errors) {
  const snapshot = document?.metadata?.source_snapshot;
  if (
    snapshot?.min_captured_at &&
    snapshot?.max_captured_at &&
    Date.parse(snapshot.min_captured_at) > Date.parse(snapshot.max_captured_at)
  ) {
    push(errors, "DATE_RANGE_REVERSED", "$.metadata.source_snapshot.max_captured_at", "Snapshot maximum precedes minimum");
  }
  const fingerprintPaths = document?.metadata?.input_fingerprints?.map(
    (fingerprint) => fingerprint.path
  );
  if (
    fingerprintPaths &&
    fingerprintPaths.some(
      (path, index) => path !== [...fingerprintPaths].sort()[index]
    )
  ) {
    push(errors, "INPUT_FINGERPRINT_ORDER", "$.metadata.input_fingerprints", "Fingerprints must be ordered by path");
  }
  const pilotIds = document?.pilot?.agency_ids;
  if (
    pilotIds &&
    pilotIds.some((id, index) => id !== [...pilotIds].sort()[index])
  ) {
    push(errors, "PILOT_AGENCY_ORDER", "$.pilot.agency_ids", "Pilot agency IDs must be ordered");
  }
  document?.projects?.forEach((project, index) => {
    if (
      project.total_area_min !== null &&
      project.total_area_max !== null &&
      project.total_area_min > project.total_area_max
    ) {
      push(errors, "RANGE_REVERSED", `$.projects[${index}].total_area_max`, "Legacy area maximum is below minimum");
    }
  });
}

const INSPECTOR_QUALITY_PRECEDENCE = Object.freeze([
  "inconsistent",
  "illegible",
  "insufficient",
  "reviewable",
  "certified"
]);
const CONTROLLED_REPRESENTATION_PREFIX =
  "Representación controlada para demo; no es el documento original";

function deriveInspectorDecision(inspectorCase, facts, issues) {
  const requiredFacts = inspectorCase.required_fact_ids
    .map((factId) => facts.get(factId))
    .filter(Boolean);
  const requiredFactIds = new Set(inspectorCase.required_fact_ids);
  const blockingIssues = inspectorCase.issue_ids
    .map((issueId) => issues.get(issueId))
    .filter(
      (issue) =>
        issue?.benchmark_blocking === true &&
        issue.fact_ids.some((factId) => requiredFactIds.has(factId))
    );
  const statuses = new Set([
    ...requiredFacts.map((fact) => fact.quality_status),
    ...blockingIssues.map((issue) => issue.quality_status)
  ]);
  const qualityStatus =
    INSPECTOR_QUALITY_PRECEDENCE.find((status) => statuses.has(status)) ??
    "certified";
  return {
    qualityStatus,
    benchmarkEligible:
      qualityStatus === "certified" &&
      requiredFacts.length === inspectorCase.required_fact_ids.length &&
      requiredFacts.every(
        (fact) =>
          fact.quality_status === "certified" &&
          fact.benchmark_eligible === true
      ) &&
      blockingIssues.length === 0
  };
}

export function validateInspectorSemantics(
  inspector,
  model,
  path = "$.inspector"
) {
  const errors = [];
  if (!inspector || !Array.isArray(inspector.cases) || !Array.isArray(inspector.assets)) {
    return errors;
  }
  const cases = inspector.cases;
  const assets = inspector.assets;
  const maps = Object.fromEntries(
    [
      ["sources", "source_id"],
      ["agencies", "agency_id"],
      ["projects", "project_id"],
      ["typologies", "typology_id"],
      ["observations", "observation_id"],
      ["facts", "fact_id"],
      ["documents", "document_id"],
      ["evidence", "evidence_id"],
      ["issues", "issue_id"]
    ].map(([name, idField]) => [name, mapBy(collection(model, name), idField)])
  );
  const caseIds = new Set(cases.map((entry) => entry.case_id));
  if (!caseIds.has(inspector.default_case_id)) {
    push(errors, "INSPECTOR_DEFAULT_CASE_REFERENCE", `${path}.default_case_id`, "Default inspector case is missing");
  }
  for (const [field, idField] of [["cases", "case_id"], ["assets", "asset_id"]]) {
    const ids = inspector[field].map((record) => record[idField]);
    if (new Set(ids).size !== ids.length) {
      push(errors, "INSPECTOR_DUPLICATE_ID", `${path}.${field}`, `${idField} must be unique`);
    }
    const expected = [...ids].sort(compareText);
    if (ids.some((id, index) => id !== expected[index])) {
      push(errors, "INSPECTOR_ORDER", `${path}.${field}`, `${field} must be ordered by ${idField}`);
    }
  }
  const routes = cases.map((entry) => entry.route_slug);
  if (new Set(routes).size !== routes.length) {
    push(errors, "INSPECTOR_ROUTE_DUPLICATE", `${path}.cases`, "Inspector routes must be unique");
  }

  const assetByDocument = new Map();
  const assetPaths = new Set();
  for (const [index, asset] of assets.entries()) {
    const assetPath = `${path}.assets[${index}]`;
    if (assetByDocument.has(asset.document_id)) {
      push(errors, "INSPECTOR_ASSET_DOCUMENT_DUPLICATE", `${assetPath}.document_id`, "Only one asset may represent a document");
    }
    assetByDocument.set(asset.document_id, asset);
    if (assetPaths.has(asset.logical_path)) {
      push(errors, "INSPECTOR_ASSET_PATH_DUPLICATE", `${assetPath}.logical_path`, "Asset paths must be unique");
    }
    assetPaths.add(asset.logical_path);
    const document = maps.documents.get(asset.document_id);
    if (!document) {
      push(errors, "INSPECTOR_ASSET_DOCUMENT_REFERENCE", `${assetPath}.document_id`, "Asset document is missing");
      continue;
    }
    if (document.public_asset_path !== asset.logical_path) {
      push(errors, "INSPECTOR_ASSET_DOCUMENT_PATH", `${assetPath}.logical_path`, "Asset path differs from document");
    }
    if (document.sha256 !== asset.sha256) {
      push(errors, "INSPECTOR_ASSET_DOCUMENT_SHA", `${assetPath}.sha256`, "Asset hash differs from document");
    }
    if (
      document.publish_permission !== "authorized" ||
      document.availability !== "available" ||
      asset.publish_permission !== "authorized" ||
      asset.provenance !== "controlled_original"
    ) {
      push(errors, "INSPECTOR_ASSET_PERMISSION", assetPath, "Inspector asset is not public and controlled");
    }
    const linkedEvidence = collection(model, "evidence").filter(
      (record) => record.document_id === asset.document_id
    );
    if (
      linkedEvidence.length !== 1 ||
      linkedEvidence[0].sha256 !== asset.sha256 ||
      linkedEvidence[0].publish_permission !== "authorized" ||
      linkedEvidence[0].availability !== "available"
    ) {
      push(errors, "INSPECTOR_ASSET_EVIDENCE", assetPath, "Asset needs one public hash-matched image evidence record");
    } else if (
      linkedEvidence[0].kind === "image_region" &&
      (
        typeof linkedEvidence[0].fragment !== "string" ||
        !linkedEvidence[0].fragment.startsWith(
          CONTROLLED_REPRESENTATION_PREFIX
        )
      )
    ) {
      push(errors, "INSPECTOR_ASSET_REPRESENTATION_LABEL", assetPath, "Controlled representation label is missing");
    }
  }

  const caseDocumentIds = new Set(
    cases.flatMap((inspectorCase) => inspectorCase.document_ids)
  );
  for (const [index, asset] of assets.entries()) {
    if (!caseDocumentIds.has(asset.document_id)) {
      push(errors, "INSPECTOR_ASSET_ORPHAN", `${path}.assets[${index}].document_id`, "Asset is not referenced by an inspector case");
    }
  }

  for (const [index, inspectorCase] of cases.entries()) {
    const casePath = `${path}.cases[${index}]`;
    const project = maps.projects.get(inspectorCase.project_id);
    const typology = maps.typologies.get(inspectorCase.typology_id);
    if (!project) {
      push(errors, "INSPECTOR_CASE_PROJECT_REFERENCE", `${casePath}.project_id`, "Case project is missing");
    } else if (!maps.agencies.has(project.agency_id)) {
      push(errors, "INSPECTOR_CASE_AGENCY_REFERENCE", `${casePath}.project_id`, "Case project agency is missing");
    }
    if (!typology || typology.project_id !== inspectorCase.project_id) {
      push(errors, "INSPECTOR_CASE_TYPOLOGY_REFERENCE", `${casePath}.typology_id`, "Case typology does not belong to its project");
    }
    const sourceUsage = new Set();
    for (const sourceId of inspectorCase.source_ids) {
      if (!maps.sources.has(sourceId)) {
        push(errors, "INSPECTOR_CASE_SOURCE_REFERENCE", `${casePath}.source_ids`, `Missing ${sourceId}`);
      }
    }
    for (const observationId of inspectorCase.observation_ids) {
      const observation = maps.observations.get(observationId);
      if (!observation) {
        push(errors, "INSPECTOR_CASE_OBSERVATION_REFERENCE", `${casePath}.observation_ids`, `Missing ${observationId}`);
        continue;
      }
      sourceUsage.add(observation.source_id);
      if (!inspectorCase.source_ids.includes(observation.source_id)) {
        push(errors, "INSPECTOR_CASE_OBSERVATION_SOURCE", `${casePath}.observation_ids`, `${observationId} uses an undeclared source`);
      }
      if (
        ![
          inspectorCase.project_id,
          inspectorCase.typology_id,
          ...inspectorCase.document_ids
        ].includes(observation.entity_id)
      ) {
        push(errors, "INSPECTOR_CASE_OBSERVATION_ENTITY", `${casePath}.observation_ids`, `${observationId} belongs to another entity`);
      }
    }
    for (const factId of inspectorCase.fact_ids) {
      const fact = maps.facts.get(factId);
      if (!fact) {
        push(errors, "INSPECTOR_CASE_FACT_REFERENCE", `${casePath}.fact_ids`, `Missing ${factId}`);
        continue;
      }
      if (!inspectorCase.observation_ids.includes(fact.observation_id)) {
        push(errors, "INSPECTOR_CASE_FACT_OBSERVATION", `${casePath}.fact_ids`, `${factId} belongs to another observation`);
      }
      if (![inspectorCase.project_id, inspectorCase.typology_id].includes(fact.entity_id)) {
        push(errors, "INSPECTOR_CASE_FACT_ENTITY", `${casePath}.fact_ids`, `${factId} belongs to another entity`);
      }
    }
    if (
      inspectorCase.required_fact_ids.some(
        (factId) => !inspectorCase.fact_ids.includes(factId)
      )
    ) {
      push(errors, "INSPECTOR_CASE_REQUIRED_FACT_SUBSET", `${casePath}.required_fact_ids`, "Required facts must be included in fact_ids");
    }
    for (const documentId of inspectorCase.document_ids) {
      const document = maps.documents.get(documentId);
      if (!document) {
        push(errors, "INSPECTOR_CASE_DOCUMENT_REFERENCE", `${casePath}.document_ids`, `Missing ${documentId}`);
        continue;
      }
      sourceUsage.add(document.source_id);
      if (!inspectorCase.source_ids.includes(document.source_id)) {
        push(errors, "INSPECTOR_CASE_DOCUMENT_SOURCE", `${casePath}.document_ids`, `${documentId} uses an undeclared source`);
      }
    }
    for (const evidenceId of inspectorCase.evidence_ids) {
      const evidence = maps.evidence.get(evidenceId);
      if (!evidence) {
        push(errors, "INSPECTOR_CASE_EVIDENCE_REFERENCE", `${casePath}.evidence_ids`, `Missing ${evidenceId}`);
        continue;
      }
      if (!inspectorCase.observation_ids.includes(evidence.observation_id)) {
        push(errors, "INSPECTOR_CASE_EVIDENCE_OBSERVATION", `${casePath}.evidence_ids`, `${evidenceId} belongs to another observation`);
      }
      if (!inspectorCase.document_ids.includes(evidence.document_id)) {
        push(errors, "INSPECTOR_CASE_EVIDENCE_DOCUMENT", `${casePath}.evidence_ids`, `${evidenceId} belongs to another document`);
      }
    }
    if (
      inspectorCase.primary_evidence_id !== null &&
      !inspectorCase.evidence_ids.includes(inspectorCase.primary_evidence_id)
    ) {
      push(errors, "INSPECTOR_CASE_PRIMARY_EVIDENCE", `${casePath}.primary_evidence_id`, "Primary evidence must belong to the case");
    }
    for (const issueId of inspectorCase.issue_ids) {
      const issue = maps.issues.get(issueId);
      if (!issue) {
        push(errors, "INSPECTOR_CASE_ISSUE_REFERENCE", `${casePath}.issue_ids`, `Missing ${issueId}`);
        continue;
      }
      if (issue.entity_id !== inspectorCase.typology_id) {
        push(errors, "INSPECTOR_CASE_ISSUE_ENTITY", `${casePath}.issue_ids`, `${issueId} belongs to another typology`);
      }
      if (issue.fact_ids.some((factId) => !inspectorCase.fact_ids.includes(factId))) {
        push(errors, "INSPECTOR_CASE_ISSUE_FACT", `${casePath}.issue_ids`, `${issueId} references a fact outside the case`);
      }
    }
    if (inspectorCase.source_ids.some((sourceId) => !sourceUsage.has(sourceId))) {
      push(errors, "INSPECTOR_CASE_UNUSED_SOURCE", `${casePath}.source_ids`, "Every declared source must be used");
    }
    const visualCount = inspectorCase.document_ids.filter((documentId) =>
      assetByDocument.has(documentId)
    ).length;
    if (visualCount !== inspectorCase.public_visual_asset_count) {
      push(errors, "INSPECTOR_CASE_VISUAL_COUNT", `${casePath}.public_visual_asset_count`, `Expected ${visualCount}`);
    }
    const decision = deriveInspectorDecision(
      inspectorCase,
      maps.facts,
      maps.issues
    );
    if (decision.qualityStatus !== inspectorCase.expected_quality_status) {
      push(errors, "INSPECTOR_CASE_QUALITY", `${casePath}.expected_quality_status`, `Expected ${decision.qualityStatus}`);
    }
    if (
      decision.benchmarkEligible !==
      inspectorCase.expected_benchmark_eligible
    ) {
      push(errors, "INSPECTOR_CASE_ELIGIBILITY", `${casePath}.expected_benchmark_eligible`, `Expected ${decision.benchmarkEligible}`);
    }
  }

  const derivedCoverage = {
    total_cases: cases.length,
    observed_cases: cases.filter(
      (entry) => entry.provenance_classification === "observed"
    ).length,
    controlled_cases: cases.filter(
      (entry) => entry.provenance_classification === "controlled"
    ).length,
    simulated_cases: cases.filter(
      (entry) => entry.provenance_classification === "simulated"
    ).length,
    inspectable_typologies: new Set(cases.map((entry) => entry.typology_id)).size,
    authorized_visual_assets: assets.filter(
      (asset) =>
        asset.publish_permission === "authorized" &&
        asset.media_type.startsWith("image/")
    ).length
  };
  for (const [field, expected] of Object.entries(derivedCoverage)) {
    if (inspector.coverage?.[field] !== expected) {
      push(errors, "INSPECTOR_COVERAGE_MISMATCH", `${path}.coverage.${field}`, `Expected ${expected}`);
    }
  }
  const declaredVisualCount = cases.reduce(
    (sum, entry) => sum + entry.public_visual_asset_count,
    0
  );
  if (declaredVisualCount !== derivedCoverage.authorized_visual_assets) {
    push(errors, "INSPECTOR_VISUAL_TOTAL", `${path}.cases`, `Expected ${derivedCoverage.authorized_visual_assets} declared visual assets`);
  }
  return stableErrors(errors);
}

function benchmarkProjectForEntity(entityId, typologies) {
  if (typeof entityId !== "string") return undefined;
  if (entityId.startsWith("project:")) return entityId;
  return typologies.get(entityId)?.project_id;
}

export function validateBenchmarkSemantics(
  benchmark,
  model,
  path = "$.benchmark"
) {
  const errors = [];
  if (!benchmark || !model || typeof benchmark !== "object") return errors;
  const factIndex = Array.isArray(benchmark.fact_index)
    ? benchmark.fact_index
    : [];
  const attributeCatalog = Array.isArray(benchmark.attribute_catalog)
    ? benchmark.attribute_catalog
    : [];
  const projects = mapBy(collection(model, "projects"), "project_id");
  const typologies = mapBy(collection(model, "typologies"), "typology_id");
  const observations = mapBy(
    collection(model, "observations"),
    "observation_id"
  );
  const facts = mapBy(collection(model, "facts"), "fact_id");
  const evidence = mapBy(collection(model, "evidence"), "evidence_id");
  const indexedProjects = new Set();
  const sourcePairedProjects = new Set();

  factIndex.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;
    const entryPath = `${path}.fact_index[${index}]`;
    if (indexedProjects.has(entry.project_id)) {
      push(
        errors,
        "BENCHMARK_DUPLICATE_PROJECT_INDEX",
        `${entryPath}.project_id`,
        `Duplicate benchmark project ${entry.project_id}`
      );
    }
    indexedProjects.add(entry.project_id);
    if (!projects.has(entry.project_id)) {
      push(
        errors,
        "BENCHMARK_PROJECT_REFERENCE",
        `${entryPath}.project_id`,
        `Missing ${entry.project_id}`
      );
    }

    const observation = observations.get(entry.observation_id);
    if (!observation) {
      push(
        errors,
        "BENCHMARK_OBSERVATION_REFERENCE",
        `${entryPath}.observation_id`,
        `Missing ${entry.observation_id}`
      );
    } else if (
      benchmarkProjectForEntity(observation.entity_id, typologies) !==
      entry.project_id
    ) {
      push(
        errors,
        "BENCHMARK_OBSERVATION_PROJECT",
        `${entryPath}.observation_id`,
        `${entry.observation_id} belongs to another project`
      );
    }

    const factFields = [
      "total_area_fact_id",
      "published_price_fact_id",
      "price_per_m2_fact_id",
      "reported_unit_count_fact_id",
      "parking_count_fact_id"
    ];
    const factReferences = [
      ...factFields.map((field) => [field, entry[field]]),
      ...(Array.isArray(entry.attribute_fact_ids)
        ? entry.attribute_fact_ids.map((factId, factIndexPosition) => [
            `attribute_fact_ids[${factIndexPosition}]`,
            factId
          ])
        : [])
    ].filter(([, factId]) => factId !== null && factId !== undefined);
    for (const [field, factId] of factReferences) {
      const fact = facts.get(factId);
      if (!fact) {
        push(
          errors,
          "BENCHMARK_FACT_REFERENCE",
          `${entryPath}.${field}`,
          `Missing ${factId}`
        );
      } else if (
        benchmarkProjectForEntity(fact.entity_id, typologies) !==
        entry.project_id
      ) {
        push(
          errors,
          "BENCHMARK_FACT_PROJECT",
          `${entryPath}.${field}`,
          `${factId} belongs to another project`
        );
      }
    }

    const pairingEvidenceIds = Array.isArray(entry.pairing_evidence_ids)
      ? entry.pairing_evidence_ids
      : [];
    pairingEvidenceIds.forEach((evidenceId, evidenceIndex) => {
      const evidenceEntry = evidence.get(evidenceId);
      const evidencePath = `${entryPath}.pairing_evidence_ids[${evidenceIndex}]`;
      if (!evidenceEntry) {
        push(
          errors,
          "BENCHMARK_PAIRING_EVIDENCE_REFERENCE",
          evidencePath,
          `Missing ${evidenceId}`
        );
        return;
      }
      const evidenceObservation = observations.get(
        evidenceEntry.observation_id
      );
      if (
        evidenceObservation &&
        benchmarkProjectForEntity(evidenceObservation.entity_id, typologies) !==
          entry.project_id
      ) {
        push(
          errors,
          "BENCHMARK_PAIRING_EVIDENCE_PROJECT",
          evidencePath,
          `${evidenceId} belongs to another project`
        );
      }
      if (
        entry.pairing_status === "source_paired" &&
        (evidenceEntry.availability !== "available" ||
          evidenceEntry.publish_permission !== "authorized")
      ) {
        push(
          errors,
          "BENCHMARK_SOURCE_PAIRED_EVIDENCE_PERMISSION",
          evidencePath,
          `${evidenceId} is not public and available`
        );
      }
    });

    const pricePerM2 = facts.get(entry.price_per_m2_fact_id);
    const publishedPrice = facts.get(entry.published_price_fact_id);
    const totalArea = facts.get(entry.total_area_fact_id);
    if (entry.pairing_status === "source_paired") {
      sourcePairedProjects.add(entry.project_id);
      if (pairingEvidenceIds.length === 0) {
        push(
          errors,
          "BENCHMARK_SOURCE_PAIRED_EVIDENCE",
          `${entryPath}.pairing_evidence_ids`,
          "source_paired requires pairing evidence"
        );
      }
      if (
        !["offer_id", "typology_id", "native_metric"].includes(
          entry.pairing_basis
        )
      ) {
        push(
          errors,
          "BENCHMARK_SOURCE_PAIRED_BASIS",
          `${entryPath}.pairing_basis`,
          "source_paired requires an offer, typology or native metric basis"
        );
      }
      if (
        !pricePerM2?.benchmark_eligible ||
        pricePerM2?.semantic_type !== "price_per_m2" ||
        pricePerM2?.denominator_area_type !== "total" ||
        pricePerM2?.currency !== "PEN" ||
        pricePerM2?.unit !== "PEN/m2" ||
        !pricePerM2?.derivation?.input_fact_ids?.includes(
          entry.published_price_fact_id
        ) ||
        !pricePerM2?.derivation?.input_fact_ids?.includes(
          entry.total_area_fact_id
        )
      ) {
        push(
          errors,
          "BENCHMARK_SOURCE_PAIRED_PRICE_PER_M2",
          `${entryPath}.price_per_m2_fact_id`,
          "source_paired requires an eligible PEN/total-m2 derivation from the declared facts"
        );
      }
      if (
        !publishedPrice?.benchmark_eligible ||
        publishedPrice?.semantic_type !== "price" ||
        publishedPrice?.price_type !== "from" ||
        publishedPrice?.currency !== "PEN"
      ) {
        push(
          errors,
          "BENCHMARK_SOURCE_PAIRED_PRICE",
          `${entryPath}.published_price_fact_id`,
          "source_paired requires an eligible published from-price in PEN"
        );
      }
      if (
        !totalArea?.benchmark_eligible ||
        totalArea?.semantic_type !== "area" ||
        totalArea?.area_type !== "total" ||
        totalArea?.unit !== "m2"
      ) {
        push(
          errors,
          "BENCHMARK_SOURCE_PAIRED_TOTAL_AREA",
          `${entryPath}.total_area_fact_id`,
          "source_paired requires an eligible total-area fact in m2"
        );
      }
    } else if (pricePerM2?.benchmark_eligible === true) {
      push(
        errors,
        "BENCHMARK_UNPAIRED_ELIGIBLE",
        `${entryPath}.price_per_m2_fact_id`,
        `${entry.pairing_status} cannot reference an eligible price-per-m2 fact`
      );
    }
  });

  const attributeIds = new Set();
  const normalizedLabels = new Set();
  const normalizedTerms = new Map();
  attributeCatalog.forEach((attribute, index) => {
    if (!attribute || typeof attribute !== "object") return;
    const attributePath = `${path}.attribute_catalog[${index}]`;
    if (attributeIds.has(attribute.attribute_id)) {
      push(
        errors,
        "BENCHMARK_ATTRIBUTE_DUPLICATE_ID",
        `${attributePath}.attribute_id`,
        `Duplicate ${attribute.attribute_id}`
      );
    }
    attributeIds.add(attribute.attribute_id);
    const label = String(attribute.normalized_label ?? "")
      .trim()
      .toLocaleLowerCase("es");
    if (normalizedLabels.has(label)) {
      push(
        errors,
        "BENCHMARK_ATTRIBUTE_DUPLICATE_LABEL",
        `${attributePath}.normalized_label`,
        `Duplicate normalized label ${attribute.normalized_label}`
      );
    }
    normalizedLabels.add(label);
    const terms = [attribute.normalized_label, ...(attribute.aliases ?? [])];
    terms.forEach((term, termIndex) => {
      const normalized = String(term ?? "").trim().toLocaleLowerCase("es");
      if (normalized === "otros") {
        push(
          errors,
          "BENCHMARK_ATTRIBUTE_OTHERS",
          termIndex === 0
            ? `${attributePath}.normalized_label`
            : `${attributePath}.aliases[${termIndex - 1}]`,
          "Otros cannot be a canonical label or alias"
        );
      }
      const owner = normalizedTerms.get(normalized);
      if (owner && owner !== attribute.attribute_id) {
        push(
          errors,
          "BENCHMARK_ATTRIBUTE_ALIAS_COLLISION",
          `${attributePath}.aliases`,
          `${term} is already assigned to ${owner}`
        );
      } else if (normalized) {
        normalizedTerms.set(normalized, attribute.attribute_id);
      }
    });
  });

  const indicators = benchmark.coverage?.indicators;
  if (!indicators || typeof indicators !== "object" || Array.isArray(indicators)) {
    return stableErrors(errors);
  }
  const indicatorEntries = Object.entries(indicators);
  if (indicatorEntries.length === 0) {
    push(
      errors,
      "BENCHMARK_INDICATORS_EMPTY",
      `${path}.coverage.indicators`,
      "At least one benchmark indicator is required"
    );
  }
  const reasonOrder = new Map(
    (benchmark.methodology?.exclusion_reason_precedence ?? []).map(
      (reason, index) => [reason, index]
    )
  );
  indicatorEntries.forEach(([indicatorId, coverage]) => {
    const indicatorPath = `${path}.coverage.indicators.${indicatorId}`;
    if (!/^[a-z][a-z0-9_]*$/.test(indicatorId)) {
      push(
        errors,
        "BENCHMARK_INDICATOR_ID",
        indicatorPath,
        `Invalid indicator ID ${indicatorId}`
      );
    }
    if (!coverage || typeof coverage !== "object") return;
    const inputIds = Array.isArray(coverage.input_project_ids)
      ? coverage.input_project_ids
      : [];
    const usedIds = Array.isArray(coverage.used_project_ids)
      ? coverage.used_project_ids
      : [];
    const missingIds = Array.isArray(coverage.missing_project_ids)
      ? coverage.missing_project_ids
      : [];
    const excludedProjects = Array.isArray(coverage.excluded_projects)
      ? coverage.excluded_projects
      : [];
    const excludedIds = excludedProjects.map((entry) => entry?.project_id);
    if (new Set(excludedIds).size !== excludedIds.length) {
      push(
        errors,
        "BENCHMARK_COVERAGE_DUPLICATE_EXCLUDED",
        `${indicatorPath}.excluded_projects`,
        "A project can be excluded only once per indicator"
      );
    }
    const outputIds = [...usedIds, ...missingIds, ...excludedIds];
    if (new Set(outputIds).size !== outputIds.length) {
      push(
        errors,
        "BENCHMARK_COVERAGE_OVERLAP",
        indicatorPath,
        "Used, missing and excluded projects must be disjoint"
      );
    }
    const inputSet = new Set(inputIds);
    const outputSet = new Set(outputIds);
    if (
      inputSet.size !== outputSet.size ||
      [...inputSet].some((projectId) => !outputSet.has(projectId))
    ) {
      push(
        errors,
        "BENCHMARK_COVERAGE_PARTITION",
        indicatorPath,
        "Input projects must equal used plus missing plus excluded projects"
      );
    }
    [...inputSet].forEach((projectId) => {
      if (!projects.has(projectId)) {
        push(
          errors,
          "BENCHMARK_COVERAGE_PROJECT_REFERENCE",
          `${indicatorPath}.input_project_ids`,
          `Missing ${projectId}`
        );
      }
    });
    excludedProjects.forEach((excluded, excludedIndex) => {
      if (!excluded || !Array.isArray(excluded.reasons)) return;
      const positions = excluded.reasons.map((reason) =>
        reasonOrder.has(reason) ? reasonOrder.get(reason) : Number.MAX_SAFE_INTEGER
      );
      if (
        positions.some(
          (position, reasonIndex) =>
            reasonIndex > 0 && position < positions[reasonIndex - 1]
        )
      ) {
        push(
          errors,
          "BENCHMARK_COVERAGE_REASON_ORDER",
          `${indicatorPath}.excluded_projects[${excludedIndex}].reasons`,
          "Exclusion reasons must follow methodology precedence"
        );
      }
    });
    if (
      indicatorId === "price_per_m2_total" &&
      usedIds.some((projectId) => !sourcePairedProjects.has(projectId))
    ) {
      push(
        errors,
        "BENCHMARK_COVERAGE_UNPAIRED_USED",
        `${indicatorPath}.used_project_ids`,
        "Only source_paired projects may be used for eligible price per m2"
      );
    }
  });
  return stableErrors(errors);
}

export function validateRootDocument(
  document,
  { schema = loadContractSchema(), assetExists } = {}
) {
  assertSupportedSchema(schema);
  const errors = validateSchemaShape(document, schema, { rootSchema: schema, path: "$" });
  if (document?.model && typeof document.model === "object") {
    errors.push(
      ...validateModelSemantics(document.model, {
        path: "$.model",
        pilot: document.pilot,
        assetExists,
        requireDeterministicOrder: true
      })
    );
  }
  if (document?.inspector && document?.model) {
    errors.push(...validateInspectorSemantics(document.inspector, document.model));
  }
  if (document?.benchmark && document?.model) {
    errors.push(...validateBenchmarkSemantics(document.benchmark, document.model));
  }
  validateRootSemantics(document, errors);
  errors.push(...validatePrivacy(document));
  return stableErrors(errors);
}

function fixtureModel(input) {
  return {
    sources: input.sources ?? [],
    agencies: input.agencies,
    agencyAliases: input.agencyAliases ?? input.agency_aliases,
    projects: input.projects,
    typologies: input.typologies,
    observations: input.observations,
    facts: input.facts,
    documents: input.documents,
    evidence: input.evidence,
    issues: input.issues,
    events: input.events
  };
}

function resolveFixtureValues(root, expression) {
  let values = [root];
  for (const segment of expression.split(".")) {
    const match = /^([^\[]+)(?:\[([^\]]*)\])?$/.exec(segment);
    if (!match) return [];
    const [, key, selector] = match;
    values = values.flatMap((value) => {
      const next = value?.[key];
      if (selector === undefined) return [next];
      if (!Array.isArray(next)) return [];
      if (selector === "") return next;
      return next.filter(
        (record) =>
          record &&
          typeof record === "object" &&
          Object.values(record).includes(selector)
      );
    });
  }
  return values;
}

function fixtureIndexes(fixture) {
  const model = fixtureModel(fixture.input);
  return {
    model,
    facts: mapBy(model.facts, "fact_id"),
    events: mapBy(model.events, "event_id"),
    observations: mapBy(model.observations, "observation_id"),
    documents: mapBy(model.documents, "document_id"),
    aliases: new Map((model.agencyAliases ?? []).map((alias) => [alias.alias_original, alias]))
  };
}

function derivedFactForAssertion(indexes, assertion, inputFactIds) {
  const semanticType =
    assertion.operation === "divide_half_up_2"
      ? "price_per_m2"
      : ["relative_change_half_up_2", "relative_difference_half_up_2"].includes(
            assertion.operation
          )
        ? "percentage"
        : null;
  return (indexes.model.facts ?? []).find((fact) => {
    if (fact.value_kind !== "derived") return false;
    if (semanticType && fact.semantic_type !== semanticType) return false;
    if (!semanticType && fact.semantic_type === "percentage") return false;
    return equalJson(fact.derivation?.input_fact_ids ?? [], inputFactIds);
  });
}

function validateArithmeticAssertionOutput(
  indexes,
  assertion,
  assertionPath,
  computedValue,
  inputFactIds,
  errors
) {
  const derived = derivedFactForAssertion(indexes, assertion, inputFactIds);
  if (!derived || derived.normalized_value !== computedValue) {
    push(
      errors,
      "FIXTURE_DERIVED_FACT_MISMATCH",
      assertionPath,
      `${assertion.assertion_id} does not match its materialized derived fact`
    );
    return false;
  }
  return true;
}

function fixtureIssueCode(indexes, entityId, preferredCode) {
  return (indexes.model.issues ?? []).find(
    (issue) =>
      issue.entity_id === entityId &&
      (!preferredCode || issue.issue_code === preferredCode)
  )?.issue_code;
}

function materializeFixtureResult(fixture) {
  const indexes = fixtureIndexes(fixture);
  const fact = (id) => indexes.facts.get(id);
  const value = (id) => fact(id)?.normalized_value;
  const event = (id) => indexes.events.get(id);
  switch (fixture.case_id) {
    case "CT-A": {
      const builtPrice = fact("fact:ct-a-price-per-built-m2");
      const totalPrice = fact("fact:ct-a-price-per-total-m2");
      return {
        free_area: roundHalfUp(
          value("fact:ct-a-total-area") - value("fact:ct-a-built-area")
        ),
        price_per_built_m2: roundHalfUp(
          value("fact:ct-a-scenario-price") /
            value("fact:ct-a-built-area")
        ),
        price_per_total_m2: roundHalfUp(
          value("fact:ct-a-scenario-price") /
            value("fact:ct-a-total-area")
        ),
        price_per_m2_facts_benchmark_eligible:
          !!builtPrice &&
          !!totalPrice &&
          builtPrice.benchmark_eligible &&
          totalPrice.benchmark_eligible,
        denominators_remain_distinct:
          !!builtPrice?.denominator_area_type &&
          !!totalPrice?.denominator_area_type &&
          builtPrice.denominator_area_type !==
            totalPrice.denominator_area_type
      };
    }
    case "CT-B": {
      const base = value("fact:ct-b-price-a");
      const next = value("fact:ct-b-price-b");
      return {
        delta: roundHalfUp(next - base),
        delta_percent: roundHalfUp(((next - base) / base) * 100),
        percentage_base_fact_id:
          fact("fact:ct-b-price-delta-percent")?.derivation
            ?.input_fact_ids?.[1] ?? null,
        issue_code: fixtureIssueCode(
          indexes,
          "typology:ct-b-controlled",
          "PRICE_SOURCE_CONFLICT"
        ),
        selected_truth_fact_id:
          fixture.input.selected_truth_fact_id ?? null,
        benchmark_eligible:
          fact("fact:ct-b-price-delta")?.benchmark_eligible === true &&
          fact("fact:ct-b-price-delta-percent")?.benchmark_eligible === true
      };
    }
    case "CT-D": {
      const countertop = fact("fact:ct-d-countertop-material");
      const observation = indexes.observations.get(
        countertop?.observation_id
      );
      return {
        countertop_material: countertop?.normalized_value,
        countertop_evidence_id: observation?.evidence_ids?.[0] ?? null,
        air_conditioning: value("fact:ct-d-air-conditioning"),
        restricted_document_public_asset_path:
          indexes.documents.get("document:ct-d-restricted")
            ?.public_asset_path ?? null,
        restricted_document_fragment:
          (indexes.model.evidence ?? []).find(
            (record) =>
              record.document_id === "document:ct-d-restricted"
          )?.fragment ?? null
      };
    }
    case "CT-E": {
      const normal = event("event:ct-e-normal-change");
      const zero = event("event:ct-e-base-zero");
      const extreme = event("event:ct-e-extreme-change");
      const summarize = (record, issueCode, includeQuality = false) => ({
        delta: record?.delta,
        percentage: record?.percentage,
        ...(issueCode ? { issue_code: issueCode } : {}),
        ...(includeQuality
          ? { quality_status: record?.quality_status }
          : {}),
        cause: record?.cause
      });
      return {
        normal_change: {
          ...summarize(normal),
          percentage_base_fact_id:
            normal?.percentage_base_fact_id ?? null
        },
        zero_base: summarize(
          zero,
          fixtureIssueCode(
            indexes,
            "event:ct-e-base-zero",
            "PERCENT_BASE_ZERO"
          )
        ),
        extreme_change: summarize(
          extreme,
          fixtureIssueCode(
            indexes,
            "event:ct-e-extreme-change",
            "EXTREME_CHANGE_REVIEW"
          ),
          true
        ),
        sorted_event_ids: [...(indexes.model.events ?? [])]
          .sort((left, right) =>
            left.effective_at === right.effective_at
              ? compareText(left.event_id, right.event_id)
              : compareText(left.effective_at, right.effective_at)
          )
          .map((record) => record.event_id)
      };
    }
    case "CT-G": {
      const card = fact("fact:pardo-coast-card-area");
      const plan = fact("fact:pardo-coast-plan-area");
      const delta = fact("fact:pardo-coast-area-delta");
      const relative = fact("fact:pardo-coast-area-delta-percent");
      return {
        project_id:
          (indexes.model.typologies ?? []).find(
            (record) =>
              record.typology_id === "typology:pardo-coast-tipo-7"
          )?.project_id,
        typology_id: "typology:pardo-coast-tipo-7",
        card_area: card?.normalized_value,
        card_area_type: card?.area_type,
        plan_area: plan?.normalized_value,
        plan_area_type: plan?.area_type,
        area_delta: roundHalfUp(
          card?.normalized_value - plan?.normalized_value
        ),
        area_delta_type: delta?.area_type,
        relative_difference_percent: roundHalfUp(
          ((card?.normalized_value - plan?.normalized_value) /
            card?.normalized_value) *
            100
        ),
        relative_difference_base_fact_id:
          relative?.derivation?.input_fact_ids?.[0] ?? null,
        quality_status: delta?.quality_status,
        benchmark_eligible:
          delta?.benchmark_eligible === true &&
          relative?.benchmark_eligible === true,
        selected_truth_fact_id:
          fixture.input.selected_truth_fact_id ?? null,
        published_asset_count: (indexes.model.documents ?? []).filter(
          (document) => document.public_asset_path !== null
        ).length,
        issue_codes: (indexes.model.issues ?? [])
          .map((issue) => issue.issue_code)
          .sort(compareText)
      };
    }
    case "CT-H": {
      const aliases = indexes.model.agencyAliases ?? [];
      const resolvedAgencyIds = (fixture.input.normalization_expectations ?? [])
        .map((entry) => entry.agency_id)
        .filter(Boolean);
      const consolidated = aliases.filter(
        (alias) =>
          alias.agency_id === "agency:grupo-tyc" &&
          alias.resolution === "rule_based"
      );
      return {
        raw_source_record_count: (fixture.input.source_records ?? []).length,
        deterministically_resolvable_canonical_id_count:
          new Set(resolvedAgencyIds).size,
        resolved_alias_group: {
          agency_id: "agency:grupo-tyc",
          source_names: consolidated.map(
            (alias) => alias.alias_original
          )
        },
        manual_review_source_name_count: aliases.filter(
          (alias) => alias.resolution === "manual_review"
        ).length,
        thresholds: {
          base_count: {
            minimum: 30,
            status: "expected_for_p1_03"
          },
          enriched_count: {
            minimum: 15,
            status: "expected_for_p1_03"
          },
          deep_count: {
            minimum: 5,
            status: "expected_for_p1_03"
          }
        },
        demonstrated_counts: {
          base_count: null,
          enriched_count: null,
          deep_count: null
        },
        tier_assignment_status: "not_assigned_by_fixture"
      };
    }
    default:
      return undefined;
  }
}

function validateFixtureAssertions(fixture, path, errors, repositoryRoot) {
  const indexes = fixtureIndexes(fixture);
  for (const [index, assertion] of fixture.expected.assertions.entries()) {
    const assertionPath = `${path}.expected.assertions[${index}]`;
    let pass = true;
    const facts = (assertion.input_fact_ids ?? []).map((id) => indexes.facts.get(id));
    switch (assertion.operation) {
      case "subtract":
        {
          const computed = roundHalfUp(
            facts[0]?.normalized_value - facts[1]?.normalized_value
          );
          const outputMatches = validateArithmeticAssertionOutput(
            indexes,
            assertion,
            assertionPath,
            computed,
            assertion.input_fact_ids,
            errors
          );
          pass =
            facts.length === 2 &&
            computed === assertion.expected_value &&
            outputMatches;
        }
        break;
      case "divide_half_up_2":
        {
          const computed = roundHalfUp(
            facts[0]?.normalized_value / facts[1]?.normalized_value
          );
          const outputMatches = validateArithmeticAssertionOutput(
            indexes,
            assertion,
            assertionPath,
            computed,
            assertion.input_fact_ids,
            errors
          );
          pass =
            facts.length === 2 &&
            computed === assertion.expected_value &&
            outputMatches;
        }
        break;
      case "relative_change_half_up_2": {
        const next = indexes.facts.get(assertion.new_fact_id)?.normalized_value;
        const base = indexes.facts.get(assertion.base_fact_id)?.normalized_value;
        const computed = roundHalfUp(((next - base) / base) * 100);
        const inputFactIds = [
          assertion.new_fact_id,
          assertion.base_fact_id
        ];
        const outputMatches = validateArithmeticAssertionOutput(
          indexes,
          assertion,
          assertionPath,
          computed,
          inputFactIds,
          errors
        );
        pass =
          computed === assertion.expected_value &&
          outputMatches;
        break;
      }
      case "relative_difference_half_up_2": {
        const value = indexes.facts.get(assertion.value_fact_id)?.normalized_value;
        const base = indexes.facts.get(assertion.base_fact_id)?.normalized_value;
        const computed = roundHalfUp(((base - value) / base) * 100);
        const inputFactIds = [
          assertion.base_fact_id,
          assertion.value_fact_id
        ];
        const outputMatches = validateArithmeticAssertionOutput(
          indexes,
          assertion,
          assertionPath,
          computed,
          inputFactIds,
          errors
        );
        pass =
          computed === assertion.expected_value &&
          outputMatches;
        break;
      }
      case "set_equals": {
        const actual = (assertion.fact_ids ?? []).map((id) => indexes.facts.get(id)?.normalized_value).sort();
        pass = equalJson(actual, [...assertion.expected_values].sort());
        break;
      }
      case "equals":
        pass = equalJson(resolveFixtureValues(fixture, assertion.actual_path)[0], assertion.expected_value);
        break;
      case "strict_not_equal":
        pass = resolveFixtureValues(fixture, assertion.actual_path)[0] !== assertion.expected_value;
        break;
      case "all_distinct":
        pass = new Set(assertion.values).size === assertion.values.length;
        break;
      case "all_equal": {
        let actual = [];
        if (assertion.fact_ids) actual = assertion.fact_ids.map((id) => indexes.facts.get(id)?.[assertion.field]);
        if (assertion.event_ids) actual = assertion.event_ids.map((id) => indexes.events.get(id)?.[assertion.field]);
        if (assertion.document_ids) actual = assertion.document_ids.map((id) => indexes.documents.get(id)?.[assertion.field]);
        if (assertion.source_names) actual = assertion.source_names.map((id) => indexes.aliases.get(id)?.[assertion.field]);
        if (assertion.actual_paths) actual = assertion.actual_paths.map((item) => resolveFixtureValues(fixture, item)[0]);
        pass = actual.every((value) => equalJson(value, assertion.expected_value));
        break;
      }
      case "event_equals": {
        const event = indexes.events.get(assertion.event_id);
        pass =
          !!event &&
          (!Object.hasOwn(assertion, "expected_delta") || event.delta === assertion.expected_delta) &&
          (!Object.hasOwn(assertion, "expected_percentage") || event.percentage === assertion.expected_percentage) &&
          (!assertion.expected_quality_status || event.quality_status === assertion.expected_quality_status);
        if (pass && assertion.expected_issue_code) {
          pass = (indexes.model.issues ?? []).some(
            (issue) =>
              issue.entity_id === assertion.event_id &&
              issue.issue_code === assertion.expected_issue_code
          );
        }
        break;
      }
      case "fact_observation_captured_at_before": {
        const previous = indexes.facts.get(assertion.previous_fact_id);
        const next = indexes.facts.get(assertion.new_fact_id);
        pass =
          Date.parse(indexes.observations.get(previous?.observation_id)?.captured_at) <
          Date.parse(indexes.observations.get(next?.observation_id)?.captured_at);
        break;
      }
      case "sort_by_effective_at_then_event_id": {
        const sorted = [...(indexes.model.events ?? [])]
          .sort((left, right) =>
            left.effective_at === right.effective_at
              ? compareText(left.event_id, right.event_id)
              : compareText(left.effective_at, right.effective_at)
          )
          .map((event) => event.event_id);
        pass = equalJson(sorted, assertion.expected_event_ids);
        break;
      }
      case "not_contains":
        pass = !JSON.stringify(resolveFixtureValues(fixture, assertion.collection_path)[0]).includes(assertion.expected_value);
        break;
      case "all_resolve_to":
        pass = assertion.source_names.every(
          (name) =>
            indexes.aliases.get(name)?.agency_id === assertion.expected_agency_id &&
            (!assertion.expected_resolution ||
              indexes.aliases.get(name)?.resolution === assertion.expected_resolution)
        );
        break;
      case "unique_count_at_least": {
        const values = resolveFixtureValues(fixture, assertion.collection_path);
        pass = new Set(values).size >= assertion.expected_value;
        break;
      }
      case "source_records_exist_in_local_snapshot":
        pass =
          fixture.input.source_records?.length === assertion.expected_record_count &&
          (!repositoryRoot ||
            (assertion.source_paths ?? []).every((file) => existsSync(resolve(repositoryRoot, file))));
        break;
      default:
        pass = false;
    }
    if (!pass) push(errors, "FIXTURE_ASSERTION_FAILED", assertionPath, `${assertion.assertion_id} failed`);
  }
}

export function validateFixture(
  fixture,
  {
    schema = loadContractSchema(),
    path = "$",
    repositoryRoot,
    assetExists
  } = {}
) {
  assertSupportedSchema(schema);
  const errors = [];
  if (fixture === null || typeof fixture !== "object" || Array.isArray(fixture)) {
    return [validationError("FIXTURE_TYPE", path, "Fixture must be an object")];
  }
  for (const key of ["case_id", "classification", "description", "provenance", "input", "expected"]) {
    if (!Object.hasOwn(fixture, key)) push(errors, "FIXTURE_REQUIRED", `${path}.${key}`, "Fixture field is missing");
  }
  if (!["controlled", "observed"].includes(fixture.classification)) {
    push(errors, "FIXTURE_CLASSIFICATION", `${path}.classification`, "Invalid fixture classification");
  }
  if (!fixture.input || typeof fixture.input !== "object") {
    push(errors, "FIXTURE_INPUT", `${path}.input`, "Fixture input must be an object");
    return stableErrors(errors);
  }
  for (const [name, definition] of Object.entries(DEFINITION_BY_COLLECTION)) {
    if (!Object.hasOwn(fixture.input, name)) continue;
    if (!Array.isArray(fixture.input[name])) {
      push(errors, "CATALOG_TYPE", `${path}.input.${name}`, "Catalog must be an array");
      continue;
    }
    fixture.input[name].forEach((record, index) =>
      errors.push(
        ...validateSchemaShape(record, definition, {
          rootSchema: schema,
          path: `${path}.input.${name}[${index}]`
        })
      )
    );
  }
  const model = fixtureModel(fixture.input);
  errors.push(
    ...validateModelSemantics(model, {
      path: `${path}.input`,
      assetExists
    })
  );
  errors.push(...validatePrivacy(fixture, path));
  if (!Array.isArray(fixture.expected?.assertions)) {
    push(errors, "FIXTURE_ASSERTIONS", `${path}.expected.assertions`, "Assertions must be an array");
  } else {
    validateFixtureAssertions(fixture, path, errors, repositoryRoot);
  }
  const materializedResult = materializeFixtureResult(fixture);
  if (materializedResult === undefined) {
    push(errors, "FIXTURE_CASE_UNSUPPORTED", `${path}.case_id`, `Unsupported fixture case ${fixture.case_id}`);
  } else if (!equalJson(materializedResult, fixture.expected?.result)) {
    push(
      errors,
      "FIXTURE_RESULT_MISMATCH",
      `${path}.expected.result`,
      "Expected result differs from the result recomputed from fixture input"
    );
  }
  return stableErrors(errors);
}

export function validateData(value, { mode = "partial", ...options } = {}) {
  const schema = options.schema ?? loadContractSchema();
  assertSupportedSchema(schema);
  options.schema = schema;
  if (mode === "root") return validateRootDocument(value, options);
  if (mode === "fixture") return validateFixture(value, options);
  if (mode === "partial") return validatePartialModel(value, options);
  return [validationError("VALIDATION_MODE", "$", `Unknown validation mode ${mode}`)];
}
