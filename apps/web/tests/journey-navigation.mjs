import assert from "node:assert/strict";
import {
  canonicalHashForRoute,
  journeyStageFromHash,
  journeyStageHash,
  parseHashRoute,
  replaceCanonicalJourneyLocation,
  replaceHashPreservingLocation,
  viewFromHash,
} from "../public/js/navigation.js";
import {
  DEFAULT_JOURNEY_STAGE_ID,
  JOURNEY_STAGE_IDS,
} from "../public/js/journey.js";

for (const stageId of JOURNEY_STAGE_IDS) {
  const hash = `#journey/${stageId}`;
  assert.equal(journeyStageHash(stageId), hash);
  assert.equal(journeyStageFromHash(hash), stageId);
  assert.equal(canonicalHashForRoute(hash), hash);
  assert.deepEqual(parseHashRoute(hash), {
    view: "journey",
    kind: "journey-stage",
    stageId,
    caseSlug: null,
    anchorId: null,
    valid: true,
    canonicalHash: hash,
  });
}

for (const rootHash of ["", "#"]) {
  assert.deepEqual(parseHashRoute(rootHash), {
    view: "journey",
    kind: "journey-root",
    stageId: DEFAULT_JOURNEY_STAGE_ID,
    caseSlug: null,
    anchorId: null,
    valid: true,
    canonicalHash: "#journey/scale",
  });
  assert.equal(viewFromHash(rootHash), "journey");
  assert.equal(journeyStageFromHash(rootHash), "scale");
  assert.equal(canonicalHashForRoute(rootHash), "#journey/scale");
}

for (const invalidHash of [
  "#journey",
  "#journey/",
  "#journey/unknown",
  "#journey/scale/extra",
  "#journey/%E0%A4%A",
  "#journey/scale%2Fextra",
  "#journey/SCALE",
]) {
  assert.deepEqual(parseHashRoute(invalidHash), {
    view: "journey",
    kind: "journey-invalid",
    stageId: DEFAULT_JOURNEY_STAGE_ID,
    caseSlug: null,
    anchorId: null,
    valid: false,
    canonicalHash: "#journey/scale",
  });
  assert.equal(journeyStageFromHash(invalidHash), "scale");
  assert.equal(canonicalHashForRoute(invalidHash), "#journey/scale");
}

assert.equal(journeyStageHash("unknown"), null);
assert.equal(journeyStageHash(null), null);
assert.equal(journeyStageFromHash("#dashboard"), null);

assert.equal(canonicalHashForRoute("#sources"), "#market");
assert.equal(canonicalHashForRoute("#matching"), "#compare");
assert.equal(canonicalHashForRoute("#quality"), "#trust");
assert.equal(canonicalHashForRoute("#pipeline"), "#activity");
assert.equal(canonicalHashForRoute("#market/extra"), "#journey/scale");
assert.equal(canonicalHashForRoute("#inspector/case/bad/extra"), null);

const replacements = [];
assert.equal(
  replaceHashPreservingLocation("#journey/depth", {
    location: {
      pathname: "/viva-inteligencia-demo/",
      search: "?sv=1&scope=radius&lat=-12.12&lon=-77.03",
    },
    history: {
      replaceState: (_state, _title, path) => replacements.push(path),
    },
  }),
  true,
);
assert.deepEqual(replacements, [
  "/viva-inteligencia-demo/?sv=1&scope=radius&lat=-12.12&lon=-77.03#journey/depth",
]);
assert.equal(
  replaceHashPreservingLocation("journey/depth", {
    location: { pathname: "/", search: "?sv=1" },
    history: { replaceState() {} },
  }),
  false,
);

const resetReplacements = [];
assert.equal(
  replaceCanonicalJourneyLocation({
    location: {
      pathname: "/viva-inteligencia-demo/",
      search: "?sv=1&scope=radius",
    },
    history: {
      replaceState: (_state, _title, path) => resetReplacements.push(path),
    },
  }),
  true,
);
assert.deepEqual(resetReplacements, [
  "/viva-inteligencia-demo/#journey/scale",
]);
assert.equal(
  replaceCanonicalJourneyLocation({
    search: "sv=1",
    location: { pathname: "/" },
    history: { replaceState() {} },
  }),
  false,
);

console.log(
  "Journey navigation OK: raíz, seis etapas, aliases, deep-links, query, canonicalización y reset.",
);
