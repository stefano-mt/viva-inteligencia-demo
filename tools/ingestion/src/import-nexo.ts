import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { SourceCandidate } from "./policy.js";
import { assertAuthorizedNexoFeed, mergeAuthorizedNexoCsv } from "./nexo-authorized-import.js";

const root = path.resolve(import.meta.dirname, "../../..");
const argumentsMap = parseArguments(process.argv.slice(2));
const inputPath = resolveRequired(argumentsMap, "input");
const outputPath = path.resolve(root, argumentsMap.get("output") ?? "data/staging/nexo-authorized-merged.csv");
const baselinePath = path.resolve(root, argumentsMap.get("baseline") ?? "data/source/viva_minimum_dataset_latest.csv");
const registryPath = path.resolve(root, argumentsMap.get("registry") ?? "data/source/ingestion/source-registry.json");

if (outputPath === baselinePath) {
  throw new Error("NEXO_OUTPUT_INVALID: La importación debe generar staging; no puede sobrescribir la fuente canónica.");
}

const registry = JSON.parse(await readFile(registryPath, "utf8")) as { sources?: SourceCandidate[] };
const candidate = registry.sources?.find((source) => source.sourceId === "nexo-authorized-feed");
if (!candidate) throw new Error("NEXO_SOURCE_MISSING: Falta nexo-authorized-feed en el registro de fuentes.");
assertAuthorizedNexoFeed(candidate);

const [baselineText, incomingText] = await Promise.all([
  readFile(baselinePath, "utf8"),
  readFile(inputPath, "utf8"),
]);
const result = mergeAuthorizedNexoCsv(baselineText, incomingText);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, result.csv, "utf8");
await writeFile(`${outputPath}.manifest.json`, `${JSON.stringify({
  sourceId: candidate.sourceId,
  authorizationReference: candidate.authorizationReference,
  generatedAt: new Date().toISOString(),
  inputPath: path.relative(root, inputPath),
  baselinePath: path.relative(root, baselinePath),
  outputPath: path.relative(root, outputPath),
  ...result.report,
}, null, 2)}\n`, "utf8");

process.stdout.write(`${JSON.stringify({ outputPath, manifestPath: `${outputPath}.manifest.json`, ...result.report }, null, 2)}\n`);

function parseArguments(values: string[]): Map<string, string> {
  values = values.filter((value) => value !== "--");
  const result = new Map<string, string>();
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith("--") || !value) throw new Error("Uso: npm run ingestion:nexo:stage -- --input <export-autorizado.csv> [--output <staging.csv>]");
    result.set(key.slice(2), value);
  }
  return result;
}

function resolveRequired(values: Map<string, string>, key: string): string {
  const value = values.get(key);
  if (!value) throw new Error(`NEXO_ARGUMENT_REQUIRED: Falta --${key}.`);
  return path.resolve(process.cwd(), value);
}
