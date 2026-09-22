import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("offline plan separates the demo catalog from the historical discovery universe", async () => {
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "plan-sources.js");
  const { stdout, stderr } = await execFileAsync(process.execPath, [script], { encoding: "utf8" });
  const plan = JSON.parse(stdout) as {
    mode: string;
    networkRequests: number;
    wave1Pilot: {
      reviewedSourceIds: string[];
      sourcesReviewed: number;
      technicallyPassed: number;
      pilotRoutesAllowed: number;
      pendingLegalReview: number;
      pendingOperationalReview: number;
      collectionEnabled: number;
      planNetworkRequests: number;
    };
    demoAgencyCatalog: {
      districts: number;
      projects: number;
      sourceAgencyNames: number;
      canonicalAgenciesAfterAliases: number;
      aliasGroups: number;
      priorityAgencies: number;
    };
    historicalAuditNote: string;
    auditedAgencyWebCandidates: number;
  };

  assert.equal(stderr, "");
  assert.equal(plan.mode, "offline-policy-plan");
  assert.equal(plan.networkRequests, 0);
  assert.deepEqual(plan.wave1Pilot, {
    reviewedSourceIds: ["cantabria-official-website", "toratto-official-website"],
    sourcesReviewed: 2,
    technicallyPassed: 2,
    pilotRoutesAllowed: 2,
    pendingLegalReview: 2,
    pendingOperationalReview: 2,
    collectionEnabled: 0,
    planNetworkRequests: 0,
  });
  assert.deepEqual(plan.demoAgencyCatalog, {
    catalogVersion: "1.0.0",
    assessedAt: "2026-09-08",
    districts: 7,
    projects: 433,
    sourceAgencyNames: 157,
    canonicalAgenciesAfterAliases: 156,
    aliasGroups: 1,
    priorityAgencies: 8,
  });
  assert.match(plan.historicalAuditNote, /universo mayor/u);
  assert.ok(plan.auditedAgencyWebCandidates > plan.demoAgencyCatalog.sourceAgencyNames);
});
