import assert from "node:assert/strict";
import test from "node:test";
import { evaluateSource, priceUse } from "./policy.js";

test("denies the Nexo public website while contractual authorization is pending", () => {
  const result = evaluateSource(
    {
      sourceId: "nexo-public-website",
      sourceClass: "public_aggregator",
      officialDomainConfirmed: true,
      reviewStatus: "blocked",
      robotsStatus: "unknown"
    },
    "collect"
  );

  assert.equal(result.allowed, false);
  assert.equal(result.code, "SOURCE_BLOCKED");
});

test("allows an official project website only with complete authorization", () => {
  const result = evaluateSource(
    {
      sourceId: "agency-example",
      sourceClass: "official_project_website",
      officialDomainConfirmed: true,
      reviewStatus: "approved",
      robotsStatus: "allow",
      authorizationReference: "LEGAL-2026-001"
    },
    "collect"
  );

  assert.equal(result.allowed, true);
  assert.equal(result.code, "COLLECTION_ALLOWED");
});

test("fails closed when robots denies relevant routes", () => {
  const result = evaluateSource(
    {
      sourceId: "agency-denied",
      sourceClass: "official_project_website",
      officialDomainConfirmed: true,
      reviewStatus: "approved",
      robotsStatus: "deny",
      authorizationReference: "LEGAL-2026-002"
    },
    "collect"
  );

  assert.equal(result.allowed, false);
  assert.equal(result.code, "ROBOTS_DENIED");
});

test("never presents website prices as closing prices", () => {
  assert.equal(priceUse("published", "listing"), "published_metric");
  assert.equal(priceUse("closing", "listing"), "review_required");
  assert.equal(priceUse("closing", "transaction"), "closing_metric");
});
