import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { evaluateSource, type SourceCandidate } from "./policy.js";

interface CandidateTarget {
  url: string;
  resolvedUrl?: string;
  projectExternalId?: string;
  matchClass: "match_high" | "match_medium" | "match_low" | "unmatched_web";
  requiresHumanReview: boolean;
}

interface AccessReview {
  reference: string;
  reviewedAt: string;
  technicalStatus: "pass";
  legalStatus: "pending";
  operationalStatus: "pending";
  robotsUrl: string;
  robotsContentSha256: string;
  routeRobotsStatus: "allow";
  reviewedPaths: string[];
  termsReferences: string[];
  decision: "blocked_pending_review_and_authorization";
}

interface PrioritySource extends SourceCandidate {
  sourceId: string;
  url: string;
  domainVerificationStatus: string;
  automationAuthorizationStatus: string;
  policyStatus: string;
  authorizationReference?: string;
  accessReview?: AccessReview;
  candidateTargets: CandidateTarget[];
  collection: {
    allowedHosts: string[];
    extractorArchetypes: string[];
    targets: unknown[];
  };
}

interface SourceRegistry {
  registryVersion: string;
  sources: PrioritySource[];
}

interface AgencyCatalog {
  catalogVersion: string;
  scope: {
    districts: string[];
    projectCount: number;
    sourceAgencyNameCount: number;
    canonicalAgencyCountAfterAliases: number;
  };
  aliases: Array<{
    canonicalAgencyId: string;
    aliases: string[];
    combinedDemoProjectCount: number;
  }>;
  priorityAgencies: Array<{
    canonicalAgencyId: string;
    canonicalName: string;
    sourceId: string;
    automationAuthorizationStatus: string;
    targetRoutesStatus: string;
    policyStatus: string;
  }>;
}

const dataDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../data/source/ingestion",
);

async function jsonFile<T>(filename: string): Promise<T> {
  return JSON.parse(await readFile(path.join(dataDirectory, filename), "utf8")) as T;
}

test("wave 1 keeps all eight official websites fail-closed after two technical pilots", async () => {
  const registry = await jsonFile<SourceRegistry>("source-registry.json");
  const prioritySources = registry.sources.filter((source) =>
    source.policyStatus === "blocked_pending_review_and_authorization"
  );

  assert.equal(registry.registryVersion, "1.2.0");
  assert.equal(prioritySources.length, 8);
  assert.equal(new Set(prioritySources.map(({ sourceId }) => sourceId)).size, 8);

  for (const source of prioritySources) {
    assert.equal(source.sourceClass, "official_project_website");
    assert.equal(source.officialDomainConfirmed, true);
    assert.equal(source.domainVerificationStatus, "confirmed_high_confidence");
    assert.equal(source.reviewStatus, "pending");
    assert.equal(source.robotsStatus, "unknown");
    assert.equal(source.automationAuthorizationStatus, "not_registered");
    assert.equal(source.authorizationReference, undefined);
    assert.deepEqual(source.collection.targets, []);
    assert.ok(source.collection.allowedHosts.includes(new URL(source.url).hostname));
    assert.ok(source.collection.extractorArchetypes.length >= 3);
    assert.equal(evaluateSource(source, "collect").allowed, false);
  }

  const technicallyReviewed = prioritySources.filter(({ accessReview }) => accessReview !== undefined);
  assert.deepEqual(
    technicallyReviewed.map(({ sourceId }) => sourceId).sort(),
    ["cantabria-official-website", "toratto-official-website"],
  );
  assert.equal(prioritySources.filter(({ robotsStatus }) => robotsStatus === "unknown").length, 8);
  for (const source of technicallyReviewed) {
    assert.ok(source.accessReview);
    assert.equal(source.accessReview.technicalStatus, "pass");
    assert.equal(source.accessReview.legalStatus, "pending");
    assert.equal(source.accessReview.operationalStatus, "pending");
    assert.match(source.accessReview.robotsContentSha256, /^[a-f0-9]{64}$/u);
    assert.equal(source.accessReview.routeRobotsStatus, "allow");
    assert.ok(source.accessReview.reviewedPaths.length >= 2);
    assert.equal(source.accessReview.decision, "blocked_pending_review_and_authorization");
    assert.equal(evaluateSource(source, "collect").code, "LEGAL_REVIEW_REQUIRED");
  }
});

test("candidate targets preserve matching confidence without turning review cases into Nexo links", async () => {
  const registry = await jsonFile<SourceRegistry>("source-registry.json");
  const candidates = registry.sources.flatMap((source) => source.candidateTargets ?? []);
  const linkedIds = candidates.flatMap((target) => target.projectExternalId ? [target.projectExternalId] : []);

  assert.equal(candidates.length, 16);
  assert.deepEqual(
    [...linkedIds].sort(),
    ["1940", "2430", "3328", "3746", "3957", "3976", "3981", "4210"],
  );
  assert.ok(candidates
    .filter(({ matchClass }) => matchClass === "match_low" || matchClass === "unmatched_web")
    .every(({ projectExternalId, requiresHumanReview }) => projectExternalId === undefined && requiresHumanReview));

  const versia = candidates.find(({ projectExternalId }) => projectExternalId === "3981");
  assert.equal(versia?.url, "https://cantabriainmobiliaria.pe/proyecto/versia-miraflores/");
  assert.equal(versia?.resolvedUrl, "https://cantabriainmobiliaria.pe/landing-versia/");
  const monterosso = candidates.find(({ projectExternalId }) => projectExternalId === "1940");
  assert.equal(monterosso?.url, "https://www.grupotoratto.com/departamento/monterosso/");
});

test("wave 0 catalog links the eight agencies to the registry and resolves the T&C alias", async () => {
  const [registry, catalog] = await Promise.all([
    jsonFile<SourceRegistry>("source-registry.json"),
    jsonFile<AgencyCatalog>("agency-source-catalog.json"),
  ]);
  const sourceIds = new Set(registry.sources.map(({ sourceId }) => sourceId));

  assert.equal(catalog.catalogVersion, "1.0.0");
  assert.deepEqual(catalog.scope, {
    districts: [
      "Cercado de Lima",
      "Jesús María",
      "Magdalena del Mar",
      "Miraflores",
      "San Isidro",
      "San Miguel",
      "Santiago de Surco",
    ],
    projectCount: 433,
    sourceAgencyNameCount: 157,
    canonicalAgencyCountAfterAliases: 156,
  });
  assert.equal(catalog.priorityAgencies.length, 8);
  assert.equal(new Set(catalog.priorityAgencies.map(({ canonicalAgencyId }) => canonicalAgencyId)).size, 8);
  assert.equal(
    catalog.priorityAgencies.reduce((total, agency) => total + (sourceIds.has(agency.sourceId) ? 1 : 0), 0),
    8,
  );
  assert.ok(catalog.priorityAgencies.every((agency) =>
    agency.automationAuthorizationStatus === "not_registered"
    && agency.targetRoutesStatus === "not_registered"
    && agency.policyStatus === "blocked_pending_review_and_authorization"
  ));

  const grupoTyc = catalog.aliases.find(({ canonicalAgencyId }) => canonicalAgencyId === "agency:grupo-tyc");
  assert.ok(grupoTyc);
  assert.deepEqual(grupoTyc.aliases, ["GRUPO T&C", "GRUPO TyC"]);
  assert.equal(grupoTyc.combinedDemoProjectCount, 17);
});
