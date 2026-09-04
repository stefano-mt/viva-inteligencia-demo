import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { initializeScenarioData, state } from "../public/js/state.js";
import { buildChecklistModel, renderChecklistModel } from "../public/js/views/checklist.js";
import { createObservedPage, openPath, viewports, withDemoBrowser } from "./helpers/demo-browser.mjs";

const data = JSON.parse(await fs.readFile(new URL("../public/demo-data/viva-platform-demo.json", import.meta.url), "utf8"));
const claimsUrl = new URL("./fixtures/commercial-claims.json", import.meta.url);
const claimsSource = await fs.readFile(claimsUrl, "utf8");
const claims = JSON.parse(claimsSource);
const requiredClaimIds = new Set(["C14", "C15", "C16", "C17", "C18", "C19", "C20", "C21", "C22", "C23"]);
assert.deepEqual(new Set(claims.claims.filter(({ id }) => requiredClaimIds.has(id)).map(({ id }) => id)), requiredClaimIds);

initializeScenarioData(data, {
  geographyArtifact: {
    status: "valid",
    geojson: { type: "FeatureCollection", features: [] },
    expected_sha256: data.geography.boundary_artifact_sha256,
    actual_sha256: data.geography.boundary_artifact_sha256,
  },
});
const model = buildChecklistModel({ data, scenarioContext: state.scenarioContext, assistantResponse: null });
const html = renderChecklistModel(model);
assert.match(html, /data-commercial-checklist-rows/u);
assert.equal((html.match(/data-checklist-requirement=/gu) ?? []).length, 3);
assert.match(html, /Condición de salida/u);
assert.match(html, /Avance bloqueado|Listo para revisión humana/u);
assert.match(html, /no genera una consulta implícita/u);
assert.ok(html.indexOf("data-commercial-checklist-rows") < html.indexOf("checklist-detail"));
assert.equal(await fs.readFile(claimsUrl, "utf8"), claimsSource, "El fixture es read-only");

const evidenceDir = process.env.EVIDENCE_DIR ? path.resolve(process.env.EVIDENCE_DIR) : null;
if (evidenceDir) await fs.mkdir(evidenceDir, { recursive: true });

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const { page, problems, externalRequests } = await createObservedPage(context, baseUrl);
    await openPath(page, baseUrl, "/#trust");
    const rows = page.locator("[data-checklist-requirement]");
    await rows.first().waitFor();
    assert.equal(await rows.count(), 3);
    assert.equal(await page.locator("[data-checklist-readiness=blocked]").count(), 1);
    assert.match(await page.locator(".checklist-close").innerText(), /no equivale|bloqueado|límite|precio real/iu);
    assert.equal(await page.locator("details.checklist-detail:not([open])").count(), 1);
    const columns = await rows.first().evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
    assert.equal(columns, viewport.name === "mobile" ? 1 : 3);
    if (evidenceDir) await page.screenshot({ path: path.join(evidenceDir, `p7-07-checklist-${viewport.name}.png`), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 2, `${viewport.name}: overflow horizontal ${overflow}px`);
    assert.deepEqual(problems, [], `${viewport.name}: errores\n${problems.join("\n")}`);
    assert.deepEqual(externalRequests, [], `${viewport.name}: red externa`);
    await context.close();
  }
}, { port: 4210 });

console.log("Commercial checklist OK: C14 exit condition, three requirement rows, progressive evidence, responsive and privacy verified.");
