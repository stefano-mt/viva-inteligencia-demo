import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { normalizeAgencyName } from "../scripts/data/agencies.js";

const data = JSON.parse(
  await fs.readFile(
    new URL("../public/demo-data/viva-platform-demo.json", import.meta.url),
    "utf8"
  )
);
const model = data.model;

function ids(records, field) {
  return new Set(records.map((record) => record[field]));
}

const sourceIds = ids(model.sources, "source_id");
const agencyIds = ids(model.agencies, "agency_id");
const projectIds = ids(model.projects, "project_id");
const typologyIds = ids(model.typologies, "typology_id");
const observationIds = ids(model.observations, "observation_id");
const factIds = ids(model.facts, "fact_id");
const documentIds = ids(model.documents, "document_id");
const evidenceIds = ids(model.evidence, "evidence_id");
const eventIds = ids(model.events, "event_id");

for (const alias of model.agencyAliases) {
  assert.ok(alias.agency_id === null || agencyIds.has(alias.agency_id));
  for (const evidenceId of alias.evidence_ids) {
    assert.ok(evidenceIds.has(evidenceId));
  }
}
for (const project of model.projects) {
  assert.ok(agencyIds.has(project.agency_id), project.project_id);
}
for (const typology of model.typologies) {
  assert.ok(projectIds.has(typology.project_id), typology.typology_id);
}
const targetIds = {
  agency: agencyIds,
  project: projectIds,
  typology: typologyIds,
  document: documentIds
};
for (const observation of model.observations) {
  assert.ok(sourceIds.has(observation.source_id), observation.observation_id);
  assert.ok(
    targetIds[observation.entity_type].has(observation.entity_id),
    observation.observation_id
  );
  for (const evidenceId of observation.evidence_ids) {
    assert.ok(evidenceIds.has(evidenceId), observation.observation_id);
  }
}
for (const fact of model.facts) {
  assert.ok(observationIds.has(fact.observation_id), fact.fact_id);
  for (const inputId of fact.derivation?.input_fact_ids ?? []) {
    assert.ok(factIds.has(inputId), fact.fact_id);
  }
}
for (const document of model.documents) {
  assert.ok(sourceIds.has(document.source_id), document.document_id);
}
for (const evidence of model.evidence) {
  assert.ok(observationIds.has(evidence.observation_id), evidence.evidence_id);
  assert.ok(
    evidence.document_id === null || documentIds.has(evidence.document_id),
    evidence.evidence_id
  );
}
const issueTargets = {
  agency: agencyIds,
  project: projectIds,
  typology: typologyIds,
  observation: observationIds,
  fact: factIds,
  document: documentIds,
  event: eventIds
};
for (const issue of model.issues) {
  assert.ok(issueTargets[issue.entity_type].has(issue.entity_id), issue.issue_id);
  for (const factId of issue.fact_ids) assert.ok(factIds.has(factId));
}
for (const event of model.events) {
  assert.ok(factIds.has(event.previous_fact_id), event.event_id);
  assert.ok(factIds.has(event.new_fact_id), event.event_id);
  assert.ok(factIds.has(event.percentage_base_fact_id), event.event_id);
}

const aliasByNormalized = new Map(
  model.agencyAliases.map((alias) => [alias.alias_normalized, alias.agency_id])
);
let unresolved = 0;
for (const legacyProject of data.projects) {
  const agencyId =
    aliasByNormalized.get(normalizeAgencyName(legacyProject.agency_name)) ??
    null;
  const modelProjectId = `project:nexo-${legacyProject.id}`;
  if (agencyId === null) {
    unresolved += 1;
    assert.equal(projectIds.has(modelProjectId), false);
  } else {
    assert.ok(projectIds.has(modelProjectId), modelProjectId);
  }
}
assert.equal(unresolved, 42);
for (const controlledId of ["ct-a", "ct-b", "ct-d", "ct-e"]) {
  assert.ok(projectIds.has(`project:${controlledId}-controlled`));
}

const legacyObservedIds = new Set(
  data.projects.map((project) => `observed:nexo-${project.id}`)
);
const geographyAssignmentIds = new Set();
for (const assignment of data.geography.assignments) {
  assert.ok(legacyObservedIds.has(assignment.observed_project_id));
  assert.equal(
    geographyAssignmentIds.has(assignment.observed_project_id),
    false,
    `duplicate geography assignment ${assignment.observed_project_id}`
  );
  geographyAssignmentIds.add(assignment.observed_project_id);
  assert.ok(
    assignment.authoritative_project_id === null ||
      projectIds.has(assignment.authoritative_project_id)
  );
}
for (const district of data.geography.districts) {
  const districtAssignments = data.geography.assignments.filter(
    (assignment) => assignment.district_id === district.district_id
  );
  assert.equal(districtAssignments.length, district.observed_project_count);
  const quadrantObservedIds = district.quadrants.flatMap(
    (quadrant) => quadrant.observed_project_ids
  );
  assert.equal(
    new Set(quadrantObservedIds).size,
    district.polygon_valid_count
  );
  for (const quadrant of district.quadrants) {
    for (const observedId of quadrant.observed_project_ids) {
      assert.ok(geographyAssignmentIds.has(observedId));
    }
    for (const projectId of quadrant.authoritative_project_ids) {
      assert.ok(projectIds.has(projectId));
    }
  }
}
for (const exclusion of data.geography.exclusions) {
  assert.ok(geographyAssignmentIds.has(exclusion.project_id));
}

console.log(
  `Reference integration OK: ${model.projects.length} projects, ${unresolved} unresolved legacy aliases, ${data.geography.assignments.length} geography assignments.`
);
