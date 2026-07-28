import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(projectDir, "public", "app.js");
const expectedModules = ["config.js", "controller.js", "domain.js", "navigation.js", "state.js"].map((filename) =>
  path.join(projectDir, "public", "js", filename),
);
const expectedViews = ["index.js", "dashboard.js", "projects.js", "market.js", "compare.js", "checklist.js", "assistant.js", "activity.js"].map(
  (filename) => path.join(projectDir, "public", "js", "views", filename),
);
const graph = new Map();

await visit(entry);

const cycles = [];
const visiting = new Set();
const visited = new Set();
const stack = [];
walk(entry);

assert.deepEqual(cycles, [], `El grafo de módulos contiene ciclos:\n${cycles.join("\n")}`);
for (const modulePath of [...expectedModules, ...expectedViews]) {
  assert.ok(graph.has(modulePath), `El entrypoint no alcanza ${path.relative(projectDir, modulePath)}`);
}

for (const [modulePath, dependencies] of graph) {
  if (modulePath === entry) continue;
  assert.ok(!dependencies.includes(entry), `${path.basename(modulePath)} no puede importar app.js`);
}

console.log(`Arquitectura OK: ${graph.size} módulos alcanzables, sin ciclos hacia app.js.`);

async function visit(modulePath) {
  if (graph.has(modulePath)) return;
  const source = await fs.readFile(modulePath, "utf8");
  const dependencies = [...source.matchAll(/^\s*(?:import|export)(?:[\s\S]*?\sfrom\s*)?["']([^"']+)["'];?\s*$/gm)]
    .map((match) => match[1])
    .filter((specifier) => specifier.startsWith("."))
    .map((specifier) => path.resolve(path.dirname(modulePath), specifier));
  graph.set(modulePath, dependencies);
  await Promise.all(dependencies.map(visit));
}

function walk(modulePath) {
  if (visiting.has(modulePath)) {
    const start = stack.indexOf(modulePath);
    cycles.push([...stack.slice(start), modulePath].map((item) => path.basename(item)).join(" → "));
    return;
  }
  if (visited.has(modulePath)) return;
  visiting.add(modulePath);
  stack.push(modulePath);
  for (const dependency of graph.get(modulePath) ?? []) walk(dependency);
  stack.pop();
  visiting.delete(modulePath);
  visited.add(modulePath);
}
