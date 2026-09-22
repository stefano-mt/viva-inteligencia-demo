import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readSourceRegistry,
  runOfficialWebBatch,
  writeBatchArtifacts,
  type BatchOptions,
  type BatchFilters,
} from "./official-web-refresh.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const cli = parseArguments(process.argv.slice(2));
const registryPath = resolveFromRoot(cli.single.get("registry") ?? "data/source/ingestion/source-registry.json");
const defaultOutput = cli.pilot
  ? "data/staging/pilots/official-web-pilot.json"
  : "data/staging/official-web-refresh.json";
const outputPath = resolveFromRoot(cli.single.get("output") ?? defaultOutput);
const manifestPath = resolveFromRoot(cli.single.get("manifest") ?? `${path.relative(root, outputPath)}.manifest.json`);
assertStagingPath(outputPath, "output");
assertStagingPath(manifestPath, "manifest");
if (cli.pilot) {
  assertPilotStagingPath(outputPath, "output");
  assertPilotStagingPath(manifestPath, "manifest");
}

const filters: BatchFilters = {
  districts: cli.multi.get("district") ?? [],
  agencies: cli.multi.get("agency") ?? [],
  sourceIds: cli.multi.get("source") ?? [],
};
const registry = await readSourceRegistry(registryPath);
const batchOptions: BatchOptions = {
  registry,
  registryReference: path.relative(root, registryPath),
  dryRun: !cli.execute,
  filters,
};
if (cli.pilot) {
  batchOptions.pilot = {
    productOwnerAuthorizationReference: requiredOption(cli.single, "product-owner-authorization"),
    targetUrl: requiredOption(cli.single, "target"),
  };
}
setNumberOption(batchOptions, "concurrency", numberOption(cli.single, "concurrency"));
setNumberOption(batchOptions, "timeoutMs", numberOption(cli.single, "timeout-ms"));
setNumberOption(batchOptions, "minIntervalMs", numberOption(cli.single, "rate-limit-ms"));
setNumberOption(batchOptions, "maxResponseBytes", numberOption(cli.single, "max-bytes"));
const runId = cli.single.get("run-id");
if (runId) batchOptions.runId = runId;
const result = await runOfficialWebBatch(batchOptions);
await writeBatchArtifacts(result, outputPath, manifestPath);

process.stdout.write(`${JSON.stringify({
  mode: result.manifest.mode,
  outputPath: path.relative(root, outputPath),
  manifestPath: path.relative(root, manifestPath),
  counts: result.manifest.counts,
}, null, 2)}\n`);

interface ParsedArguments {
  execute: boolean;
  pilot: boolean;
  single: Map<string, string>;
  multi: Map<string, string[]>;
}

function parseArguments(values: string[]): ParsedArguments {
  const args = values.filter((value) => value !== "--");
  const single = new Map<string, string>();
  const multi = new Map<string, string[]>();
  let execute = false;
  let pilot = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index] ?? "";
    if (argument === "--execute") {
      execute = true;
      continue;
    }
    if (argument === "--pilot") {
      pilot = true;
      continue;
    }
    if (argument === "--dry-run") {
      execute = false;
      continue;
    }
    if (!argument.startsWith("--")) usage(`Argumento inesperado: ${argument}`);
    const key = argument.slice(2);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) usage(`Falta un valor para --${key}.`);
    index += 1;
    if (["district", "agency", "source"].includes(key)) {
      const items = value.split(",").map((item) => item.trim()).filter(Boolean);
      multi.set(key, [...(multi.get(key) ?? []), ...items]);
    } else if ([
      "registry", "output", "manifest", "concurrency", "timeout-ms", "rate-limit-ms", "max-bytes", "run-id",
      "product-owner-authorization", "target",
    ].includes(key)) {
      if (single.has(key)) usage(`--${key} solo puede declararse una vez.`);
      single.set(key, value);
    } else usage(`Opción desconocida: --${key}.`);
  }
  if (pilot && !execute) usage("--pilot requiere --execute.");
  if (!pilot && (single.has("product-owner-authorization") || single.has("target"))) {
    usage("--product-owner-authorization y --target solo se admiten con --pilot.");
  }
  return { execute, pilot, single, multi };
}

function requiredOption(values: Map<string, string>, key: string): string {
  const value = values.get(key)?.trim();
  if (!value) usage(`--pilot requiere --${key}.`);
  return value;
}

function numberOption(values: Map<string, string>, key: string): number | undefined {
  const value = values.get(key);
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isInteger(number)) usage(`--${key} debe ser un entero.`);
  return number;
}

function setNumberOption<K extends "concurrency" | "timeoutMs" | "minIntervalMs" | "maxResponseBytes">(
  options: BatchOptions,
  key: K,
  value: number | undefined,
): void {
  if (value !== undefined) options[key] = value;
}

function resolveFromRoot(value: string): string {
  return path.isAbsolute(value) ? path.resolve(value) : path.resolve(root, value);
}

function assertStagingPath(value: string, label: string): void {
  const staging = path.resolve(root, "data/staging");
  const relative = path.relative(staging, value);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`INGESTION_OUTPUT_INVALID: --${label} debe quedar dentro de data/staging.`);
  }
}

function assertPilotStagingPath(value: string, label: string): void {
  const pilotStaging = path.resolve(root, "data/staging/pilots");
  const relative = path.relative(pilotStaging, value);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`INGESTION_PILOT_OUTPUT_INVALID: --${label} debe quedar dentro de data/staging/pilots.`);
  }
}

function usage(reason: string): never {
  throw new Error(
    `INGESTION_ARGUMENT_INVALID: ${reason}\n`
    + "Uso productivo: npm run official-webs:refresh -- [--dry-run|--execute] "
    + "[--district <distrito>] [--agency <inmobiliaria>] [--source <sourceId>] "
    + "[--concurrency <1-8>] [--timeout-ms <ms>] [--rate-limit-ms <ms>] [--max-bytes <bytes>]\n"
    + "Uso piloto: --execute --pilot --source <sourceId> --target <url exacta> "
    + "--product-owner-authorization <referencia>",
  );
}
