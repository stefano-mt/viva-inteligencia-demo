import assert from "node:assert/strict";
import fs from "node:fs/promises";

const manifest = await read("../public/styles.css");
const shared = await read("../public/styles/50-views.css");
const projects = await read("../public/styles/62-projects.css");
const checklist = await read("../public/styles/63-checklist.css");

const imports = [...manifest.matchAll(/@import\s+url\("([^"]+)"\);/gu)].map(
  ([, href]) => href,
);
const projectsHref = "./styles/62-projects.css";
const checklistHref = "./styles/63-checklist.css";

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
  "Style ownership OK: Projects and Checklist have disjoint owners; manifest order and shared boundaries verified.",
);

async function read(relativePath) {
  return fs.readFile(new URL(relativePath, import.meta.url), "utf8");
}

function assertOwned(tokens, owner, others, label) {
  for (const token of tokens) {
    assert.ok(owner.includes(`.${token}`), `${label} debe poseer .${token}`);
    for (const other of others) {
      assert.equal(
        other.includes(`.${token}`),
        false,
        `.${token} no puede tener dos propietarios`,
      );
    }
  }
}

function count(value, token) {
  return value.split(token).length - 1;
}
