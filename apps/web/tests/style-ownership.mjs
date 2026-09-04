import assert from "node:assert/strict";
import fs from "node:fs/promises";

const manifest = await read("../public/styles.css");
const tokens = await read("../public/styles/00-tokens.css");
const base = await read("../public/styles/10-base.css");
const components = await read("../public/styles/30-components.css");
const shared = await read("../public/styles/50-views.css");
const projects = await read("../public/styles/62-projects.css");
const checklist = await read("../public/styles/63-checklist.css");

const imports = [...manifest.matchAll(/@import\s+url\("([^"]+)"\);/gu)].map(
  ([, href]) => href,
);
const projectsHref = "./styles/62-projects.css";
const checklistHref = "./styles/63-checklist.css";
const tokenHref = "./styles/00-tokens.css";
const baseHref = "./styles/10-base.css";
const componentHref = "./styles/30-components.css";

for (const href of [tokenHref, baseHref, componentHref]) {
  assert.equal(imports.filter((entry) => entry === href).length, 1, `${href} debe cargar exactamente una vez`);
}
assert.ok(imports.indexOf(tokenHref) < imports.indexOf(baseHref));
assert.ok(imports.indexOf(baseHref) < imports.indexOf(componentHref));
assert.ok(imports.indexOf(componentHref) < imports.indexOf("./styles/50-views.css"));

assert.equal(imports.filter((href) => href === projectsHref).length, 1);
assert.equal(imports.filter((href) => href === checklistHref).length, 1);
assert.deepEqual(
  imports.slice(-4),
  [
    "./styles/61-journey.css",
    projectsHref,
    checklistHref,
    "./styles/90-responsive.css",
  ],
  "Los propietarios de vista deben cargar una vez, después del recorrido y antes de responsive",
);

const projectTokens = [
  "catalog-layout",
  "local-controls",
  "project-card-list",
  "catalog-footer",
  "project-card",
  "project-metrics",
  "card-badges",
  "detail-panel",
  "detail-header",
  "detail-kicker",
  "detail-metrics",
  "project-inspector-entry",
  "project-inspector-action",
];
const checklistTokens = [
  "risk-list",
  "check-item",
  "next-action-card",
  "check-block",
  "workflow-step",
  "check-block-title",
  "step-label",
];

assertOwned(projectTokens, projects, [shared, checklist], "projects");
assertOwned(checklistTokens, checklist, [shared, projects], "checklist");

const phase7Primitives = [
  "workspace-heading",
  "decision-line",
  "metric-row",
  "metric-pair",
  "workspace-toolbar",
  "work-surface",
  "data-list",
  "data-row",
  "detail-disclosure",
  "next-action",
  "action-primary",
  "action-secondary",
  "action-tertiary",
];
assertOwned(phase7Primitives, components, [base, shared, projects, checklist], "phase7-components");

for (const token of [
  "--font-display",
  "--font-body",
  "--font-data",
  "--space-1",
  "--control-min-size",
  "--workspace-rail-width",
  "--workspace-topbar-height",
  "--workspace-content-max",
  "--decision-line-width",
]) {
  assert.ok(tokens.includes(`${token}:`), `${token} debe pertenecer a 00-tokens.css`);
  assert.equal(base.includes(`${token}:`), false, `${token} no puede redefinirse en base`);
  assert.equal(components.includes(`${token}:`), false, `${token} no puede redefinirse en components`);
}

for (const retainedSelector of [
  ".detail-section",
  ".chip-list",
  ".answer-panel",
  ".compare-candidate",
  ".assistant-layout",
  ".market-reading",
]) {
  assert.ok(
    shared.includes(retainedSelector),
    `${retainedSelector} debe permanecer en el bloque compartido`,
  );
}

for (const [name, css] of [
  ["00-tokens.css", tokens],
  ["10-base.css", base],
  ["30-components.css", components],
  ["50-views.css", shared],
  ["62-projects.css", projects],
  ["63-checklist.css", checklist],
]) {
  assert.equal(
    count(css, "{"),
    count(css, "}"),
    `${name} debe conservar llaves balanceadas`,
  );
}

console.log(
  "Style ownership OK: Phase 7 primitives, Projects and Checklist have disjoint owners; manifest order and shared boundaries verified.",
);

async function read(relativePath) {
  return fs.readFile(new URL(relativePath, import.meta.url), "utf8");
}

function assertOwned(tokens, owner, others, label) {
  for (const token of tokens) {
    const selector = new RegExp(`\\.${escapeRegex(token)}(?:[\\s:{>,.#\\[]|$)`, "u");
    assert.match(owner, selector, `${label} debe poseer .${token}`);
    for (const other of others) {
      assert.doesNotMatch(other, selector, `.${token} no puede tener dos propietarios`);
    }
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function count(value, token) {
  return value.split(token).length - 1;
}
