import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertSupportedSchema,
  loadContractSchema,
  validateData,
  validateEntityCatalog,
  validateFixture,
  validatePartialModel,
  validatePrivacy,
  validateBenchmarkSemantics,
  validateInspectorSemantics,
  validateRootDocument,
  validateSchemaShape
} from "../scripts/data/validate.js";
import { buildDemoData } from "../scripts/build-demo-data.js";

const TEST_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROTOTYPE_ROOT = resolve(TEST_DIRECTORY, "..");
const REPOSITORY_ROOT = resolve(PROTOTYPE_ROOT, "..", "..");
const FIXTURE_DIRECTORY = join(
  REPOSITORY_ROOT,
  "data/source",
  "demo-pilot",
  "fixtures"
);

const clone = (value) => structuredClone(value);
const hasCode = (errors, code) => errors.some((error) => error.code === code);
const expectCode = (errors, code) =>
  assert.ok(
    hasCode(errors, code),
    `Expected ${code}; received:\n${errors
      .map((error) => `${error.code} ${error.path} ${error.message}`)
      .join("\n")}`
  );

function source() {
  return {
    source_id: "source:test",
    name: "Fixture test",
    type: "controlled_fixture",
    base_url: null,
    legal_status: "cleared_for_demo",
    access_mode: "controlled_fixture"
  };
}

function agency(index = 1, tier = "base") {
  const suffix = String(index).padStart(2, "0");
  return {
    agency_id: `agency:agency-${suffix}`,
    canonical_name: `Inmobiliaria ${suffix}`,
    normalized_name: `inmobiliaria-${suffix}`,
    domain: null,
    pilot_selected: true,
    coverage_tier: tier,
    source_names: [`Inmobiliaria ${suffix}`],
    selection_reason: "Selección controlada para prueba."
  };
}

function project() {
  return {
    project_id: "project:test",
    agency_id: "agency:agency-01",
    canonical_name: "Proyecto test",
    source_names: ["Proyecto test"],
    location: {
      district: "Miraflores",
      province: "Lima",
      department: "Lima",
      address: null,
      latitude: null,
      longitude: null
    },
    status: "fixture",
    first_seen_at: "2026-01-01T00:00:00Z",
    last_seen_at: "2026-02-01T00:00:00Z",
    quality_status: "certified"
  };
}

function typology() {
  return {
    typology_id: "typology:test",
    project_id: "project:test",
    model: "Tipo test",
    floor_label_original: null,
    floor_min: null,
    floor_max: null,
    bedrooms_min: 2,
    bedrooms_max: 2,
    bathrooms_min: 2,
    bathrooms_max: 2,
    quality_status: "certified"
  };
}

function observation(id, capturedAt) {
  return {
    observation_id: id,
    source_id: "source:test",
    entity_type: "typology",
    entity_id: "typology:test",
    captured_at: capturedAt,
    source_url: null,
    extraction_method: "controlled_fixture",
    evidence_ids: [],
    evidence_status: "not_applicable",
    evidence_absence_reason: "Punto controlado sin activo externo."
  };
}

function priceFact(id, observationId, value) {
  return {
    fact_id: id,
    observation_id: observationId,
    entity_id: "typology:test",
    field_name: "list_price",
    original_value: value,
    normalized_value: value,
    unit: "PEN",
    value_kind: "observed",
    semantic_type: "price",
    area_type: null,
    price_type: "list",
    currency: "PEN",
    denominator_area_type: null,
    confidence: "high",
    quality_status: "certified",
    benchmark_eligible: true,
    exclusion_reason: null,
    derivation: null
  };
}

function event() {
  return {
    event_id: "event:test-change",
    entity_id: "typology:test",
    field_name: "list_price",
    previous_fact_id: "fact:test-before",
    new_fact_id: "fact:test-after",
    effective_at: "2026-02-01T00:00:00Z",
    observed_at: "2026-02-01T00:00:00Z",
    delta: 10,
    percentage: 10,
    percentage_base_fact_id: "fact:test-before",
    cause: null,
    cause_evidence_ids: [],
    quality_status: "certified"
  };
}

function validPartial() {
  return {
    sources: [source()],
    agencies: [agency()],
    projects: [project()],
    typologies: [typology()],
    observations: [
      observation("observation:test-before", "2026-01-01T00:00:00Z"),
      observation("observation:test-after", "2026-02-01T00:00:00Z")
    ],
    facts: [
      priceFact("fact:test-before", "observation:test-before", 100),
      priceFact("fact:test-after", "observation:test-after", 110)
    ],
    events: [event()]
  };
}

function documentObservation() {
  return {
    observation_id: "observation:test-document",
    source_id: "source:test",
    entity_type: "document",
    entity_id: "document:test",
    captured_at: "2026-02-01T00:00:00Z",
    source_url: null,
    extraction_method: "controlled_transcription",
    evidence_ids: ["evidence:test"],
    evidence_status: "available",
    evidence_absence_reason: null
  };
}

function authorizedDocument() {
  return {
    document_id: "document:test",
    source_id: "source:test",
    document_type: "specification",
    title: "Especificación test",
    captured_at: "2026-02-01T00:00:00Z",
    source_url: null,
    sha256: "a".repeat(64),
    publish_permission: "authorized",
    availability: "available",
    public_asset_path: null
  };
}

function authorizedEvidence() {
  return {
    evidence_id: "evidence:test",
    observation_id: "observation:test-document",
    document_id: "document:test",
    kind: "fragment",
    fragment: "Contenido autorizado.",
    page: 1,
    region: null,
    captured_at: "2026-02-01T00:00:00Z",
    sha256: "a".repeat(64),
    publish_permission: "authorized",
    availability: "available"
  };
}

function validRoot() {
  const agencies = Array.from({ length: 30 }, (_, index) =>
    agency(index + 1, index < 5 ? "deep" : index < 15 ? "enriched" : "base")
  );
  const partial = validPartial();
  partial.agencies = agencies;
  partial.observations.push(documentObservation());
  partial.documents = [authorizedDocument()];
  partial.evidence = [authorizedEvidence()];
  partial.agencyAliases = [
    {
      alias_original: "Inmobiliaria 01",
      alias_normalized: "inmobiliaria 01",
      agency_id: "agency:agency-01",
      resolution: "confirmed",
      evidence_ids: []
    }
  ];
  partial.issues = [
    {
      issue_id: "issue:test-note",
      entity_type: "fact",
      entity_id: "fact:test-before",
      fact_ids: [],
      issue_code: "TEST_NOTE",
      severity: "low",
      quality_status: "certified",
      detail: "Nota controlada no bloqueante.",
      next_action: null,
      benchmark_blocking: false
    }
  ];
  for (const [collectionName, idField] of Object.entries({
    sources: "source_id",
    agencies: "agency_id",
    projects: "project_id",
    typologies: "typology_id",
    observations: "observation_id",
    facts: "fact_id",
    documents: "document_id",
    evidence: "evidence_id",
    issues: "issue_id"
  })) {
    partial[collectionName].sort((left, right) =>
      left[idField].localeCompare(right[idField])
    );
  }

  return {
    metadata: {
      contract_version: "2.0.0",
      dataset_id: "dataset:test",
      generated_at: "2026-07-28T00:00:00Z",
      cutoff_at: "2026-07-28T00:00:00Z",
      input_fingerprints: [
        {
          input_id: "input:test",
          path: "data/source/demo-pilot/sources.json",
          sha256: "b".repeat(64)
        }
      ],
      publication: {
        is_public_artifact: true,
        contains_contact_pii: false,
        raw_payloads_included: false,
        restricted_assets_included: false,
        policy_version: "1"
      },
      title: "Dataset test",
      description: "Documento raíz válido controlado.",
      source_snapshot: {
        min_captured_at: "2026-01-01T00:00:00Z",
        max_captured_at: "2026-02-01T00:00:00Z",
        assistant_dataset_run_id: null
      },
      counts: { projects: 1, agencies_in_market: 30, districts: 1 }
    },
    model: partial,
    pilot: {
      pilot_id: "pilot:test",
      version: "1",
      selected_at: "2026-07-28T00:00:00Z",
      selection_rule: "Selección controlada.",
      selection_reason: "Validación del documento raíz.",
      agency_ids: agencies.map((item) => item.agency_id),
      districts: ["Miraflores"],
      counts: {
        market_raw_count: 30,
        base_count: 30,
        enriched_count: 15,
        deep_count: 5
      }
    },
    projects: [
      {
        id: "test",
        source: "Fixture test",
        source_type: "controlled_fixture",
        captured_at: "2026-02-01T00:00:00Z",
        source_url: null,
        extraction_method: "controlled_fixture",
        agency_name: "Inmobiliaria 01",
        project_name: "Proyecto test",
        district: "Miraflores",
        province: "Lima",
        department: "Lima",
        address: null,
        latitude: null,
        longitude: null,
        project_phase: "fixture",
        typology: "Tipo test",
        bedrooms: "2",
        bedrooms_min: 2,
        bedrooms_max: 2,
        total_area_min: null,
        total_area_max: null,
        total_area: null,
        unit_status: null,
        unit_count: null,
        currency: "PEN",
        list_price_avg: 110,
        price_min: 100,
        price_per_m2_list: null,
        latest_price_history_from: 100,
        latest_price_history_date: "2026-02-01T00:00:00Z",
        price_delta: 10,
        price_delta_pct: 10,
        delivery_year: null,
        delivery_date: null,
        update_date: "2026-02-01T00:00:00Z",
        income: null,
        total_m2: null,
        financing_banks: [],
        amenities: [],
        project_description: null,
        field_confidence: "high",
        missing_required_fields: []
      }
    ],
    executive: {},
    rankings: {},
    sourceScope: [],
    scopeSummary: {},
    matching: {},
    coverage: {},
    quality: {},
    assistant: {},
    pipeline: [],
    deployment: {}
  };
}

const schema = loadContractSchema();
assert.equal(schema.$defs.areaType.enum.includes("unknown"), true);
assert.throws(
  () => assertSupportedSchema({ type: "object", unevaluatedProperties: false }),
  /Unsupported JSON Schema keyword/,
  "schema boundary must fail closed when a new keyword is not implemented"
);
assert.throws(
  () => assertSupportedSchema({ type: "string", format: "email" }),
  /Unsupported JSON Schema format/,
  "formats must also fail closed"
);

const unsupportedSchema = clone(schema);
unsupportedSchema.$defs.source.unevaluatedProperties = false;
for (const invoke of [
  () =>
    validateSchemaShape(source(), "source", {
      rootSchema: unsupportedSchema
    }),
  () =>
    validateEntityCatalog("sources", [source()], {
      schema: unsupportedSchema
    }),
  () =>
    validatePartialModel({ sources: [source()] }, {
      schema: unsupportedSchema
    }),
  () => validateRootDocument({}, { schema: unsupportedSchema }),
  () =>
    validateFixture(
      {
        case_id: "CT-A",
        classification: "controlled",
        description: "Test",
        provenance: [],
        input: {},
        expected: { assertions: [], result: {} }
      },
      { schema: unsupportedSchema }
    ),
  () =>
    validateData(
      { sources: [source()] },
      { mode: "partial", schema: unsupportedSchema }
    )
]) {
  assert.throws(
    invoke,
    /Unsupported JSON Schema keyword/,
    "every schema-aware public entrypoint must fail closed"
  );
}

expectCode(
  validateSchemaShape("2026-02-30T00:00:00Z", "dateTime"),
  "SCHEMA_FORMAT_DATE_TIME"
);
expectCode(
  validateSchemaShape("2026-02-01T00:00:00", "dateTime"),
  "SCHEMA_FORMAT_DATE_TIME"
);
assert.deepEqual(
  validateSchemaShape("2024-02-29T23:59:59-05:00", "dateTime"),
  [],
  "strict RFC3339 must accept a real leap-day with timezone"
);

const validModel = validPartial();
const beforeValidation = clone(validModel);
assert.deepEqual(validatePartialModel(validModel), [], "valid partial model must pass");
assert.deepEqual(validModel, beforeValidation, "validator must never mutate input");
assert.deepEqual(
  validateData(validModel, { mode: "partial" }),
  [],
  "generic partial mode must pass"
);

assert.deepEqual(
  validateEntityCatalog("sources", [source()]),
  [],
  "isolated entity catalog must validate without requiring unrelated collections"
);
assert.deepEqual(
  validateEntityCatalog("facts", [priceFact("fact:test", "observation:absent", 100)]),
  [],
  "isolated fact shape must not require an absent observations catalog"
);
expectCode(
  validatePartialModel({
    observations: [],
    facts: [priceFact("fact:test", "observation:absent", 100)]
  }),
  "REFERENCE_MISSING"
);
expectCode(
  validatePartialModel({
    agencies: [],
    observations: [
      {
        ...observation(
          "observation:test-agency",
          "2026-01-01T00:00:00Z"
        ),
        entity_type: "agency",
        entity_id: "agency:missing"
      }
    ]
  }),
  "REFERENCE_MISSING"
);

expectCode(
  validateSchemaShape({ ...source(), type: "invalid" }, "source"),
  "SCHEMA_ENUM"
);
expectCode(
  validateSchemaShape({ ...source(), extra: true }, "source"),
  "SCHEMA_ADDITIONAL_PROPERTY"
);

const duplicate = validPartial();
duplicate.facts.push(clone(duplicate.facts[0]));
expectCode(validatePartialModel(duplicate), "DUPLICATE_ID");

const brokenReference = validPartial();
brokenReference.observations[0].source_id = "source:missing";
expectCode(validatePartialModel(brokenReference), "REFERENCE_MISSING");

const simulatedEligible = validPartial();
simulatedEligible.facts[0].value_kind = "simulated";
simulatedEligible.facts[0].price_type = "scenario";
expectCode(validatePartialModel(simulatedEligible), "SIMULATED_ELIGIBLE");

const inheritedIneligibility = validPartial();
inheritedIneligibility.facts[0].benchmark_eligible = false;
inheritedIneligibility.facts[0].quality_status = "reviewable";
inheritedIneligibility.facts[0].exclusion_reason = "Input controlado no elegible.";
inheritedIneligibility.facts[1] = {
  ...inheritedIneligibility.facts[1],
  original_value: null,
  value_kind: "derived",
  derivation: {
    formula: "copy(previous)",
    input_fact_ids: ["fact:test-before"],
    rounding: { mode: "none", digits: 0 }
  }
};
expectCode(validatePartialModel(inheritedIneligibility), "DERIVED_INPUT_INELIGIBLE");

const wrongCurrencyUnit = validPartial();
wrongCurrencyUnit.facts[0].unit = "USD";
expectCode(validatePartialModel(wrongCurrencyUnit), "FACT_CURRENCY_UNIT_MISMATCH");

const mixedCurrencyEvent = validPartial();
mixedCurrencyEvent.facts[1].currency = "USD";
mixedCurrencyEvent.facts[1].unit = "USD";
expectCode(validatePartialModel(mixedCurrencyEvent), "EVENT_CURRENCY_MISMATCH");

const denominatorMismatch = validPartial();
denominatorMismatch.facts.push({
  fact_id: "fact:test-built-area",
  observation_id: "observation:test-before",
  entity_id: "typology:test",
  field_name: "built_area",
  original_value: "10 m2",
  normalized_value: 10,
  unit: "m2",
  value_kind: "observed",
  semantic_type: "area",
  area_type: "built",
  price_type: null,
  currency: null,
  denominator_area_type: null,
  confidence: "high",
  quality_status: "certified",
  benchmark_eligible: true,
  exclusion_reason: null,
  derivation: null
});
denominatorMismatch.facts.push({
  fact_id: "fact:test-price-per-total",
  observation_id: "observation:test-after",
  entity_id: "typology:test",
  field_name: "price_per_total_m2",
  original_value: null,
  normalized_value: 11,
  unit: "PEN/m2",
  value_kind: "derived",
  semantic_type: "price_per_m2",
  area_type: null,
  price_type: "list",
  currency: "PEN",
  denominator_area_type: "total",
  confidence: "high",
  quality_status: "certified",
  benchmark_eligible: true,
  exclusion_reason: null,
  derivation: {
    formula: "price / area",
    input_fact_ids: ["fact:test-after", "fact:test-built-area"],
    rounding: { mode: "half_up", digits: 2 }
  }
});
expectCode(validatePartialModel(denominatorMismatch), "PRICE_PER_M2_DENOMINATOR_MISSING");

const derivedCurrencyMismatch = clone(denominatorMismatch);
const derivedCurrencyFact = derivedCurrencyMismatch.facts.at(-1);
derivedCurrencyFact.currency = "USD";
derivedCurrencyFact.unit = "USD/m2";
expectCode(
  validatePartialModel(derivedCurrencyMismatch),
  "DERIVED_OUTPUT_CURRENCY_MISMATCH"
);

const derivedPriceTypeMismatch = clone(denominatorMismatch);
derivedPriceTypeMismatch.facts.at(-1).denominator_area_type = "built";
derivedPriceTypeMismatch.facts.at(-1).price_type = "sale";
expectCode(
  validatePartialModel(derivedPriceTypeMismatch),
  "DERIVED_OUTPUT_PRICE_TYPE_MISMATCH"
);

const derivedUnitMismatch = validPartial();
derivedUnitMismatch.facts[1] = {
  ...derivedUnitMismatch.facts[1],
  original_value: null,
  unit: "USD",
  currency: "USD",
  value_kind: "derived",
  derivation: {
    formula: "copy(previous)",
    input_fact_ids: ["fact:test-before"],
    rounding: { mode: "none", digits: 0 }
  }
};
expectCode(
  validatePartialModel(derivedUnitMismatch),
  "DERIVED_OUTPUT_UNIT_MISMATCH"
);

const derivationCycle = validPartial();
derivationCycle.facts = [
  {
    ...derivationCycle.facts[0],
    original_value: null,
    value_kind: "derived",
    derivation: {
      formula: "copy(after)",
      input_fact_ids: ["fact:test-after"],
      rounding: { mode: "none", digits: 0 }
    }
  },
  {
    ...derivationCycle.facts[1],
    original_value: null,
    value_kind: "derived",
    derivation: {
      formula: "copy(before)",
      input_fact_ids: ["fact:test-before"],
      rounding: { mode: "none", digits: 0 }
    }
  }
];
expectCode(validatePartialModel(derivationCycle), "DERIVATION_CYCLE");

const restrictedAsset = {
  sources: [source()],
  documents: [
    {
      ...authorizedDocument(),
      publish_permission: "restricted",
      availability: "restricted",
      public_asset_path: "assets/evidence/restricted.jpg"
    }
  ]
};
expectCode(validatePartialModel(restrictedAsset), "RESTRICTED_ASSET_EXPOSED");

const missingPublishedAsset = {
  sources: [source()],
  documents: [
    {
      ...authorizedDocument(),
      public_asset_path: "assets/evidence/missing.txt"
    }
  ]
};
expectCode(
  validatePartialModel(missingPublishedAsset),
  "ASSET_CHECK_REQUIRED"
);
expectCode(
  validatePartialModel(missingPublishedAsset, { assetExists: () => false }),
  "ASSET_NOT_FOUND"
);
assert.deepEqual(
  validatePartialModel(missingPublishedAsset, {
    assetExists: () => true
  }),
  [],
  "authorized available asset passes only after an explicit existence check"
);

const restrictedEvidenceInheritance = {
  sources: [source()],
  observations: [documentObservation()],
  documents: [
    {
      ...authorizedDocument(),
      publish_permission: "restricted",
      availability: "restricted"
    }
  ],
  evidence: [authorizedEvidence()]
};
expectCode(
  validatePartialModel(restrictedEvidenceInheritance),
  "EVIDENCE_DOCUMENT_PERMISSION_MISMATCH"
);
expectCode(
  validatePartialModel(restrictedEvidenceInheritance),
  "EVIDENCE_DOCUMENT_AVAILABILITY_MISMATCH"
);
expectCode(
  validatePartialModel(restrictedEvidenceInheritance),
  "EVIDENCE_FRAGMENT_DOCUMENT_RESTRICTED"
);

const mismatchedEvidenceHash = {
  sources: [source()],
  observations: [documentObservation()],
  documents: [authorizedDocument()],
  evidence: [
    {
      ...authorizedEvidence(),
      sha256: "b".repeat(64)
    }
  ]
};
expectCode(
  validatePartialModel(mismatchedEvidenceHash),
  "EVIDENCE_DOCUMENT_SHA_MISMATCH"
);

const crossOwnedEvidence = {
  sources: [
    source(),
    {
      ...source(),
      source_id: "source:other",
      name: "Otra fuente"
    }
  ],
  observations: [documentObservation()],
  documents: [
    {
      ...authorizedDocument(),
      source_id: "source:other"
    }
  ],
  evidence: [authorizedEvidence()]
};
expectCode(
  validatePartialModel(crossOwnedEvidence),
  "EVIDENCE_SOURCE_OWNER_MISMATCH"
);

const detachedEvidence = {
  sources: [source()],
  observations: [
    {
      ...documentObservation(),
      evidence_ids: [],
      evidence_status: "not_applicable",
      evidence_absence_reason: "Sin evidencia enlazada."
    }
  ],
  documents: [authorizedDocument()],
  evidence: [authorizedEvidence()]
};
expectCode(
  validatePartialModel(detachedEvidence),
  "EVIDENCE_OBSERVATION_OWNER_MISMATCH"
);

const fragmentWithoutDocument = {
  documents: [],
  evidence: [
    {
      ...authorizedEvidence(),
      document_id: null
    }
  ]
};
expectCode(
  validatePartialModel(fragmentWithoutDocument),
  "EVIDENCE_FRAGMENT_DOCUMENT_REQUIRED"
);

expectCode(
  validatePrivacy({ path: "assets/evidence/../restricted.jpg" }),
  "PRIVACY_PATH_TRAVERSAL"
);
expectCode(
  validatePrivacy({ project_email: "persona@example.com" }),
  "PRIVACY_FORBIDDEN_KEY"
);
expectCode(
  validatePrivacy({ project_phone: "987 654 321" }),
  "PRIVACY_PHONE"
);
expectCode(
  validatePrivacy({ raw_payload: { secret: true } }),
  "PRIVACY_FORBIDDEN_KEY"
);
expectCode(
  validatePrivacy({ path: "C:\\Users\\Demo\\AppData\\Local\\Temp\\file.png" }),
  "PRIVACY_LOCAL_PATH"
);
for (const phone of [
  "+1 (202) 555-0123",
  "+51 1 615-0000",
  "01 615 0000",
  "615 0000"
]) {
  expectCode(validatePrivacy({ note: phone }), "PRIVACY_PHONE");
}
for (const privatePath of [
  "/etc/passwd",
  "\\\\server\\share\\evidence.png",
  "//server/share/evidence.png",
  "file:///C:/Users/Demo/evidence.png"
]) {
  expectCode(validatePrivacy({ path: privatePath }), "PRIVACY_LOCAL_PATH");
}
for (const traversal of [
  "assets/evidence/%2e%2e%2frestricted.jpg",
  "assets/evidence/%252e%252e%252frestricted.jpg"
]) {
  expectCode(
    validatePrivacy({ path: traversal }),
    "PRIVACY_PATH_TRAVERSAL"
  );
}
for (const safeValue of [
  "https://example.com/projects/987654321?range=807-1007",
  "project:nexo-3992",
  "807-1007",
  "a".repeat(64)
]) {
  assert.deepEqual(
    validatePrivacy({ value: safeValue }),
    [],
    `${safeValue} must not be a URL/ID privacy false positive`
  );
}

const tierAgencies = Array.from({ length: 30 }, (_, index) =>
  agency(index + 1, index < 5 ? "deep" : index < 15 ? "enriched" : "base")
);
const wrongTierCounts = {
  pilot_id: "pilot:test",
  version: "1",
  selected_at: "2026-07-28T00:00:00Z",
  selection_rule: "Regla controlada.",
  selection_reason: "Prueba de conteos.",
  agency_ids: tierAgencies.map((item) => item.agency_id),
  districts: ["Miraflores"],
  counts: {
    market_raw_count: 30,
    base_count: 30,
    enriched_count: 16,
    deep_count: 5
  }
};
expectCode(
  validatePartialModel({ agencies: tierAgencies }, { pilot: wrongTierCounts }),
  "PILOT_TIER_COUNT_MISMATCH"
);

const eventMismatch = validPartial();
eventMismatch.events[0].delta = 999;
expectCode(validatePartialModel(eventMismatch), "EVENT_DELTA_MISMATCH");

const eventDenominatorMismatch = validPartial();
eventDenominatorMismatch.facts[0] = {
  ...eventDenominatorMismatch.facts[0],
  semantic_type: "price_per_m2",
  field_name: "list_price_per_m2",
  unit: "PEN/m2",
  denominator_area_type: "built"
};
eventDenominatorMismatch.facts[1] = {
  ...eventDenominatorMismatch.facts[1],
  semantic_type: "price_per_m2",
  field_name: "list_price_per_m2",
  unit: "PEN/m2",
  denominator_area_type: "total"
};
eventDenominatorMismatch.events[0].field_name = "list_price_per_m2";
expectCode(
  validatePartialModel(eventDenominatorMismatch),
  "EVENT_DENOMINATOR_AREA_TYPE_MISMATCH"
);

const eventBaseMismatch = validPartial();
eventBaseMismatch.events[0].percentage_base_fact_id = "fact:test-after";
expectCode(
  validatePartialModel(eventBaseMismatch),
  "EVENT_PERCENTAGE_BASE_MISMATCH"
);

const eventEffectiveMismatch = validPartial();
eventEffectiveMismatch.events[0].effective_at =
  "2026-02-02T00:00:00Z";
expectCode(
  validatePartialModel(eventEffectiveMismatch),
  "EVENT_EFFECTIVE_AT_MISMATCH"
);

const eventQualityTooHigh = validPartial();
eventQualityTooHigh.facts[1].quality_status = "reviewable";
eventQualityTooHigh.facts[1].benchmark_eligible = false;
eventQualityTooHigh.facts[1].exclusion_reason =
  "ObservaciÃ³n pendiente de revisiÃ³n.";
expectCode(
  validatePartialModel(eventQualityTooHigh),
  "EVENT_QUALITY_TOO_HIGH"
);

const unknownAttribute = {
  ...priceFact("fact:test-unknown", "observation:test-before", 100),
  field_name: "air_conditioning",
  original_value: null,
  normalized_value: "unknown",
  unit: "text",
  semantic_type: "attribute",
  area_type: null,
  price_type: null,
  currency: null,
  confidence: "unknown",
  quality_status: "insufficient",
  benchmark_eligible: false,
  exclusion_reason: "Atributo ausente.",
  derivation: null
};
assert.deepEqual(
  validatePartialModel({
    observations: [observation("observation:test-before", "2026-01-01T00:00:00Z")],
    facts: [unknownAttribute]
  }),
  [],
  "unknown attribute must remain distinct from false"
);
const falseAttribute = clone(unknownAttribute);
falseAttribute.normalized_value = false;
expectCode(
  validatePartialModel({
    observations: [observation("observation:test-before", "2026-01-01T00:00:00Z")],
    facts: [falseAttribute]
  }),
  "UNKNOWN_NOT_FALSE"
);

const root = validRoot();
const rootBefore = clone(root);
const rootErrors = validateRootDocument(root);
assert.deepEqual(
  rootErrors,
  [],
  `valid future root v2 must pass:\n${rootErrors
    .map((error) => `${error.code} ${error.path}`)
    .join("\n")}`
);
assert.deepEqual(root, rootBefore, "root validation must not mutate input");
assert.deepEqual(validateData(root, { mode: "root" }), []);

for (const fixtureName of [
  "ct-a.json",
  "ct-b.json",
  "ct-d.json",
  "ct-e.json",
  "ct-g.json",
  "ct-h.json"
]) {
  const fixture = JSON.parse(
    readFileSync(join(FIXTURE_DIRECTORY, fixtureName), "utf8")
  );
  const fixtureErrors = validateFixture(fixture, { repositoryRoot: REPOSITORY_ROOT });
  assert.deepEqual(
    fixtureErrors,
    [],
    `${fixtureName} must satisfy envelope, $defs, semantics and assertions:\n${fixtureErrors
      .map((error) => `${error.code} ${error.path} ${error.message}`)
      .join("\n")}`
  );
}

const ctAFixture = JSON.parse(
  readFileSync(join(FIXTURE_DIRECTORY, "ct-a.json"), "utf8")
);

const fixtureInputMutation = clone(ctAFixture);
fixtureInputMutation.input.facts.find(
  (fact) => fact.fact_id === "fact:ct-a-total-area"
).normalized_value = 207;
expectCode(
  validateFixture(fixtureInputMutation, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  "FIXTURE_RESULT_MISMATCH"
);
expectCode(
  validateFixture(fixtureInputMutation, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  "FIXTURE_DERIVED_FACT_MISMATCH"
);

const fixtureDerivedFactMutation = clone(ctAFixture);
fixtureDerivedFactMutation.input.facts.find(
  (fact) => fact.fact_id === "fact:ct-a-free-area"
).normalized_value = 109;
const fixtureDerivedFactErrors = validateFixture(
  fixtureDerivedFactMutation,
  { repositoryRoot: REPOSITORY_ROOT }
);
expectCode(
  fixtureDerivedFactErrors,
  "FIXTURE_DERIVED_FACT_MISMATCH"
);
assert.equal(
  hasCode(fixtureDerivedFactErrors, "FIXTURE_RESULT_MISMATCH"),
  false,
  "derived fact mutation must be distinguished from expected.result mutation"
);

const fixtureAssertionMutation = clone(ctAFixture);
fixtureAssertionMutation.expected.assertions.find(
  (assertion) => assertion.assertion_id === "assertion:ct-a-free-area"
).expected_value = 109;
const fixtureAssertionErrors = validateFixture(fixtureAssertionMutation, {
  repositoryRoot: REPOSITORY_ROOT
});
expectCode(
  fixtureAssertionErrors,
  "FIXTURE_ASSERTION_FAILED"
);
assert.equal(
  hasCode(fixtureAssertionErrors, "FIXTURE_RESULT_MISMATCH"),
  false,
  "assertion mutation must not masquerade as result mutation"
);

const fixtureResultMutation = clone(ctAFixture);
fixtureResultMutation.expected.result.free_area = 109;
const fixtureResultErrors = validateFixture(fixtureResultMutation, {
  repositoryRoot: REPOSITORY_ROOT
});
expectCode(
  fixtureResultErrors,
  "FIXTURE_RESULT_MISMATCH"
);
assert.equal(
  hasCode(fixtureResultErrors, "FIXTURE_ASSERTION_FAILED"),
  false,
  "result mutation must be distinguished from assertion mutation"
);

const stableInvalid = validPartial();
stableInvalid.facts.push(clone(stableInvalid.facts[0]));
stableInvalid.observations[0].source_id = "source:missing";
assert.deepEqual(
  validatePartialModel(stableInvalid),
  validatePartialModel(stableInvalid),
  "errors must be stable across repeated validation"
);

const built = await buildDemoData({
  repositoryRoot: REPOSITORY_ROOT,
  write: false
});
assert.deepEqual(
  validateInspectorSemantics(built.payload.inspector, built.payload.model),
  []
);
const expectInspectorMutation = (mutate, code) => {
  const candidate = clone(built.payload);
  mutate(candidate);
  expectCode(
    validateInspectorSemantics(candidate.inspector, candidate.model),
    code
  );
};
expectInspectorMutation((candidate) => {
  candidate.inspector.default_case_id = "case:missing";
}, "INSPECTOR_DEFAULT_CASE_REFERENCE");
expectInspectorMutation((candidate) => {
  candidate.inspector.cases[0].typology_id = "typology:ct-b-controlled";
}, "INSPECTOR_CASE_TYPOLOGY_REFERENCE");
expectInspectorMutation((candidate) => {
  candidate.inspector.coverage.total_cases += 1;
}, "INSPECTOR_COVERAGE_MISMATCH");
expectInspectorMutation((candidate) => {
  candidate.inspector.cases[0].expected_quality_status = "reviewable";
}, "INSPECTOR_CASE_QUALITY");
expectInspectorMutation((candidate) => {
  candidate.inspector.assets[0].sha256 = "a".repeat(64);
}, "INSPECTOR_ASSET_DOCUMENT_SHA");
expectInspectorMutation((candidate) => {
  const documentId = candidate.inspector.assets[0].document_id;
  candidate.model.evidence.find(
    (record) => record.document_id === documentId
  ).fragment = "Documento original.";
}, "INSPECTOR_ASSET_REPRESENTATION_LABEL");
expectInspectorMutation((candidate) => {
  const documentId = candidate.inspector.assets[0].document_id;
  for (const inspectorCase of candidate.inspector.cases) {
    inspectorCase.document_ids = inspectorCase.document_ids.filter(
      (id) => id !== documentId
    );
  }
}, "INSPECTOR_ASSET_ORPHAN");

const benchmarkBuilt = await buildDemoData({
  repositoryRoot: REPOSITORY_ROOT,
  includeBenchmark: true,
  write: false
});
assert.deepEqual(
  validateBenchmarkSemantics(
    benchmarkBuilt.payload.benchmark,
    benchmarkBuilt.payload.model
  ),
  []
);
const benchmarkEntry = benchmarkBuilt.payload.benchmark.fact_index.find(
  ({ attribute_fact_ids: factIds }) => factIds.length > 0
);
const benchmarkAttributeFactId = benchmarkEntry.attribute_fact_ids[0];
const expectBenchmarkMutation = (mutate, code) => {
  const candidate = clone(benchmarkBuilt.payload);
  mutate(candidate);
  expectCode(
    validateBenchmarkSemantics(candidate.benchmark, candidate.model),
    code
  );
};
expectBenchmarkMutation((candidate) => {
  candidate.model.facts.find(
    ({ fact_id: factId }) => factId === benchmarkAttributeFactId
  ).normalized_value = "attribute:not-in-catalog";
}, "BENCHMARK_ATTRIBUTE_FACT_CATALOG");
expectBenchmarkMutation((candidate) => {
  candidate.model.facts.find(
    ({ fact_id: factId }) => factId === benchmarkAttributeFactId
  ).semantic_type = "text";
}, "BENCHMARK_ATTRIBUTE_FACT_SEMANTIC");
expectBenchmarkMutation((candidate) => {
  candidate.model.facts.find(
    ({ fact_id: factId }) => factId === benchmarkAttributeFactId
  ).original_value = null;
}, "BENCHMARK_FACT_ORIGINAL_MISSING");
expectBenchmarkMutation((candidate) => {
  const entry = candidate.benchmark.fact_index.find(
    ({ project_id: projectId }) => projectId === benchmarkEntry.project_id
  );
  const original = candidate.model.facts.find(
    ({ fact_id: factId }) => factId === benchmarkAttributeFactId
  );
  const duplicate = clone(original);
  duplicate.fact_id = "fact:benchmark-identity-duplicate";
  candidate.model.facts.push(duplicate);
  entry.attribute_fact_ids.push(duplicate.fact_id);
}, "BENCHMARK_FACT_IDENTITY_DUPLICATE");

console.log(
  "Data validator unit OK: schema keywords, partial/root/fixture modes, references, " +
    "tiers, eligibility, currencies, denominators, permissions, inspector, benchmark, events and privacy verified."
);
