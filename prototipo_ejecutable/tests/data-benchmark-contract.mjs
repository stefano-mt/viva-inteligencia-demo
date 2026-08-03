import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadContractSchema,
  validateRootDocument,
  validateSchemaShape
} from "../scripts/data/validate.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const prototypeRoot = path.resolve(testDirectory, "..");
const schema = loadContractSchema(
  path.join(prototypeRoot, "contracts", "demo-v2.schema.json")
);
const publicData = JSON.parse(
  await fs.readFile(
    path.join(prototypeRoot, "public", "demo-data", "viva-platform-demo.json"),
    "utf8"
  )
);
const assetExists = (logicalPath) =>
  existsSync(path.join(prototypeRoot, "public", ...logicalPath.split("/")));

function makeBenchmarkFixture() {
  const projectId = "project:ct-a-controlled";
  return {
    version: 1,
    methodology: {
      cutoff_at: "2026-07-30T00:00:00-05:00",
      minimum_quantitative_sample: 3,
      minimum_qualitative_informed_sample: 5,
      quantile_method: "R7",
      price_type_policy: "from",
      allowed_area_denominators: ["total"],
      pairing_policy: "source_paired_only",
      exclusion_reason_precedence: [
        "restricted",
        "blocking_issue",
        "conflicting_observations",
        "price_area_link_unresolved",
        "currency",
        "area_denominator",
        "cutoff",
        "missing"
      ],
      certification_label: "Elegible según las reglas de la demo"
    },
    fact_index: [
      {
        project_id: projectId,
        observation_id: "observation:ct-a-inputs",
        total_area_fact_id: "fact:ct-a-total-area",
        published_price_fact_id: "fact:ct-a-scenario-price",
        price_per_m2_fact_id: "fact:ct-a-price-per-total-m2",
        pairing_status: "project_minima_pair_unresolved",
        pairing_basis: "project_minima",
        pairing_evidence_ids: [],
        reported_unit_count_fact_id: null,
        parking_count_fact_id: null,
        attribute_fact_ids: []
      }
    ],
    attribute_catalog: [
      {
        attribute_id: "attribute:coworking",
        category: "meetings_work",
        normalized_label: "Coworking",
        aliases: ["coworking", "sala de coworking"]
      }
    ],
    coverage: {
      indicators: {
        price_per_m2_total: {
          input_project_ids: [projectId],
          used_project_ids: [],
          missing_project_ids: [],
          excluded_projects: [
            {
              project_id: projectId,
              reasons: ["price_area_link_unresolved"]
            }
          ]
        },
        units_reported: {
          input_project_ids: [projectId],
          used_project_ids: [],
          missing_project_ids: [projectId],
          excluded_projects: []
        },
        attributes_announced: {
          input_project_ids: [projectId],
          used_project_ids: [],
          missing_project_ids: [projectId],
          excluded_projects: []
        }
      }
    }
  };
}

function projectForEntity(model, entityId) {
  if (entityId.startsWith("project:")) return entityId;
  return model.typologies.find(({ typology_id }) => typology_id === entityId)
    ?.project_id;
}

function benchmarkSemanticErrors(document) {
  if (!document.benchmark) return [];
  const { benchmark, model } = document;
  const projects = new Set(model.projects.map(({ project_id }) => project_id));
  const observations = new Map(
    model.observations.map((entry) => [entry.observation_id, entry])
  );
  const facts = new Map(model.facts.map((entry) => [entry.fact_id, entry]));
  const evidence = new Map(
    model.evidence.map((entry) => [entry.evidence_id, entry])
  );
  const errors = [];
  const indexedProjects = new Set();

  for (const entry of benchmark.fact_index) {
    if (indexedProjects.has(entry.project_id)) errors.push("duplicate_project_index");
    indexedProjects.add(entry.project_id);
    if (!projects.has(entry.project_id)) errors.push("project_id");
    const observation = observations.get(entry.observation_id);
    if (!observation) errors.push("observation_id");
    if (
      observation &&
      projectForEntity(model, observation.entity_id) !== entry.project_id
    ) {
      errors.push("observation_project");
    }
    for (const factId of [
      entry.total_area_fact_id,
      entry.published_price_fact_id,
      entry.price_per_m2_fact_id,
      entry.reported_unit_count_fact_id,
      entry.parking_count_fact_id,
      ...entry.attribute_fact_ids
    ].filter(Boolean)) {
      const fact = facts.get(factId);
      if (!fact) {
        errors.push("fact_id");
      } else if (projectForEntity(model, fact.entity_id) !== entry.project_id) {
        errors.push("fact_project");
      }
    }
    if (entry.pairing_evidence_ids.some((id) => !evidence.has(id))) {
      errors.push("pairing_evidence_ids");
    }
    if (
      entry.pairing_evidence_ids.some((id) => {
        const evidenceEntry = evidence.get(id);
        const evidenceObservation = evidenceEntry
          ? observations.get(evidenceEntry.observation_id)
          : null;
        return (
          evidenceObservation &&
          projectForEntity(model, evidenceObservation.entity_id) !==
            entry.project_id
        );
      })
    ) {
      errors.push("pairing_evidence_project");
    }
    if (entry.pairing_status === "source_paired") {
      const pricePerM2 = facts.get(entry.price_per_m2_fact_id);
      const publishedPrice = facts.get(entry.published_price_fact_id);
      const totalArea = facts.get(entry.total_area_fact_id);
      if (!entry.pairing_evidence_ids.length) errors.push("source_paired_evidence");
      if (
        !["offer_id", "typology_id", "native_metric"].includes(
          entry.pairing_basis
        )
      ) {
        errors.push("source_paired_basis");
      }
      if (
        !pricePerM2?.benchmark_eligible ||
        pricePerM2?.semantic_type !== "price_per_m2" ||
        pricePerM2?.denominator_area_type !== "total"
      ) {
        errors.push("source_paired_price_per_m2");
      }
      if (
        !publishedPrice?.benchmark_eligible ||
        publishedPrice?.semantic_type !== "price" ||
        publishedPrice?.price_type !== "from"
      ) {
        errors.push("source_paired_price");
      }
      if (
        !totalArea?.benchmark_eligible ||
        totalArea?.semantic_type !== "area" ||
        totalArea?.area_type !== "total"
      ) {
        errors.push("source_paired_total_area");
      }
    }
  }

  const indicators = Object.entries(benchmark.coverage.indicators);
  if (!indicators.length) errors.push("empty_indicators");
  for (const [indicatorId, coverage] of indicators) {
    const input = new Set(coverage.input_project_ids);
    const used = new Set(coverage.used_project_ids);
    const missing = new Set(coverage.missing_project_ids);
    const excluded = new Set(
      coverage.excluded_projects.map(({ project_id }) => project_id)
    );
    if (excluded.size !== coverage.excluded_projects.length) {
      errors.push(`${indicatorId}:duplicate_excluded`);
    }
    const output = [...used, ...missing, ...excluded];
    if (output.length !== new Set(output).size) errors.push(`${indicatorId}:overlap`);
    if (
      input.size !== output.length ||
      [...input].some((projectId) => !output.includes(projectId))
    ) {
      errors.push(`${indicatorId}:partition`);
    }
    if ([...input].some((projectId) => !projects.has(projectId))) {
      errors.push(`${indicatorId}:project_id`);
    }
    if (indicatorId === "price_per_m2_total") {
      const pairedProjects = new Set(
        benchmark.fact_index
          .filter(({ pairing_status }) => pairing_status === "source_paired")
          .map(({ project_id }) => project_id)
      );
      if ([...used].some((projectId) => !pairedProjects.has(projectId))) {
        errors.push("price_per_m2_total:unpaired_used");
      }
    }
  }

  const attributeIds = benchmark.attribute_catalog.map(
    ({ attribute_id }) => attribute_id
  );
  if (attributeIds.length !== new Set(attributeIds).size) {
    errors.push("duplicate_attribute_id");
  }
  if (
    benchmark.attribute_catalog.some(
      ({ normalized_label }) => normalized_label.trim().toLowerCase() === "otros"
    )
  ) {
    errors.push("canonical_otros");
  }
  return errors;
}

const benchmark = makeBenchmarkFixture();
assert.deepEqual(
  validateSchemaShape(benchmark, "benchmark", {
    rootSchema: schema,
    path: "$.benchmark"
  }),
  [],
  "Benchmark 2.3 shape must be closed and valid"
);

const payload23 = structuredClone(publicData);
payload23.metadata.contract_version = "2.3.0";
payload23.benchmark = benchmark;
assert.deepEqual(
  validateRootDocument(payload23, { schema, assetExists }),
  [],
  "a complete 2.3 payload must validate"
);
assert.deepEqual(
  benchmarkSemanticErrors(payload23),
  [],
  "unpaired project minima must remain explicit, partitioned and ineligible"
);

const missingBenchmark = structuredClone(payload23);
delete missingBenchmark.benchmark;
assert.ok(
  validateRootDocument(missingBenchmark, { schema, assetExists }).some(
    ({ code }) => code === "SCHEMA_REQUIRED"
  ),
  "2.3 requires benchmark"
);

const illegalPairedShape = structuredClone(benchmark);
illegalPairedShape.fact_index[0].pairing_status = "source_paired";
illegalPairedShape.fact_index[0].pairing_basis = "project_minima";
assert.ok(
  validateSchemaShape(illegalPairedShape, "benchmark", {
    rootSchema: schema,
    path: "$.benchmark"
  }).length > 0,
  "source_paired requires documented basis and evidence"
);

const arithmeticPromotion = structuredClone(payload23);
arithmeticPromotion.benchmark.fact_index[0].pairing_status = "source_paired";
arithmeticPromotion.benchmark.fact_index[0].pairing_basis = "native_metric";
arithmeticPromotion.benchmark.fact_index[0].pairing_evidence_ids = [
  "evidence:f3-ct-a-measurement"
];
assert.ok(
  benchmarkSemanticErrors(arithmeticPromotion).some((error) =>
    ["source_paired_price_per_m2", "source_paired_price"].includes(error)
  ),
  "arithmetic coincidence cannot promote ineligible project minima"
);
assert.ok(
  validateRootDocument(arithmeticPromotion, { schema, assetExists }).some(
    ({ code }) =>
      [
        "BENCHMARK_SOURCE_PAIRED_PRICE_PER_M2",
        "BENCHMARK_SOURCE_PAIRED_PRICE"
      ].includes(code)
  ),
  "the real reader must reject arithmetic promotion"
);

const overlappingPartition = structuredClone(payload23);
overlappingPartition.benchmark.coverage.indicators.units_reported.used_project_ids = [
  "project:ct-a-controlled"
];
assert.ok(
  benchmarkSemanticErrors(overlappingPartition).includes("units_reported:overlap"),
  "indicator coverage partitions must be disjoint"
);
assert.ok(
  validateRootDocument(overlappingPartition, { schema, assetExists }).some(
    ({ code }) => code === "BENCHMARK_COVERAGE_OVERLAP"
  ),
  "the real reader must reject overlapping partitions"
);

const incompletePartition = structuredClone(payload23);
incompletePartition.benchmark.coverage.indicators.units_reported.missing_project_ids =
  [];
assert.ok(
  validateRootDocument(incompletePartition, { schema, assetExists }).some(
    ({ code }) => code === "BENCHMARK_COVERAGE_PARTITION"
  ),
  "the real reader must reject incomplete partitions"
);

const emptyIndicators = structuredClone(payload23);
emptyIndicators.benchmark.coverage.indicators = {};
assert.ok(
  benchmarkSemanticErrors(emptyIndicators).includes("empty_indicators"),
  "coverage must declare at least one indicator"
);
assert.ok(
  validateRootDocument(emptyIndicators, { schema, assetExists }).some(
    ({ code }) => code === "BENCHMARK_INDICATORS_EMPTY"
  ),
  "the real reader must reject empty coverage"
);

const forbiddenCatchAll = structuredClone(payload23);
forbiddenCatchAll.benchmark.attribute_catalog[0].normalized_label = "Otros";
assert.ok(
  benchmarkSemanticErrors(forbiddenCatchAll).includes("canonical_otros"),
  "Otros must not become a canonical attribute"
);
assert.ok(
  validateRootDocument(forbiddenCatchAll, { schema, assetExists }).some(
    ({ code }) => code === "BENCHMARK_ATTRIBUTE_OTHERS"
  ),
  "the real reader must reject canonical Otros"
);

const duplicateAttributeId = structuredClone(payload23);
duplicateAttributeId.benchmark.attribute_catalog.push({
  attribute_id: "attribute:coworking",
  category: "common_services",
  normalized_label: "Sala multiuso",
  aliases: ["sala multiuso"]
});
assert.ok(
  validateRootDocument(duplicateAttributeId, { schema, assetExists }).some(
    ({ code }) => code === "BENCHMARK_ATTRIBUTE_DUPLICATE_ID"
  ),
  "the real reader must reject duplicate attribute IDs"
);

const danglingReferences = structuredClone(payload23);
danglingReferences.benchmark.fact_index[0].project_id =
  "project:missing-benchmark-project";
danglingReferences.benchmark.fact_index[0].observation_id =
  "observation:missing-benchmark-observation";
assert.ok(
  validateRootDocument(danglingReferences, { schema, assetExists }).some(
    ({ code }) => code === "BENCHMARK_PROJECT_REFERENCE"
  ),
  "the real reader must reject dangling benchmark project references"
);
assert.ok(
  validateRootDocument(danglingReferences, { schema, assetExists }).some(
    ({ code }) => code === "BENCHMARK_OBSERVATION_REFERENCE"
  ),
  "the real reader must reject dangling benchmark observation references"
);

console.log(
  "Benchmark contract OK: 2.3 is closed, ID-referenced, partitioned and source-paired-only."
);
