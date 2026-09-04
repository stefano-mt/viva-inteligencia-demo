import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { initializeScenarioData, state } from "../public/js/state.js";
import { renderCompare } from "../public/js/views/compare.js";
import {
  createObservedPage,
  openPath,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";

const data = JSON.parse(
  await fs.readFile(new URL("../../../data/generated/viva-platform-demo.json", import.meta.url), "utf8"),
);
const claimsUrl = new URL("./fixtures/commercial-claims.json", import.meta.url);
const claimsSource = await fs.readFile(claimsUrl, "utf8");
const claims = JSON.parse(claimsSource);
const requiredClaimIds = new Set([
  "C09", "C10", "C15", "C16", "C17", "C18", "C19", "C20", "C21", "C22", "C23",
]);
assert.deepEqual(
  new Set(claims.claims.filter(({ id }) => requiredClaimIds.has(id)).map(({ id }) => id)),
  requiredClaimIds,
  "El contrato C09–C10/C15–C23 debe permanecer completo",
);

initializeScenarioData(data, {
  geographyArtifact: {
    status: "valid",
    geojson: { type: "FeatureCollection", features: [] },
    expected_sha256: data.geography.boundary_artifact_sha256,
    actual_sha256: data.geography.boundary_artifact_sha256,
  },
});
const selectedIds = structuredClone(state.compareProjectIds);
state.compareProjectIds = [];
const emptyHtml = renderCompare();
assert.match(emptyHtml, /data-comparison-status="insufficient"/u);
assert.match(emptyHtml, /Selecciona dos proyectos para comenzar/u);
assert.match(emptyHtml, />Seleccionar proyectos</u);
assert.doesNotMatch(emptyHtml, /data-commercial-comparison-summary/u);
assert.doesNotMatch(emptyHtml, /data-comparison-row=/u);

state.compareProjectIds = selectedIds;
const readyHtml = renderCompare();
assert.match(readyHtml, /data-commercial-comparison-summary/u);
assert.match(readyHtml, /data-commercial-comparison-basis/u);
assert.match(readyHtml, /data-commercial-comparison-matrix/u);
assert.ok(
  readyHtml.indexOf("data-commercial-comparison-summary") <
    readyHtml.indexOf("data-commercial-comparison-matrix"),
  "La conclusión debe anteceder al ledger de criterios",
);
assert.ok(
  readyHtml.indexOf("comparison-decision-sheet") <
    readyHtml.indexOf("comparison-command"),
  "La conclusión debe presentarse antes del trabajo de selección",
);
assert.match(readyHtml, /Ver datos y evidencia/u);
assert.equal((readyHtml.match(/data-comparison-group=/gu) ?? []).length, 9);
assert.equal(await fs.readFile(claimsUrl, "utf8"), claimsSource, "El fixture es read-only");

const evidenceDir = process.env.EVIDENCE_DIR ? path.resolve(process.env.EVIDENCE_DIR) : null;
if (evidenceDir) await fs.mkdir(evidenceDir, { recursive: true });

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const { page, problems, externalRequests } = await createObservedPage(context, baseUrl);
    await openPath(page, baseUrl, "/#compare");
    const conclusion = page.locator("[data-commercial-comparison-summary]");
    await conclusion.waitFor();
    assert.equal(await page.locator("h1:visible").count(), 1, `${viewport.name}: un único h1 visible`);
    assert.equal(await page.locator(".comparison-shell h1").count(), 0, `${viewport.name}: sin h1 local duplicado`);
    assert.ok(
      (await conclusion.boundingBox()).y <
        (await page.locator("[data-commercial-comparison-matrix]").boundingBox()).y,
      `${viewport.name}: conclusión antes del detalle`,
    );
    assert.equal(await page.locator("details.comparison-basis:not([open])").count(), 1);
    assert.equal(await page.locator("details.comparison-group[open]").count(), 1);
    if (evidenceDir) {
      await page.screenshot({
        path: path.join(evidenceDir, `p7-06-compare-${viewport.name}.png`),
        fullPage: true,
      });
    }
    const evidence = page.locator(".comparison-cell details").first();
    await evidence.locator("summary").focus();
    await page.keyboard.press("Enter");
    assert.equal(await evidence.getAttribute("open"), "");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    assert.ok(overflow <= 2, `${viewport.name}: overflow horizontal ${overflow}px`);
    assert.deepEqual(problems, [], `${viewport.name}: errores\n${problems.join("\n")}`);
    assert.deepEqual(externalRequests, [], `${viewport.name}: red externa`);
    await context.close();
  }
}, { port: 4208 });

console.log(
  "Commercial comparison OK: C09/C10 empty and selected states, decision-first rows, evidence disclosure, responsive and privacy verified.",
);
