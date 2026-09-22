import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  nexoProjectsFromCsv,
  reconcileOfficialWebObservations,
} from "./reconcile-observations.js";
import {
  buildTechnicalPilotReport,
  parseTechnicalPilotArtifacts,
  parseTechnicalPilotDefinition,
} from "./technical-pilot-report.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

if (isMainModule()) await runCli();

async function runCli(): Promise<void> {
  const args = parseArguments(process.argv.slice(2));
  const registryPath = resolveFromRoot(args.get("registry")
    ?? "data/source/ingestion/pilots/wave-1-demo-feasibility.json");
  const manifestPath = resolveFromRoot(required(args, "manifest"));
  const stagingPath = resolveFromRoot(required(args, "staging"));
  const nexoPath = resolveFromRoot(args.get("nexo") ?? "data/source/viva_minimum_dataset_latest.csv");
  const outputPath = resolveFromRoot(required(args, "output"));
  assertPilotOutput(outputPath);

  const [registryRaw, stagingRaw, manifestRaw, nexoRaw] = await Promise.all([
    readFile(registryPath, "utf8"),
    readFile(stagingPath, "utf8"),
    readFile(manifestPath, "utf8"),
    readFile(nexoPath, "utf8"),
  ]);
  const definition = parseTechnicalPilotDefinition(registryRaw);
  const { staging, manifest } = parseTechnicalPilotArtifacts(definition, stagingRaw, manifestRaw);
  const reconciliation = reconcileOfficialWebObservations(
    nexoProjectsFromCsv(nexoRaw),
    staging.sourceObservations.flatMap((group) => group.observations),
    {
      sourceRunId: staging.runId,
      generatedAt: staging.generatedAt,
      sourceManifestReference: path.relative(root, manifestPath).replaceAll("\\", "/"),
    },
  );
  const report = buildTechnicalPilotReport(definition, manifest, reconciliation);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    outputPath: path.relative(root, outputPath).replaceAll("\\", "/"),
    sourceId: report.sourceId,
    projectExternalId: report.projectExternalId,
    result: report.result,
    publishable: report.publishable,
    sha256: report.sha256,
  }, null, 2)}\n`);
}

function parseArguments(values: string[]): Map<string, string> {
  const result = new Map<string, string>();
  const args = values.filter((value) => value !== "--");
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index] ?? "";
    const value = args[index + 1];
    if (!key.startsWith("--") || !value || value.startsWith("--")) usage(`Argumento inválido: ${key}.`);
    const normalized = key.slice(2);
    if (!["registry", "staging", "manifest", "nexo", "output"].includes(normalized) || result.has(normalized)) {
      usage(`Opción desconocida o repetida: ${key}.`);
    }
    result.set(normalized, value);
    index += 1;
  }
  return result;
}

function required(values: Map<string, string>, key: string): string {
  const value = values.get(key)?.trim();
  if (!value) usage(`Falta --${key}.`);
  return value;
}

function assertPilotOutput(value: string): void {
  const allowedRoot = path.resolve(root, "data/staging/pilots");
  const relative = path.relative(allowedRoot, value);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || path.extname(value) !== ".json") {
    throw new Error("TECHNICAL_PILOT_REPORT_OUTPUT_INVALID: --output debe ser JSON dentro de data/staging/pilots.");
  }
}

function resolveFromRoot(value: string): string {
  return path.isAbsolute(value) ? path.resolve(value) : path.resolve(root, value);
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  return Boolean(entry) && path.resolve(entry!) === path.resolve(fileURLToPath(import.meta.url));
}

function usage(reason: string): never {
  throw new Error(
    `TECHNICAL_PILOT_REPORT_ARGUMENT_INVALID: ${reason}\n`
    + "Uso: report-technical-pilot --staging <archivo> --manifest <archivo> --output <archivo> "
    + "[--registry <registro-piloto>] [--nexo <csv>]",
  );
}
