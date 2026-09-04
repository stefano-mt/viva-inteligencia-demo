import assert from "node:assert/strict";
import fs from "node:fs/promises";

const data = JSON.parse(
  await fs.readFile(
    new URL("../../../data/generated/viva-platform-demo.json", import.meta.url),
    "utf8"
  )
);
const { agencies, agencyAliases, projects } = data.model;

assert.equal(agencies.length, 184, "180 market + 4 controlled agencies");
assert.equal(data.pilot.agency_ids.length, 30);
assert.equal(data.pilot.counts.base_count, 30);
assert.equal(data.pilot.counts.enriched_count, 22);
assert.equal(data.pilot.counts.deep_count, 5);

const selected = agencies.filter((agency) => agency.pilot_selected);
assert.equal(selected.length, 30);
assert.equal(
  selected.filter((agency) =>
    ["enriched", "deep"].includes(agency.coverage_tier)
  ).length,
  22
);
assert.equal(
  selected.filter((agency) => agency.coverage_tier === "deep").length,
  5
);
assert.deepEqual(
  data.pilot.agency_ids,
  [...data.pilot.agency_ids].sort(),
  "pilot agency IDs must be ordered"
);

const expectedAliasOrder = [...agencyAliases].sort(
  (left, right) =>
    left.alias_normalized.localeCompare(right.alias_normalized) ||
    left.alias_original.localeCompare(right.alias_original)
);
assert.deepEqual(
  agencyAliases,
  expectedAliasOrder,
  "aliases must be ordered by alias_normalized + alias_original"
);
assert.equal(
  new Set(agencyAliases.map((alias) => alias.alias_normalized)).size,
  agencyAliases.length
);
for (const alias of agencyAliases) {
  if (alias.resolution === "manual_review") {
    assert.equal(alias.agency_id, null);
  } else {
    assert.ok(alias.agency_id);
  }
}

const tycAliases = agencyAliases.filter((alias) =>
  ["GRUPO T&C", "GRUPO TyC"].includes(alias.alias_original)
);
assert.equal(tycAliases.length, 2);
assert.ok(
  tycAliases.every(
    (alias) =>
      alias.agency_id === "agency:grupo-tyc" &&
      alias.resolution === "rule_based"
  )
);
const tyc = agencies.find((agency) => agency.agency_id === "agency:grupo-tyc");
assert.ok(tyc?.pilot_selected);
assert.ok(
  projects.some(
    (project) =>
      project.project_id === "project:nexo-2951" &&
      project.agency_id === tyc.agency_id
  )
);

console.log(
  `Agency integration OK: ${agencies.length} canonical/control records, ${agencyAliases.length} aliases, 30/22/5 pilot.`
);
