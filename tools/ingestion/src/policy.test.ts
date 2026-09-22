import assert from "node:assert/strict";
import test from "node:test";
import { evaluateSource, priceUse, type SourceCandidate } from "./policy.js";

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

test("allows a one-off technical pilot with matching Product Owner confirmation", () => {
  const result = evaluateSource(
    pilotSource(),
    "pilot_collect",
    { productOwnerAuthorizationReference: "PO-DEMO-PILOT-001" },
  );

  assert.equal(result.allowed, true);
  assert.equal(result.code, "PILOT_COLLECTION_ALLOWED");
});

test("pilot authorization never makes productive collection legal/ops-approved", () => {
  const result = evaluateSource(pilotSource(), "collect");

  assert.equal(result.allowed, false);
  assert.equal(result.code, "LEGAL_REVIEW_REQUIRED");
});

test("pilot fails closed when the per-run Product Owner confirmation is absent or mismatched", () => {
  const source = pilotSource();
  assert.equal(evaluateSource(source, "pilot_collect").code, "PILOT_AUTHORIZATION_MISMATCH");
  assert.equal(
    evaluateSource(source, "pilot_collect", { productOwnerAuthorizationReference: "PO-OTHER" }).code,
    "PILOT_AUTHORIZATION_MISMATCH",
  );
});

test("pilot fails closed without a route-level robots allow review", () => {
  const source = pilotSource();
  source.accessReview = { ...source.accessReview!, routeRobotsStatus: "deny" };

  const result = evaluateSource(source, "pilot_collect", {
    productOwnerAuthorizationReference: "PO-DEMO-PILOT-001",
  });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "ROBOTS_DENIED");
});

test("never presents website prices as closing prices", () => {
  assert.equal(priceUse("published", "listing"), "published_metric");
  assert.equal(priceUse("closing", "listing"), "review_required");
  assert.equal(priceUse("closing", "transaction"), "closing_metric");
});

function pilotSource(): SourceCandidate {
  return {
    sourceId: "agency-pilot",
    sourceClass: "official_project_website" as const,
    officialDomainConfirmed: true,
    reviewStatus: "pending" as const,
    robotsStatus: "unknown" as const,
    accessReview: {
      technicalStatus: "pass" as const,
      routeRobotsStatus: "allow" as const,
      reviewedPaths: ["/proyecto/demo/"],
    },
    pilotAuthorization: {
      reference: "PO-DEMO-PILOT-001",
      approvedAt: "2026-09-09",
      approvedByRole: "product_owner" as const,
      status: "approved" as const,
      purpose: "technical_feasibility" as const,
      allowedPaths: ["/proyecto/demo/"],
    },
  };
}
