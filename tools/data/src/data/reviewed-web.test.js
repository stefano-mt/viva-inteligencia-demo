import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseCsv } from "./agencies.js";
import { applyReviewedWebObservations } from "./reviewed-web.js";

const sourceDirectory = new URL("../../../../data/source/", import.meta.url);
const originalReview = JSON.parse(readFileSync(new URL("demo-pilot/reviewed-web-comparisons.json", sourceDirectory), "utf8"));
const historicalRows = parseCsv(readFileSync(new URL("webs_propias_sample_dataset.csv", sourceDirectory), "utf8"));
const historicalMatches = parseCsv(readFileSync(new URL("nexo_web_project_match.csv", sourceDirectory), "utf8"));
const list = (value) => value ? value.split("|").map((item) => item.trim()).filter(Boolean) : [];

function fixture() {
  // Use the actual edition and source identities, retaining only publishable fields.
  const observations = historicalRows.map((row, index) => ({
    observation_id: `web-observation:${String(index + 1).padStart(4, "0")}`,
    run_id: row.run_id,
    captured_at: row.captured_at,
    source_url: row.source_url,
    project_name: row.project_name,
    address: row.address,
    typology: row.typology,
    bedrooms: row.bedrooms || null,
    total_area: row.total_area || null,
    unit_status: row.unit_status || null,
    unit_count: row.unit_count ? Number(row.unit_count) : null,
    list_price_avg: row.list_price_avg ? Number(row.list_price_avg) : null,
    currency: row.currency || "unknown",
    delivery_date: row.delivery_date || null,
    delivery_year: row.delivery_year ? Number(row.delivery_year) : null,
    description: row.description || null,
    amenities: list(row.amenities),
    financing_banks: list(row.financing_banks),
  }));
  const matches = historicalMatches.map((row) => ({
    nexo_project_id: row.nexo_project_id,
    web_project_url: row.web_project_url,
    domain: row.domain,
    match_class: row.match_class,
    requires_human_review: row.requires_human_review === "true",
  }));
  return { observations, matches, review: structuredClone(originalReview) };
}

function apply(input) {
  return applyReviewedWebObservations(input.observations, input.matches, input.review);
}

test("the reviewed edition is deterministic, complete and does not mutate any inputs", () => {
  const input = fixture();
  const before = structuredClone(input);
  const first = apply(input);
  assert.deepEqual(first, apply(input));
  assert.deepEqual(input, before);
  const reviewed = first.observations.filter((row) => row.review);
  assert.equal(reviewed.length, 9);
  assert.equal(new Set(input.review.entries.map((entry) => entry.projectId)).size, 8);
  assert.equal(reviewed.filter((row) => row.review.status === "demo_reviewed").length, 2);
  const toratto = reviewed.find((row) => row.project_name === "MONTEROSSO");
  toratto.amenities.push("Mutated output only");
  toratto.review.notes.push("Mutated output only");
  toratto.review.withheldFields.push("Mutated output only");
  assert.deepEqual(input, before);
});

test("unrelated observations and matches remain unchanged", () => {
  const input = fixture();
  const result = apply(input);
  const reviewedUrls = new Set(input.review.entries.map((entry) => entry.originalUrl));
  input.observations.forEach((row, index) => {
    if (!reviewedUrls.has(row.source_url)) assert.deepEqual(result.observations[index], row);
  });
  input.matches.forEach((row, index) => {
    if (!reviewedUrls.has(row.web_project_url)) assert.deepEqual(result.matches[index], row);
  });
});

test("September observations clear historical fields instead of silently combining captures", () => {
  const input = fixture();
  const versia = input.observations.find((row) => row.source_url.includes("versia-miraflores"));
  Object.assign(versia, { bedrooms_min: 1, bedrooms_max: 1, amenities: ["Old amenity"], unit_count: 91, list_price_avg: 999000, currency: "PEN" });
  const result = apply(input);
  const updated = result.observations.find((row) => row.source_url === "https://cantabriainmobiliaria.pe/landing-versia/");
  assert.equal(updated.captured_at, "2026-09-09T06:20:45.077Z");
  assert.equal(updated.address, "Ca. Enrique Palacios 830, Miraflores");
  assert.equal(updated.total_area_min, 60);
  assert.equal(updated.total_area_max, 98);
  assert.equal(updated.room_description, "2 y 3 ambs");
  assert.equal(updated.bedrooms, null);
  assert.equal(updated.bedrooms_min, null);
  assert.equal(updated.bedrooms_max, null);
  assert.equal(updated.amenities, null);
  assert.equal(updated.unit_count, null);
  assert.equal(updated.list_price_avg, null);
  assert.equal(updated.currency, null);
  const monterosso = result.observations.find((row) => row.project_name === "MONTEROSSO");
  assert.equal(monterosso.unit_count, null);
  assert.equal(monterosso.bedrooms, "Hasta 2 dormitorios");
  assert.equal(monterosso.unit_status, null);
  assert.equal(monterosso.total_area_min, 69.56);
  assert.equal(monterosso.total_area_max, 69.88);
  assert.deepEqual(monterosso.amenities, ["Estacionamientos para bicicletas", "Lobby", "Terraza", "Área de parrilla"]);
});

test("both PARQUE NU unit sources survive separately without becoming a project range", () => {
  const result = apply(fixture());
  const matches = result.matches.filter((match) => match.nexo_project_id === "4157" && match.match_class === "match_high");
  assert.equal(matches.length, 2);
  const units = matches.map((match) => result.observations.find((row) => row.source_url === match.web_project_url));
  assert.equal(new Set(units.map((row) => row.source_url)).size, 2);
  assert.deepEqual(units.map((row) => row.total_area), ["245.47 m²", "130.83 m²"]);
  for (const row of units) {
    assert.equal(row.scope, "unit");
    assert.equal(row.total_area_min, undefined);
    assert.equal(row.total_area_max, undefined);
    assert.equal(row.unit_status, null);
  }
});

test("the reviewed source identity follows the official URL, not the old matching domain", () => {
  const result = apply(fixture());
  for (const entry of originalReview.entries) {
    const match = result.matches.find((row) => row.nexo_project_id === entry.projectId && row.web_project_url === (entry.sourceUrl ?? entry.originalUrl));
    assert.equal(match.domain, new URL(entry.sourceUrl ?? entry.originalUrl).hostname.replace(/^www\./u, ""));
  }
});

for (const [name, alter, pattern] of [
  ["unknown project", (input) => { input.review.entries[0].projectId = "9999"; }, /Invalid reviewed-web entry/u],
  ["unknown original URL", (input) => { input.review.entries[0].originalUrl += "/unreviewed"; }, /Invalid reviewed-web entry/u],
  ["unknown field", (input) => { input.review.entries[0].fields.unreviewed_value = "No"; }, /Unexpected reviewed-web field/u],
  ["unknown withheld field", (input) => { input.review.entries[0].withheldFields.push("unreviewed_value"); }, /Unexpected withheld field/u],
  ["wrong source host", (input) => { input.review.entries[0].sourceUrl = "https://unreviewed.example/landing-versia/"; }, /official HTTPS host/u],
  ["unreviewed path on the same host", (input) => { input.review.entries[0].sourceUrl = "https://cantabriainmobiliaria.pe/another-project/"; }, /official HTTPS host/u],
  ["duplicate entry", (input) => { input.review.entries.push(structuredClone(input.review.entries[0])); }, /Invalid reviewed-web entry/u],
  ["partial project coverage", (input) => { input.review.entries.pop(); }, /Incomplete reviewed-web coverage/u],
  ["missing review fields", (input) => { delete input.review.entries[0].fields; }, /Invalid reviewed-web entry/u],
  ["array instead of fields", (input) => { input.review.entries[0].fields = []; }, /Invalid reviewed-web entry/u],
  ["missing evidence hash", (input) => { delete input.review.entries[0].evidenceSha256; }, /Invalid reviewed-web entry/u],
  ["wrong scope", (input) => { input.review.entries[0].scope = "unit"; }, /Invalid reviewed-web entry/u],
  ["unauthorized historical promotion", (input) => { input.review.entries[2].status = "demo_reviewed"; }, /Invalid reviewed-web entry/u],
  ["missing capture date", (input) => { delete input.review.entries[0].capturedAt; }, /Missing capture date/u],
  ["capture after review", (input) => { input.review.entries[0].capturedAt = "2099-01-01T00:00:00Z"; }, /Missing capture date/u],
  ["unconfirmed price", (input) => { input.review.entries[0].fields.list_price_avg = 450000; }, /does not establish website prices/u],
  ["unconfirmed stock", (input) => { input.review.entries[0].fields.unit_count = 20; }, /does not establish website prices/u],
  ["currency without a price", (input) => { input.review.entries[0].fields.currency = "PEN"; }, /does not establish website prices/u],
  ["non-finite area", (input) => { input.review.entries[0].fields.total_area_min = Infinity; }, /Invalid reviewed-web numeric field/u],
  ["inverted area range", (input) => { input.review.entries[0].fields.total_area_min = 99; }, /Inverted reviewed-web range/u],
  ["invalid amenities shape", (input) => { input.review.entries[0].fields.amenities = "pool"; }, /Invalid reviewed-web list field/u],
  ["missing original observation", (input) => { input.observations = input.observations.filter((row) => row.source_url !== input.review.entries[0].originalUrl); }, /original observation not found/u],
  ["match requires human review", (input) => { input.matches.filter((row) => row.web_project_url === input.review.entries[0].originalUrl).forEach((row) => { row.requires_human_review = true; }); }, /project match not found/u],
  ["unreviewed historical price", (input) => { input.observations.find((row) => row.source_url === input.review.entries[2].originalUrl).list_price_avg = 450000; }, /does not establish website prices/u],
]) {
  test(`fails closed for ${name}`, () => {
    const input = fixture();
    alter(input);
    const before = structuredClone(input);
    assert.throws(() => apply(input), pattern);
    assert.deepEqual(input, before, "a rejected edition must not mutate its source inputs");
  });
}

for (const [name, alter] of [
  ["absent review", (input) => { input.review = undefined; }],
  ["null review", (input) => { input.review = null; }],
  ["wrong policy", (input) => { input.review.policy = "technical-pilot"; }],
  ["production authorization", (input) => { input.review.productionCollectionAuthorized = true; }],
  ["missing authorization", (input) => { delete input.review.authorizationReference; }],
  ["missing review date", (input) => { delete input.review.reviewedAt; }],
  ["invalid review date", (input) => { input.review.reviewedAt = "not-a-date"; }],
]) {
  test(`rejects ${name}`, () => {
    const input = fixture();
    alter(input);
    assert.throws(() => apply(input), /Invalid reviewed-web demo policy/u);
  });
}

test("missing input arrays fail closed", () => {
  const input = fixture();
  assert.throws(() => applyReviewedWebObservations(null, input.matches, input.review), /Missing reviewed-web input data/u);
  assert.throws(() => applyReviewedWebObservations(input.observations, null, input.review), /Missing reviewed-web input data/u);
});
