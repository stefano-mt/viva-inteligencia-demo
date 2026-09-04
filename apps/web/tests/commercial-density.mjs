import assert from "node:assert/strict";
import fs from "node:fs/promises";

const tokens = await read("../public/styles/00-tokens.css");
const base = await read("../public/styles/10-base.css");
const components = await read("../public/styles/30-components.css");
const manifest = await read("../public/styles.css");
const runtimeSources = await readRuntimeSources();

const expectedTokens = {
  "--font-display": '"Aptos Display", Aptos, "Segoe UI", sans-serif',
  "--font-body": 'Aptos, "Segoe UI", Arial, sans-serif',
  "--font-data": 'ui-monospace, Consolas, "Cascadia Mono", monospace',
  "--font-size-caption": "0.8125rem",
  "--font-size-meta": "0.875rem",
  "--font-size-body": "1rem",
  "--font-size-lead": "1.125rem",
  "--space-1": "0.25rem",
  "--space-2": "0.5rem",
  "--space-3": "0.75rem",
  "--space-4": "1rem",
  "--space-5": "1.5rem",
  "--space-6": "2rem",
  "--radius-control": "0.5rem",
  "--radius-surface": "0.625rem",
  "--control-min-size": "2.75rem",
  "--workspace-rail-width": "15.25rem",
  "--workspace-topbar-height": "4.25rem",
  "--workspace-content-max": "80rem",
  "--decision-line-width": "0.1875rem",
};

for (const [name, value] of Object.entries(expectedTokens)) {
  assert.match(tokens, new RegExp(`${escapeRegex(name)}:\\s*${escapeRegex(value)};`, "u"), `${name}: token ausente o distinto`);
}
assert.doesNotMatch(tokens, /Arial Narrow/u, "La familia base P7 no puede priorizar Arial Narrow");
assert.match(base, /outline:\s*3px solid var\(--focus-ring\)/u, "El foco debe usar el token compartido");

const primitives = [
  "workspace-heading",
  "workspace-heading__copy",
  "decision-line",
  "decision-line__reading",
  "decision-line__limit",
  "metric-row",
  "metric-pair",
  "workspace-toolbar",
  "workspace-toolbar__group",
  "workspace-toolbar__actions",
  "work-surface",
  "data-list",
  "data-row",
  "data-row__primary",
  "data-row__secondary",
  "detail-disclosure",
  "detail-disclosure__body",
  "next-action",
  "action-primary",
  "action-secondary",
  "action-tertiary",
];
for (const primitive of primitives) assert.match(components, new RegExp(`\\.${primitive}(?:[\\s:{>,.]|$)`, "u"), `.${primitive}: primitive ausente`);
const adoptedPrimitives = [
  "decision-line",
  "decision-line__reading",
  "decision-line__limit",
  "metric-row",
  "metric-pair",
  "workspace-toolbar",
  "work-surface",
  "data-list",
  "data-row",
  "data-row__primary",
  "data-row__secondary",
  "detail-disclosure",
  "detail-disclosure__body",
];
for (const primitive of adoptedPrimitives) {
  assert.match(
    runtimeSources,
    new RegExp(`["'\\s]${escapeRegex(primitive)}(?:[\\s"']|$)`, "u"),
    `.${primitive}: la fase integrada debe adoptar la primitive en una vista`,
  );
}

assert.match(components, /\.metric-row\s*\{[^}]*grid-template-columns:\s*repeat\(3,/su, "metric-row debe limitarse a tres columnas");
assert.match(components, /\.decision-line\s*\{[^}]*border-inline-start:\s*var\(--decision-line-width\) solid var\(--teal-bright\)/su);
assert.match(components, /\.data-row\s*\{[^}]*border-bottom:\s*1px solid var\(--line\)/su, "Las colecciones deben usar filas y reglas");
assert.match(components, /\.detail-disclosure\s*\{[^}]*border-block:\s*1px solid var\(--line\)/su);
assert.match(components, /\.action-primary\s*\{[^}]*background:\s*var\(--action\)/su);
assert.match(components, /@media \(max-width: 720px\)[\s\S]*\.metric-row,[\s\S]*\.data-row\s*\{\s*grid-template-columns:\s*1fr;/u);

const imports = [...manifest.matchAll(/@import\s+url\("([^"]+)"\);/gu)].map(([, href]) => href);
for (const href of ["./styles/00-tokens.css", "./styles/10-base.css", "./styles/30-components.css"]) {
  assert.equal(imports.filter((entry) => entry === href).length, 1, `${href}: import único`);
}
assert.ok(imports.indexOf("./styles/00-tokens.css") < imports.indexOf("./styles/10-base.css"));
assert.ok(imports.indexOf("./styles/10-base.css") < imports.indexOf("./styles/30-components.css"));

console.log("Commercial density OK: tokens y primitives preservados; decisiones, métricas, filas, toolbar y disclosures adoptados por las vistas.");

async function read(relativePath) {
  return fs.readFile(new URL(relativePath, import.meta.url), "utf8");
}

async function readRuntimeSources() {
  const viewDirectory = new URL("../public/js/views/", import.meta.url);
  const viewFiles = (await fs.readdir(viewDirectory)).filter((name) => name.endsWith(".js"));
  const sources = await Promise.all([
    read("../public/index.html"),
    read("../public/app.js"),
    ...viewFiles.map((name) => fs.readFile(new URL(name, viewDirectory), "utf8")),
  ]);
  return sources.join("\n");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
