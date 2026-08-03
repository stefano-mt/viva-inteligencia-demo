import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  buildBenchmarkContext,
  buildComparisonModel,
  buildQualitativeBenchmark,
  buildQuantitativeBenchmark,
  qualitativeSampleStatus,
  quantitativeSampleStatus,
  quantileR7
} from "../public/js/benchmark.js";

async function readJson(relativePath) {
  return JSON.parse(
    await fs.readFile(new URL(relativePath, import.meta.url), "utf8")
  );
}

const [data, ctA, ctB, ctC, ctD, ctG, ctI, ctP, source] = await Promise.all([
  readJson("../public/demo-data/viva-platform-demo.json"),
  readJson("./e2e-scenarios/ct-a-benchmark.json"),
  readJson("./e2e-scenarios/ct-b-benchmark.json"),
  readJson("./e2e-scenarios/ct-c-benchmark.json"),
  readJson("./e2e-scenarios/ct-d-benchmark.json"),
  readJson("./e2e-scenarios/ct-g-benchmark.json"),
  readJson("./e2e-scenarios/ct-i-benchmark.json"),
  readJson("./e2e-scenarios/ct-p-benchmark.json"),
  fs.readFile(new URL("../public/js/benchmark.js", import.meta.url), "utf8")
]);
const methodology = data.benchmark.methodology;

const coverageShape = (coverage) => ({
  input_project_ids: coverage.inputProjectIds,
  used_project_ids: coverage.usedProjectIds,
  missing_project_ids: coverage.missingProjectIds,
  excluded_projects: coverage.excludedProjects.map(({ projectId, reasons }) => ({
    project_id: projectId,
    reasons
  }))
});

assert.equal(data.metadata.contract_version, "2.3.0");
assert.doesNotMatch(
  source,
  /\b(?:window|document|fetch|XMLHttpRequest|localStorage|sessionStorage)\b/,
  "the domain engine must not depend on DOM, network or browser state"
);

assert.equal(quantileR7([10, 20, 30, 40], 0.25), 17.5);
assert.equal(quantileR7([10, 20, 30, 40], 0.5), 25);
assert.equal(quantileR7([10, 20, 30, 40], 0.75), 32.5);
assert.equal(quantileR7([40, 10, Number.NaN, 20, 30], 0.5), 25);
assert.equal(quantileR7([], 0.5), null);
assert.equal(quantileR7([1], -1), null);

for (const sampleCase of ctP.input.sample_size_cases) {
  assert.equal(
    quantitativeSampleStatus(sampleCase.n),
    sampleCase.quantitative_state,
    `quantitative n=${sampleCase.n}`
  );
  assert.equal(
    qualitativeSampleStatus(sampleCase.n),
    sampleCase.qualitative_state,
    `qualitative n=${sampleCase.n}`
  );
}
assert.equal(quantitativeSampleStatus(-1), "error");
assert.equal(qualitativeSampleStatus(1.5), "error");

function evidenceRecord(evidenceId, permission = "authorized") {
  return {
    evidence_id: evidenceId,
    availability: "available",
    publish_permission: permission
  };
}

function pairedFacts(projectId, suffix, price, area, value) {
  const priceId = `fact:${suffix}-price`;
  const areaId = `fact:${suffix}-area`;
  const metricId = `fact:${suffix}-ppm2`;
  return {
    priceId,
    areaId,
    metricId,
    facts: [
      {
        fact_id: priceId,
        entity_id: projectId,
        semantic_type: "price",
        normalized_value: price,
        unit: "PEN",
        currency: "PEN",
        price_type: "from",
        value_kind: "observed",
        quality_status: "certified",
        benchmark_eligible: true
      },
      {
        fact_id: areaId,
        entity_id: projectId,
        semantic_type: "area",
        normalized_value: area,
        unit: "m2",
        area_type: "total",
        value_kind: "observed",
        quality_status: "certified",
        benchmark_eligible: true
      },
      {
        fact_id: metricId,
        entity_id: projectId,
        semantic_type: "price_per_m2",
        normalized_value: value,
        unit: "PEN/m2",
        currency: "PEN",
        price_type: "from",
        denominator_area_type: "total",
        quality_status: "certified",
        benchmark_eligible: true,
        value_kind: "derived",
        derivation: {
          formula: "published_price_from / total_area",
          input_fact_ids: [priceId, areaId],
          rounding: { mode: "half_up", digits: 2 }
        }
      }
    ]
  };
}

function pairedEntry({
  projectId,
  observationId,
  evidenceId,
  ids,
  status = "source_paired",
  basis = "offer_id"
}) {
  return {
    project_id: projectId,
    observation_id: observationId,
    published_price_fact_id: ids.priceId,
    total_area_fact_id: ids.areaId,
    price_per_m2_fact_id: ids.metricId,
    pairing_status: status,
    pairing_basis: basis,
    pairing_evidence_ids: evidenceId ? [evidenceId] : [],
    attribute_fact_ids: []
  };
}

// CT-A: the scenario price and built area remain preserved but blocked.
const ctAProjectId = ctA.input.project_id;
const ctAFacts = ctA.input.facts.map((fact) => ({
  ...fact,
  entity_id: ctAProjectId,
  currency: fact.semantic_type === "price_per_m2" ? "PEN" : fact.currency,
  price_type:
    fact.semantic_type === "price_per_m2" ? "from" : fact.price_type,
  quality_status: "reviewable"
}));
const ctAResult = buildQuantitativeBenchmark({
  projectIds: [ctAProjectId],
  entries: [
    {
      project_id: ctAProjectId,
      observation_id: "observation:ct-a",
      price_per_m2_fact_id: "fact:ct-a-price-per-total-m2",
      pairing_status: "project_minima_pair_unresolved",
      pairing_basis: "project_minima",
      pairing_evidence_ids: []
    }
  ],
  facts: ctAFacts,
  evidence: [],
  blockingProjects: new Map([
    [ctAProjectId, [{ issue_id: "issue:ct-a-area-and-scenario-price" }]]
  ]),
  methodology
});
assert.equal(ctAResult.status, ctA.expected.quantitative_state);
assert.equal(ctAResult.n, 0);
assert.deepEqual(coverageShape(ctAResult.coverage), ctA.expected.coverage);
assert.equal(
  ctAFacts.filter(({ semantic_type: type }) => type === "area").length,
  2,
  "built and total facts must remain distinct"
);

// CT-B: incompatible observations remain visible and no truth is selected.
const ctBProjectId = ctB.input.project_id;
const ctBPairA = pairedFacts(ctBProjectId, "ct-b-a", 600000, 100, 6000);
const ctBPairB = pairedFacts(ctBProjectId, "ct-b-b", 625000, 100, 6250);
const ctBResult = buildQuantitativeBenchmark({
  projectIds: [ctBProjectId],
  entries: [
    pairedEntry({
      projectId: ctBProjectId,
      observationId: "observation:ct-b-a",
      evidenceId: "evidence:ct-b-a",
      ids: ctBPairA
    }),
    pairedEntry({
      projectId: ctBProjectId,
      observationId: "observation:ct-b-b",
      evidenceId: "evidence:ct-b-b",
      ids: ctBPairB
    })
  ],
  facts: [...ctBPairA.facts, ...ctBPairB.facts],
  evidence: [evidenceRecord("evidence:ct-b-a"), evidenceRecord("evidence:ct-b-b")],
  methodology
});
assert.equal(ctBResult.status, ctB.expected.quantitative_state);
assert.equal(ctBResult.n, 0);
assert.deepEqual(coverageShape(ctBResult.coverage), ctB.expected.coverage);

// CT-P: dedupe, conflict, restricted, missing and unresolved form one partition.
const ctPEntries = [];
const ctPFacts = [];
const ctPEvidence = [];
const sharedPair = pairedFacts(
  "project:ct-p-source-paired",
  "ct-p-shared",
  450000,
  75,
  6000
);
ctPFacts.push(...sharedPair.facts);
for (const record of ctP.input.records) {
  if (record.pairing_status === "missing") {
    ctPEntries.push({
      project_id: record.project_id,
      observation_id: record.observation_id,
      price_per_m2_fact_id: null,
      pairing_status: "missing",
      pairing_basis: "none",
      pairing_evidence_ids: [],
      attribute_fact_ids: []
    });
    continue;
  }
  if (record.pairing_status === "project_minima_pair_unresolved") {
    const unresolvedIds = pairedFacts(
      record.project_id,
      "ct-p-unresolved",
      record.published_price,
      record.total_area,
      record.price_per_m2
    );
    const unresolvedMetric = unresolvedIds.facts.find(
      ({ fact_id: factId }) => factId === unresolvedIds.metricId
    );
    unresolvedMetric.quality_status = "reviewable";
    unresolvedMetric.benchmark_eligible = false;
    unresolvedMetric.derivation.formula =
      "published_price_from / total_area_min";
    ctPFacts.push(...unresolvedIds.facts);
    ctPEntries.push({
      project_id: record.project_id,
      observation_id: record.observation_id,
      published_price_fact_id: unresolvedIds.priceId,
      total_area_fact_id: unresolvedIds.areaId,
      price_per_m2_fact_id: unresolvedIds.metricId,
      pairing_status: record.pairing_status,
      pairing_basis: record.pairing_basis,
      pairing_evidence_ids: [],
      attribute_fact_ids: []
    });
    continue;
  }
  let ids = sharedPair;
  if (record.project_id !== "project:ct-p-source-paired") {
    ids = pairedFacts(
      record.project_id,
      record.record_id.replace("record:", "").replaceAll(":", "-"),
      record.published_price,
      record.total_area,
      record.price_per_m2
    );
    ctPFacts.push(...ids.facts);
  }
  ctPEntries.push(
    pairedEntry({
      projectId: record.project_id,
      observationId: record.observation_id,
      evidenceId: record.pairing_evidence_ids[0],
      ids
    })
  );
  ctPEvidence.push(
    evidenceRecord(record.pairing_evidence_ids[0], record.publish_permission)
  );
}
const ctPInputProjectIds = ctP.expected.coverage.input_project_ids;
const ctPBefore = structuredClone({ ctPEntries, ctPFacts, ctPEvidence });
const ctPResult = buildQuantitativeBenchmark({
  projectIds: ctPInputProjectIds,
  entries: ctPEntries,
  facts: ctPFacts,
  evidence: ctPEvidence,
  methodology
});
assert.deepEqual(
  { ctPEntries, ctPFacts, ctPEvidence },
  ctPBefore,
  "the quantitative engine must not mutate its inputs"
);
assert.equal(ctPResult.status, ctP.expected.eligible_quantitative_state);
assert.equal(ctPResult.n, ctP.expected.eligible_n);
assert.deepEqual(ctPResult.values, ctP.expected.eligible_values);
assert.equal(ctPResult.orientative.status, ctP.expected.orientative_series_state);
assert.equal(ctPResult.orientative.n, ctP.expected.orientative_series_n);
assert.deepEqual(ctPResult.orientative.values, ctP.expected.orientative_values);
assert.deepEqual(coverageShape(ctPResult.coverage), ctP.expected.coverage);
assert.deepEqual(
  ctPResult.records[0].provenanceObservationIds,
  ctP.expected.deduplicated_provenance_observation_ids
);
assert.equal(ctPResult.records[0].projectId, "project:ct-p-source-paired");

const sourcePairedWithoutEvidence = buildQuantitativeBenchmark({
  projectIds: ["project:ct-p-source-paired"],
  entries: [
    pairedEntry({
      projectId: "project:ct-p-source-paired",
      observationId: "observation:ct-p-no-evidence",
      evidenceId: null,
      ids: sharedPair
    })
  ],
  facts: sharedPair.facts,
  evidence: [],
  methodology
});
assert.equal(sourcePairedWithoutEvidence.n, 0);
assert.deepEqual(
  sourcePairedWithoutEvidence.coverage.excludedProjects[0].reasons,
  ["conflicting_observations"]
);
const sameRatioDifferentPair = pairedFacts(
  "project:ct-p-source-paired",
  "ct-p-same-ratio-different-pair",
  600000,
  100,
  6000
);
const conflictingSameRatio = buildQuantitativeBenchmark({
  projectIds: ["project:ct-p-source-paired"],
  entries: [
    pairedEntry({
      projectId: "project:ct-p-source-paired",
      observationId: "observation:ct-p-original-pair",
      evidenceId: "evidence:ct-p-original-pair",
      ids: sharedPair
    }),
    pairedEntry({
      projectId: "project:ct-p-source-paired",
      observationId: "observation:ct-p-different-pair",
      evidenceId: "evidence:ct-p-different-pair",
      ids: sameRatioDifferentPair
    })
  ],
  facts: [...sharedPair.facts, ...sameRatioDifferentPair.facts],
  evidence: [
    evidenceRecord("evidence:ct-p-original-pair"),
    evidenceRecord("evidence:ct-p-different-pair")
  ],
  methodology
});
assert.equal(conflictingSameRatio.n, 0);
assert.deepEqual(
  conflictingSameRatio.coverage.excludedProjects[0].reasons,
  ["conflicting_observations"],
  "equal ratios derived from different price-area pairs are a conflict, not a duplicate"
);
const ineligibleMetric = {
  ...structuredClone(sharedPair.facts.find(({ fact_id: factId }) => factId === sharedPair.metricId)),
  fact_id: "fact:ct-p-shared-ppm2-ineligible",
  quality_status: "reviewable",
  benchmark_eligible: false,
  exclusion_reason: "Controlled eligibility conflict"
};
const eligibilityConflict = buildQuantitativeBenchmark({
  projectIds: ["project:ct-p-source-paired"],
  entries: [
    pairedEntry({
      projectId: "project:ct-p-source-paired",
      observationId: "observation:ct-p-eligible",
      evidenceId: "evidence:ct-p-eligible",
      ids: sharedPair
    }),
    pairedEntry({
      projectId: "project:ct-p-source-paired",
      observationId: "observation:ct-p-ineligible",
      evidenceId: "evidence:ct-p-ineligible",
      ids: { ...sharedPair, metricId: ineligibleMetric.fact_id }
    })
  ],
  facts: [...sharedPair.facts, ineligibleMetric],
  evidence: [
    evidenceRecord("evidence:ct-p-eligible"),
    evidenceRecord("evidence:ct-p-ineligible")
  ],
  methodology
});
assert.equal(eligibilityConflict.n, 0);
assert.deepEqual(
  eligibilityConflict.coverage.excludedProjects[0].reasons,
  ["conflicting_observations"],
  "observations with different quality or eligibility must never merge"
);
const impossiblePair = pairedFacts(
  "project:ct-p-impossible",
  "ct-p-impossible",
  600000,
  100,
  7000
);
impossiblePair.facts.find(
  ({ fact_id: factId }) => factId === impossiblePair.metricId
).unit = "WRONG";
for (const fact of impossiblePair.facts.filter(
  ({ fact_id: factId }) => factId !== impossiblePair.metricId
)) {
  fact.quality_status = "reviewable";
}
const impossiblePairResult = buildQuantitativeBenchmark({
  projectIds: ["project:ct-p-impossible"],
  entries: [
    pairedEntry({
      projectId: "project:ct-p-impossible",
      observationId: "observation:ct-p-impossible",
      evidenceId: "evidence:ct-p-impossible",
      ids: impossiblePair
    })
  ],
  facts: impossiblePair.facts,
  evidence: [evidenceRecord("evidence:ct-p-impossible")],
  methodology
});
assert.equal(impossiblePairResult.n, 0);
assert.deepEqual(
  impossiblePairResult.coverage.excludedProjects[0].reasons,
  ["conflicting_observations"],
  "an incoherent source pair must never become an eligible metric"
);

// CT-D: explicit unknown is not converted into false; restricted evidence is inert.
const qualitativeProjectId = ctD.input.project_id;
const quartzFact = {
  fact_id: "fact:ct-d-countertop-material",
  observation_id: "observation:ct-d",
  entity_id: qualitativeProjectId,
  field_name: "countertop_material",
  semantic_type: "attribute",
  original_value: "cuarzo",
  normalized_value: "attribute:countertop-quartz",
  benchmark_eligible: true
};
const unknownAirFact = {
  fact_id: "fact:ct-d-air-conditioning",
  observation_id: "observation:ct-d",
  entity_id: qualitativeProjectId,
  field_name: "air_conditioning",
  semantic_type: "attribute",
  original_value: null,
  normalized_value: "unknown",
  benchmark_eligible: false
};
const ctDResult = buildQualitativeBenchmark({
  projectIds: [qualitativeProjectId],
  entries: [
    {
      project_id: qualitativeProjectId,
      attribute_fact_ids: [quartzFact.fact_id, unknownAirFact.fact_id]
    }
  ],
  facts: [quartzFact, unknownAirFact],
  observations: [
    {
      observation_id: "observation:ct-d",
      evidence_ids: ["evidence:ct-d-countertop-fragment"]
    }
  ],
  evidence: [
    evidenceRecord("evidence:ct-d-countertop-fragment"),
    evidenceRecord("evidence:ct-d-restricted-metadata", "restricted")
  ],
  attributeCatalog: [
    {
      attribute_id: "attribute:countertop-quartz",
      category: "finishes",
      normalized_label: "Cuarzo"
    },
    {
      attribute_id: "attribute:air-conditioning",
      category: "comfort",
      normalized_label: "Aire acondicionado"
    }
  ],
  methodology
});
const quartz = ctDResult.attributes.find(
  ({ attributeId }) => attributeId === "attribute:countertop-quartz"
);
const airConditioning = ctDResult.attributes.find(
  ({ attributeId }) => attributeId === "attribute:air-conditioning"
);
assert.equal(quartz.status, ctD.expected.countertop_state);
assert.equal(quartz.informedProjectCount, ctD.expected.countertop_informed_project_count);
assert.deepEqual(quartz.documentedProjectIds, [qualitativeProjectId]);
assert.equal(airConditioning.status, ctD.expected.air_conditioning_state);
assert.equal(airConditioning.prevalencePercent, null);
assert.equal(airConditioning.announcedProjectCount, 0);
assert.deepEqual(airConditioning.coverage, {
  inputProjectIds: [qualitativeProjectId],
  usedProjectIds: [],
  missingProjectIds: [qualitativeProjectId],
  excludedProjects: []
});
assert.deepEqual(coverageShape(ctDResult.coverage), ctD.expected.coverage);
const mixedUnknownRestrictedFact = {
  ...unknownAirFact,
  fact_id: "fact:ct-d-air-conditioning-restricted",
  observation_id: "observation:ct-d-air-conditioning-restricted"
};
const mixedUnknownRestricted = buildQualitativeBenchmark({
  projectIds: [qualitativeProjectId],
  entries: [
    {
      project_id: qualitativeProjectId,
      attribute_fact_ids: [quartzFact.fact_id, mixedUnknownRestrictedFact.fact_id]
    }
  ],
  facts: [quartzFact, mixedUnknownRestrictedFact],
  observations: [
    {
      observation_id: "observation:ct-d",
      evidence_ids: ["evidence:ct-d-countertop-fragment"]
    },
    {
      observation_id: "observation:ct-d-air-conditioning-restricted",
      evidence_ids: ["evidence:ct-d-air-conditioning-restricted"]
    }
  ],
  evidence: [
    evidenceRecord("evidence:ct-d-countertop-fragment"),
    evidenceRecord("evidence:ct-d-air-conditioning-restricted", "restricted")
  ],
  attributeCatalog: [
    {
      attribute_id: "attribute:countertop-quartz",
      category: "finishes",
      normalized_label: "Cuarzo"
    },
    {
      attribute_id: "attribute:air-conditioning",
      category: "comfort",
      normalized_label: "Aire acondicionado"
    }
  ],
  methodology
});
const mixedAirConditioning = mixedUnknownRestricted.attributes.find(
  ({ attributeId }) => attributeId === "attribute:air-conditioning"
);
assert.deepEqual(mixedAirConditioning.missingProjectIds, []);
assert.deepEqual(
  mixedAirConditioning.excludedProjects[0].reasons,
  ["restricted"],
  "restricted must dominate unknown in the per-attribute partition"
);
const conflictingQualitative = buildQualitativeBenchmark({
  projectIds: [qualitativeProjectId],
  entries: [
    { project_id: qualitativeProjectId, attribute_fact_ids: [quartzFact.fact_id] },
    {
      project_id: qualitativeProjectId,
      attribute_fact_ids: [quartzFact.fact_id, unknownAirFact.fact_id]
    }
  ],
  facts: [quartzFact, unknownAirFact],
  observations: [],
  evidence: [],
  attributeCatalog: [
    {
      attribute_id: "attribute:countertop-quartz",
      category: "finishes",
      normalized_label: "Cuarzo"
    }
  ],
  methodology
});
assert.equal(conflictingQualitative.status, "insufficient");
assert.deepEqual(
  conflictingQualitative.coverage.excludedProjects[0].reasons,
  ["conflicting_observations"]
);
const restrictedAttribute = {
  fact_id: "fact:ct-d-restricted",
  observation_id: "observation:ct-d-restricted",
  entity_id: "project:ct-d-restricted",
  field_name: "restricted_example",
  semantic_type: "attribute",
  original_value: null,
  normalized_value: null,
  benchmark_eligible: false
};
const restrictedQualitative = buildQualitativeBenchmark({
  projectIds: ["project:ct-d-restricted"],
  entries: [
    {
      project_id: "project:ct-d-restricted",
      attribute_fact_ids: [restrictedAttribute.fact_id]
    }
  ],
  facts: [restrictedAttribute],
  observations: [
    {
      observation_id: "observation:ct-d-restricted",
      evidence_ids: ["evidence:ct-d-restricted-metadata"]
    }
  ],
  evidence: [evidenceRecord("evidence:ct-d-restricted-metadata", "restricted")],
  attributeCatalog: [
    {
      attribute_id: "attribute:restricted-example",
      category: "controlled",
      normalized_label: "Ejemplo restringido"
    }
  ],
  methodology
});
assert.deepEqual(
  restrictedQualitative.coverage.excludedProjects[0].reasons,
  ["restricted"]
);
const restrictedProjects = Array.from({ length: 5 }, (_, index) =>
  `project:ct-d-restricted-${index + 1}`
);
const restrictedEligibleFacts = restrictedProjects.map((projectId, index) => ({
  fact_id: `fact:ct-d-restricted-eligible-${index + 1}`,
  observation_id: `observation:ct-d-restricted-${index + 1}`,
  entity_id: projectId,
  field_name: "restricted_example",
  semantic_type: "attribute",
  original_value: "No publicar",
  normalized_value: "attribute:restricted-example",
  benchmark_eligible: true
}));
const restrictedEligibleResult = buildQualitativeBenchmark({
  projectIds: restrictedProjects,
  entries: restrictedEligibleFacts.map((fact, index) => ({
    project_id: restrictedProjects[index],
    attribute_fact_ids: [fact.fact_id]
  })),
  facts: restrictedEligibleFacts,
  observations: restrictedEligibleFacts.map((fact, index) => ({
    observation_id: fact.observation_id,
    evidence_ids: [`evidence:ct-d-restricted-${index + 1}`]
  })),
  evidence: restrictedEligibleFacts.map((_, index) =>
    evidenceRecord(`evidence:ct-d-restricted-${index + 1}`, "restricted")
  ),
  attributeCatalog: [
    {
      attribute_id: "attribute:restricted-example",
      category: "controlled",
      normalized_label: "Ejemplo restringido"
    }
  ],
  methodology
});
assert.equal(restrictedEligibleResult.status, "insufficient");
assert.equal(restrictedEligibleResult.coverage.excludedProjects.length, 5);
assert.equal(restrictedEligibleResult.attributes[0].prevalencePercent, null);
assert.deepEqual(restrictedEligibleResult.attributes[0].originalValues, []);

// CT-C/G/I use the public 2.3 payload and the same canonical scenario project IDs.
const dataBefore = structuredClone(data);
const ctCContext = buildBenchmarkContext({
  data,
  scenarioContext: {
    comparable_project_ids: ctC.input.comparable_project_ids,
    scope_mode: "radius",
    radius_meters: 500
  }
});
assert.equal(
  ctCContext.quantitative.pricePerM2Total.status,
  ctC.expected.quantitative_state
);
assert.equal(
  ctCContext.quantitative.pricePerM2Total.orientative.status,
  ctC.expected.orientative_series_state
);
assert.deepEqual(
  coverageShape(ctCContext.quantitative.pricePerM2Total.coverage),
  ctC.expected.coverage
);

const ctGContext = buildBenchmarkContext({
  data,
  scenarioContext: { comparable_project_ids: [ctG.input.project_id] }
});
const ctGExclusion =
  ctGContext.quantitative.pricePerM2Total.coverage.excludedProjects[0];
assert.equal(ctGContext.scope.projectIds[0], ctG.input.project_id);
assert.equal(ctGContext.quantitative.pricePerM2Total.n, 0);
assert.equal(ctGExclusion.detailCode, ctG.expected.exclusion_detail_code);
assert.equal(ctGExclusion.inspectorPath, ctG.expected.inspector_path);
assert.deepEqual(ctGExclusion.reasons, [ctG.expected.exclusion_detail_source]);

const miraflores = data.geography.districts.find(
  ({ district_id: districtId }) => districtId === ctI.input.district_id
);
const mirafloresIds = [
  ...new Set(
    miraflores.quadrants.flatMap(
      ({ authoritative_project_ids: projectIds }) => projectIds
    )
  )
].sort();
const mirafloresContext = buildBenchmarkContext({
  data,
  scenarioContext: {
    comparable_project_ids: mirafloresIds,
    district_id: ctI.input.district_id,
    scope_mode: "district"
  },
  targetScenario: {
    target_price_pen: 650000,
    target_area_m2: 80,
    district: "Miraflores"
  }
});
const mirafloresPrice = mirafloresContext.quantitative.pricePerM2Total;
assert.equal(mirafloresContext.scope.projectCount, ctI.input.comparable_project_count);
assert.equal(mirafloresPrice.status, ctI.expected.eligible_quantitative_state);
assert.equal(mirafloresPrice.n, ctI.expected.eligible_quantitative_n);
assert.equal(mirafloresPrice.orientative.status, ctI.expected.orientative_series_state);
assert.equal(
  ctI.expected.orientative_series_n,
  ctI.input.project_minima_pair_unresolved_count,
  "the fixture records the raw unresolved candidate count"
);
assert.equal(
  mirafloresPrice.orientative.n,
  ctI.expected.orientative_series_n - 1,
  "Pardo Coast is one of the 69 raw candidates and must be subtracted after its blocking issue"
);
assert.deepEqual(
  {
    input: mirafloresPrice.coverage.inputProjectIds.length,
    used: mirafloresPrice.coverage.usedProjectIds.length,
    missing: mirafloresPrice.coverage.missingProjectIds.length,
    excluded: mirafloresPrice.coverage.excludedProjects.length
  },
  ctI.expected.price_partition_counts
);
assert.equal(mirafloresContext.qualitative.coverage.inputProjectIds.length, 85);
assert.equal(mirafloresContext.qualitative.coverage.usedProjectIds.length, 82);
assert.equal(mirafloresContext.targetScenario.pricePerM2.normalizedValue, 8125);
assert.deepEqual(data, dataBefore, "the context builder must not mutate public data");
const detachedContext = buildBenchmarkContext({
  data,
  scenarioContext: { comparable_project_ids: ["project:nexo-2417"] }
});
detachedContext.methodology.allowed_area_denominators.push("built");
assert.deepEqual(
  data.benchmark.methodology.allowed_area_denominators,
  ["total"],
  "returned methodology arrays must not alias the public payload"
);

for (const contractVersion of ["2.1.0", "2.2.0"]) {
  const legacyData = structuredClone(data);
  legacyData.metadata.contract_version = contractVersion;
  assert.equal(
    buildBenchmarkContext({
      data: legacyData,
      scenarioContext: { comparable_project_ids: [] }
    }).status,
    "contract_unavailable"
  );
}
for (const contractVersion of ["2.0.0", "3.0.0", null]) {
  const unsupportedData = structuredClone(data);
  unsupportedData.metadata.contract_version = contractVersion;
  assert.equal(
    buildBenchmarkContext({
      data: unsupportedData,
      scenarioContext: { comparable_project_ids: [] }
    }).status,
    "error"
  );
}
const invalidScenario = buildBenchmarkContext({
  data,
  scenarioContext: {
    comparable_project_ids: ["project:nexo-2417", "project:nexo-2417"]
  }
});
assert.equal(invalidScenario.status, "error");
assert.deepEqual(invalidScenario.errorCodes, ["INVALID_SCENARIO_COMPARABLE_IDS"]);
const malformedModelData = structuredClone(data);
malformedModelData.model = {};
assert.equal(
  buildBenchmarkContext({
    data: malformedModelData,
    scenarioContext: { comparable_project_ids: [] }
  }).status,
  "error",
  "missing model collections must fail closed"
);
const danglingObservationData = structuredClone(data);
danglingObservationData.benchmark.fact_index.find(
  ({ project_id: projectId }) => projectId === "project:nexo-2417"
).observation_id = "observation:missing";
const danglingObservationContext = buildBenchmarkContext({
  data: danglingObservationData,
  scenarioContext: { comparable_project_ids: ["project:nexo-2417"] }
});
assert.equal(danglingObservationContext.status, "error");
assert.deepEqual(danglingObservationContext.errorCodes, [
  "INVALID_BENCHMARK_REFERENCES"
]);
const foreignFactObservationData = structuredClone(data);
const foreignFactEntry = foreignFactObservationData.benchmark.fact_index.find(
  ({ project_id: projectId }) => projectId === "project:nexo-2417"
);
const foreignFact = foreignFactObservationData.model.facts.find(
  ({ fact_id: factId }) => factId === foreignFactEntry.attribute_fact_ids[0]
);
foreignFact.observation_id = foreignFactObservationData.benchmark.fact_index.find(
  ({ project_id: projectId }) => projectId === "project:nexo-1415"
).observation_id;
const foreignFactObservationContext = buildBenchmarkContext({
  data: foreignFactObservationData,
  scenarioContext: { comparable_project_ids: ["project:nexo-2417"] }
});
assert.equal(foreignFactObservationContext.status, "error");
assert.deepEqual(foreignFactObservationContext.errorCodes, [
  "INVALID_BENCHMARK_REFERENCES"
]);
const foreignEvidenceData = structuredClone(data);
const foreignEvidenceEntry = foreignEvidenceData.benchmark.fact_index.find(
  ({ project_id: projectId }) => projectId === "project:nexo-2417"
);
foreignEvidenceData.model.observations.find(
  ({ observation_id: observationId }) =>
    observationId === foreignEvidenceEntry.observation_id
).evidence_ids = ["evidence:ct-d-countertop-fragment"];
const foreignEvidenceContext = buildBenchmarkContext({
  data: foreignEvidenceData,
  scenarioContext: { comparable_project_ids: ["project:nexo-2417"] }
});
assert.equal(foreignEvidenceContext.status, "error");
assert.deepEqual(foreignEvidenceContext.errorCodes, [
  "INVALID_BENCHMARK_REFERENCES"
]);
const invalidMethodologyData = structuredClone(data);
delete invalidMethodologyData.benchmark.methodology.allowed_area_denominators;
assert.equal(
  buildBenchmarkContext({
    data: invalidMethodologyData,
    scenarioContext: { comparable_project_ids: ["project:nexo-2417"] }
  }).status,
  "error",
  "malformed benchmark policy must fail closed instead of throwing"
);
for (const requiredField of [
  "cutoff_at",
  "pairing_policy",
  "certification_label"
]) {
  const candidate = structuredClone(data);
  delete candidate.benchmark.methodology[requiredField];
  assert.equal(
    buildBenchmarkContext({
      data: candidate,
      scenarioContext: { comparable_project_ids: [] }
    }).status,
    "error",
    `methodology.${requiredField} is required`
  );
}

const comparisonInput = [
  "project:nexo-2417",
  "project:not-in-scope",
  "project:nexo-4135",
  "project:nexo-2951",
  "project:nexo-1988"
];
const contextBeforeComparison = structuredClone(mirafloresContext);
const comparison = buildComparisonModel({
  benchmarkContext: mirafloresContext,
  selectedProjectIds: comparisonInput,
  includeTargetScenario: true
});
assert.deepEqual(
  mirafloresContext,
  contextBeforeComparison,
  "the comparison builder must not mutate its benchmark context"
);
assert.equal(comparison.status, "ready");
assert.equal(comparison.groups.length, 9);
assert.equal(comparison.selected.length, 4, "three projects plus the Viva target");
assert.equal(comparison.selected.at(-1).simulated, true);
assert.deepEqual(comparison.removedProjectIds.sort(), [
  "project:nexo-1988",
  "project:not-in-scope"
]);
assert.ok(comparison.conclusion.length <= 3);
const rowIds = new Set(comparison.groups.flatMap(({ rows }) => rows.map(({ id }) => id)));
for (const finding of comparison.conclusion) {
  assert.ok(rowIds.has(finding.rowId), `${finding.id} must reference a comparison row`);
  assert.ok(finding.nextAction);
  assert.ok(finding.limitation);
}
assert.ok(
  comparison.limitations.some((text) => text.includes("no sustenta posicionamiento")),
  "the comparison must preserve the orientative-series limitation"
);

const conflictData = structuredClone(data);
const conflictEntry = conflictData.benchmark.fact_index.find(
  ({ project_id: projectId }) => projectId === "project:nexo-2417"
);
const conflictObservation = conflictData.model.observations.find(
  ({ observation_id: observationId }) =>
    observationId === conflictEntry.observation_id
);
const alternateObservationId = "observation:adversarial-same-ratio";
conflictData.model.observations.push({
  ...structuredClone(conflictObservation),
  observation_id: alternateObservationId
});
const alternateEntry = structuredClone(conflictEntry);
alternateEntry.observation_id = alternateObservationId;
for (const [field, multiplier] of [
  ["published_price_fact_id", 2],
  ["total_area_fact_id", 2],
  ["price_per_m2_fact_id", 1]
]) {
  const originalFact = conflictData.model.facts.find(
    ({ fact_id: factId }) => factId === conflictEntry[field]
  );
  const alternateFactId = `${originalFact.fact_id}-adversarial`;
  conflictData.model.facts.push({
    ...structuredClone(originalFact),
    fact_id: alternateFactId,
    observation_id: alternateObservationId,
    normalized_value: originalFact.normalized_value * multiplier
  });
  alternateEntry[field] = alternateFactId;
}
conflictData.benchmark.fact_index.push(alternateEntry);
const conflictContext = buildBenchmarkContext({
  data: conflictData,
  scenarioContext: { comparable_project_ids: ["project:nexo-2417"] }
});
assert.deepEqual(
  conflictContext.quantitative.pricePerM2Total.coverage.excludedProjects[0]
    .reasons,
  ["conflicting_observations"]
);
assert.equal(conflictContext.projectSummaries[0].pricePerM2.state, "unknown");
const conflictComparison = buildComparisonModel({
  benchmarkContext: conflictContext,
  selectedProjectIds: ["project:nexo-2417"]
});
assert.equal(
  conflictComparison.groups
    .flatMap(({ rows }) => rows)
    .find(({ id }) => id === "price.price_per_m2_total").values[0].state,
  "unknown"
);

const restrictedContextData = structuredClone(data);
const restrictedContextEntry = restrictedContextData.benchmark.fact_index.find(
  ({ project_id: projectId }) => projectId === "project:nexo-2417"
);
const restrictedContextObservation = restrictedContextData.model.observations.find(
  ({ observation_id: observationId }) =>
    observationId === restrictedContextEntry.observation_id
);
restrictedContextObservation.evidence_ids.push("evidence:adversarial-restricted");
restrictedContextData.model.evidence.push({
  evidence_id: "evidence:adversarial-restricted",
  observation_id: restrictedContextObservation.observation_id,
  availability: "available",
  publish_permission: "restricted"
});
const restrictedContext = buildBenchmarkContext({
  data: restrictedContextData,
  scenarioContext: { comparable_project_ids: ["project:nexo-2417"] }
});
assert.deepEqual(
  restrictedContext.quantitative.pricePerM2Total.coverage.excludedProjects[0]
    .reasons,
  ["restricted"]
);
assert.deepEqual(restrictedContext.projectSummaries[0].attributes, []);
assert.equal(restrictedContext.projectSummaries[0].source, null);
assert.equal(restrictedContext.projectSummaries[0].pricePerM2.state, "unknown");
const restrictedComparison = buildComparisonModel({
  benchmarkContext: restrictedContext,
  selectedProjectIds: ["project:nexo-2417"]
});
const restrictedRows = restrictedComparison.groups.flatMap(({ rows }) => rows);
assert.equal(
  restrictedRows.find(({ id }) => id === "common_areas.announced").values[0]
    .state,
  "unknown"
);
assert.equal(
  restrictedRows.find(({ id }) => id === "sources.confidence").values[0].state,
  "unknown"
);
assert.equal(
  buildComparisonModel({
    benchmarkContext: { status: "ready" },
    selectedProjectIds: ["project:any"]
  }).status,
  "error",
  "an incomplete benchmark context must not throw or render"
);

console.log(
  `Benchmark domain verified: ${mirafloresIds.length} Miraflores comparables, ` +
    `${mirafloresPrice.orientative.n} safe orientations, ` +
    `${mirafloresContext.qualitative.coverage.usedProjectIds.length} qualitative records.`
);
