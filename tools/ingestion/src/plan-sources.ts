import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateSource, type SourceCandidate } from "./policy.js";

interface RegistrySource extends SourceCandidate {
  label: string;
  purpose: string;
  url?: string;
  accessReview?: {
    reference: string;
    reviewedAt: string;
    technicalStatus: "pass" | "blocked";
    legalStatus: string;
    operationalStatus: string;
    routeRobotsStatus: "allow" | "deny";
    reviewedPaths: string[];
  };
}

interface Registry {
  registryVersion: string;
  sources: RegistrySource[];
}

interface AgencyCatalog {
  catalogVersion: string;
  assessedAt: string;
  scope: {
    districts: string[];
    projectCount: number;
    sourceAgencyNameCount: number;
    canonicalAgencyCountAfterAliases: number;
  };
  aliases: unknown[];
  priorityAgencies: unknown[];
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index] ?? "";
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += character;
    }
  }
  values.push(current);
  return values;
}

const sourceDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../data/source"
);
const registryPath = path.join(sourceDirectory, "ingestion", "source-registry.json");
const agencyCatalogPath = path.join(sourceDirectory, "ingestion", "agency-source-catalog.json");
const matrixPath = path.join(sourceDirectory, "agency_web_discovery_matrix_validated.csv");

const registry = JSON.parse(await readFile(registryPath, "utf8")) as Registry;
const agencyCatalog = JSON.parse(await readFile(agencyCatalogPath, "utf8")) as AgencyCatalog;
const matrixLines = (await readFile(matrixPath, "utf8"))
  .split(/\r?\n/u)
  .filter((line) => line.trim().length > 0);
const headers = parseCsvLine(matrixLines[0] ?? "");
const decisionIndex = headers.indexOf("final_decision");
const decisions = new Map<string, number>();

for (const line of matrixLines.slice(1)) {
  const decision = parseCsvLine(line)[decisionIndex] || "Sin decisión";
  decisions.set(decision, (decisions.get(decision) ?? 0) + 1);
}

const sources = registry.sources.map((source) => ({
  sourceId: source.sourceId,
  label: source.label,
  purpose: source.purpose,
  collect: evaluateSource(source, "collect")
}));
const pilotReviews = registry.sources.filter((source) => source.accessReview !== undefined);

process.stdout.write(
  `${JSON.stringify(
    {
      registryVersion: registry.registryVersion,
      mode: "offline-policy-plan",
      networkRequests: 0,
      sources,
      wave1Pilot: {
        reviewedSourceIds: pilotReviews.map(({ sourceId }) => sourceId).sort(),
        sourcesReviewed: pilotReviews.length,
        technicallyPassed: pilotReviews.filter(({ accessReview }) => accessReview?.technicalStatus === "pass").length,
        pilotRoutesAllowed: pilotReviews.filter(({ accessReview }) => accessReview?.routeRobotsStatus === "allow").length,
        pendingLegalReview: pilotReviews.filter(({ accessReview }) => accessReview?.legalStatus === "pending").length,
        pendingOperationalReview: pilotReviews.filter(({ accessReview }) => accessReview?.operationalStatus === "pending").length,
        collectionEnabled: pilotReviews.filter((source) => evaluateSource(source, "collect").allowed).length,
        planNetworkRequests: 0
      },
      demoAgencyCatalog: {
        catalogVersion: agencyCatalog.catalogVersion,
        assessedAt: agencyCatalog.assessedAt,
        districts: agencyCatalog.scope.districts.length,
        projects: agencyCatalog.scope.projectCount,
        sourceAgencyNames: agencyCatalog.scope.sourceAgencyNameCount,
        canonicalAgenciesAfterAliases: agencyCatalog.scope.canonicalAgencyCountAfterAliases,
        aliasGroups: agencyCatalog.aliases.length,
        priorityAgencies: agencyCatalog.priorityAgencies.length
      },
      historicalAuditNote: "La matriz histórica cubre un universo mayor que los siete distritos de la demo.",
      auditedAgencyWebCandidates: matrixLines.length - 1,
      candidateDecisions: Object.fromEntries([...decisions.entries()].sort(([a], [b]) => a.localeCompare(b)))
    },
    null,
    2
  )}\n`
);
