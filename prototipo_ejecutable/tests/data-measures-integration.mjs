import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { aggregateCertifiedMean } from "../scripts/data/measures.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, "../..");
const readJson = async (relativePath) =>
  JSON.parse(await fs.readFile(path.join(repositoryRoot, relativePath), "utf8"));
const data = await readJson(
  "prototipo_ejecutable/public/demo-data/viva-platform-demo.json"
);

for (const collection of ["typologies", "facts", "issues", "events"]) {
  assert.deepEqual(
    data.model[collection],
    await readJson(`datos_relevantes/demo-pilot/${collection}.json`),
    `${collection} must remain the P1-05 catalog`
  );
}

const facts = new Map(data.model.facts.map((fact) => [fact.fact_id, fact]));
assert.equal(facts.get("fact:ct-a-free-area").normalized_value, 108);
assert.equal(
  facts.get("fact:ct-a-price-per-built-m2").normalized_value,
  10000
);
assert.equal(
  facts.get("fact:ct-a-price-per-total-m2").normalized_value,
  4757.28
);
assert.equal(
  facts.get("fact:ct-a-price-per-built-m2").denominator_area_type,
  "built"
);
assert.equal(
  facts.get("fact:ct-a-price-per-total-m2").denominator_area_type,
  "total"
);
assert.equal(
  facts.get("fact:ct-a-price-per-built-m2").benchmark_eligible,
  false
);

assert.equal(facts.get("fact:pardo-coast-card-area").normalized_value, 104.15);
assert.equal(facts.get("fact:pardo-coast-card-area").area_type, "unknown");
assert.equal(facts.get("fact:pardo-coast-plan-area").normalized_value, 53.37);
assert.equal(facts.get("fact:pardo-coast-plan-area").area_type, "total");
assert.equal(facts.get("fact:pardo-coast-area-delta").normalized_value, 50.78);
assert.equal(
  facts.get("fact:pardo-coast-area-delta-percent").normalized_value,
  48.76
);

for (const aggregate of data.executive.certified_aggregates) {
  const members = data.model.facts.filter(
    (fact) =>
      fact.benchmark_eligible === true &&
      fact.quality_status === "certified" &&
      typeof fact.normalized_value === "number" &&
      fact.semantic_type === aggregate.semantic_type &&
      fact.unit === aggregate.unit &&
      fact.currency === aggregate.currency &&
      fact.price_type === aggregate.price_type &&
      fact.area_type === aggregate.area_type &&
      fact.denominator_area_type === aggregate.denominator_area_type
  );
  assert.equal(members.length, aggregate.count);
  assert.ok(members.every((fact) => fact.value_kind !== "simulated"));
}

const pricePerM2Groups = Map.groupBy
  ? Map.groupBy(
      data.model.facts.filter(
        (fact) =>
          fact.semantic_type === "price_per_m2" &&
          fact.benchmark_eligible === true
      ),
      (fact) =>
        `${fact.currency}|${fact.price_type}|${fact.denominator_area_type}`
    )
  : new Map();
for (const group of pricePerM2Groups.values()) {
  assert.equal(aggregateCertifiedMean(group).status, "certified");
}

const event = data.model.events.find(
  (record) => record.event_id === "event:ct-e-normal-change"
);
assert.equal(event.delta, 30000);
assert.equal(event.percentage, 5);
assert.equal(event.cause, null);

console.log(
  `Measures integration OK: ${data.model.facts.length} facts, ${data.model.issues.length} issues, ${data.model.events.length} events.`
);
