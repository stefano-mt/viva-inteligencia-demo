import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const phaseDirectory = path.resolve(
  testDirectory,
  "..",
  "..",
  "..",
  ".planning",
  "phases",
  "06-commercial-narrative-qa",
);
const rehearsalDirectory = path.resolve(
  testDirectory,
  "..",
  "..",
  "..",
  "docs",
  "business",
  "human-validation",
);
const files = [
  path.join(phaseDirectory, "COMMERCIAL_REHEARSAL.md"),
  path.join(rehearsalDirectory, "README.md"),
  path.join(rehearsalDirectory, "reader-response.template.md"),
  path.join(rehearsalDirectory, "rubric.template.md"),
  path.join(rehearsalDirectory, "session-metadata.template.json"),
];
const contents = await Promise.all(files.map((file) => fs.readFile(file, "utf8")));
const packet = contents.join("\n");

assert.doesNotMatch(
  packet,
  /0167224/u,
  "El paquete no puede fijar el SHA obsoleto del ensayo anterior",
);
assert.match(packet, /git rev-parse --short=12 HEAD/u);
assert.match(packet, /git rev-parse HEAD/u);
assert.match(packet, /git status --short/u);
assert.match(packet, /run-AAAA-MM-DD-alias/u);
assert.match(packet, /no se reemplaza|no sobrescrib/iu);
assert.match(packet, /lector nuevo|lector independiente/iu);
assert.match(packet, /PENDIENTE|PENDING/u);

const protocol = contents[0];
assert.match(
  protocol,
  /> Explora la demo y prepara una recomendaci[óo]n comercial prudente para el escenario visible\. Av[íi]same cuando puedas justificarla\./u,
);
assert.match(protocol, /≤ 10:00|â‰¤ 10:00/u);
assert.match(protocol, /5\/5/u);
assert.match(protocol, /Ayudas del maker[\s\S]*`0`/u);
for (const requiredClaim of [
  /Cobertura y denominadores/u,
  /Alcance geogr[áa]fico/u,
  /Tipo 7/u,
  /Diferencia respaldada/u,
  /Movimiento y causalidad/u,
]) {
  assert.match(protocol, requiredClaim);
}
assert.equal(
  (protocol.match(/produce `FAIL`|produce FAIL/gu) ?? []).length,
  1,
  "El protocolo debe contener una única regla agrupada para los claims prohibidos",
);
assert.match(protocol, /precio real de cierre/iu);
assert.match(protocol, /causalidad/iu);
assert.match(protocol, /exhaustiva/iu);
assert.match(protocol, /no certificad/iu);
assert.match(protocol, /184[\s\S]*30\/22\/5/u);
assert.match(protocol, /Tipo 7[\s\S]*elegible/iu);

const metadata = JSON.parse(contents[4]);
assert.equal(metadata.status, "PENDING");
assert.equal(metadata.candidate_sha, null);
assert.equal(metadata.candidate_short_sha, null);
assert.equal(metadata.result, "PENDING");
for (const key of [
  "repository_origin",
  "working_tree_clean",
  "server_command",
  "url",
  "browser",
  "reader_independence_confirmed",
  "consent_for_recording",
  "maker_help_count",
]) {
  assert.ok(Object.hasOwn(metadata, key), `Falta ${key} en metadata`);
}

console.log(
  "Paquete de ensayo OK: SHA real, evidencia no destructiva y rúbrica bloqueante pendientes de ejecución humana.",
);
