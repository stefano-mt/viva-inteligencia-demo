import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { initializeScenarioData, state } from "../public/js/state.js";
import { renderActivity } from "../public/js/views/activity.js";
import { createObservedPage, openPath, viewports, withDemoBrowser } from "./helpers/demo-browser.mjs";

const data = JSON.parse(await fs.readFile(new URL("../public/demo-data/viva-platform-demo.json", import.meta.url), "utf8"));
const claimsUrl = new URL("./fixtures/commercial-claims.json", import.meta.url);
const claimsSource = await fs.readFile(claimsUrl, "utf8");
const claims = JSON.parse(claimsSource);
const requiredClaimIds = new Set(["C11", "C15", "C16", "C17", "C18", "C19", "C20", "C21", "C22", "C23"]);
assert.deepEqual(new Set(claims.claims.filter(({ id }) => requiredClaimIds.has(id)).map(({ id }) => id)), requiredClaimIds);

initializeScenarioData(data, {
  geographyArtifact: {
    status: "valid",
    geojson: { type: "FeatureCollection", features: [] },
    expected_sha256: data.geography.boundary_artifact_sha256,
    actual_sha256: data.geography.boundary_artifact_sha256,
  },
});
const html = renderActivity();
assert.match(html, /Agenda priorizada/u);
assert.ok(html.indexOf("history-agenda") < html.indexOf("history-ledger"), "La agenda debe anteceder al ledger");
assert.match(html, /Anterior → nuevo/u);
assert.match(html, /Causa no observada|causa no se presume/iu);
assert.equal((html.match(/data-history-row=/gu) ?? []).length, 5, "Las tres primeras señales y el bloque plegado conservan los cinco eventos");
assert.equal((html.match(/class="history-timeline__row /gu) ?? []).length, 5);
assert.equal(await fs.readFile(claimsUrl, "utf8"), claimsSource, "El fixture es read-only");

const evidenceDir = process.env.EVIDENCE_DIR ? path.resolve(process.env.EVIDENCE_DIR) : null;
if (evidenceDir) await fs.mkdir(evidenceDir, { recursive: true });

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const { page, problems, externalRequests } = await createObservedPage(context, baseUrl);
    await openPath(page, baseUrl, "/#activity");
    const agenda = page.locator(".history-agenda");
    await agenda.waitFor();
    const ledger = page.locator(".history-ledger");
    assert.ok((await agenda.boundingBox()).y < (await ledger.boundingBox()).y, `${viewport.name}: agenda antes del detalle`);
    assert.ok((await page.locator("[data-history-agenda-position]").count()) <= 3);
    assert.equal(await page.locator(".history-ledger > .history-timeline > [data-history-row]").count(), 5);
    const first = page.locator(".history-ledger > .history-timeline > [data-history-row]").first();
    assert.match(await first.innerText(), /Anterior[\s\S]*Nuevo[\s\S]*causa no fue observada/iu);
    await first.locator("[data-history-event]").click();
    await page.locator(".history-detail").waitFor();
    assert.match(await page.locator(".history-detail").innerText(), /Causa no observada/iu);
    if (evidenceDir) await page.screenshot({ path: path.join(evidenceDir, `p7-07-activity-${viewport.name}.png`), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 2, `${viewport.name}: overflow horizontal ${overflow}px`);
    assert.deepEqual(problems, [], `${viewport.name}: errores\n${problems.join("\n")}`);
    assert.deepEqual(externalRequests, [], `${viewport.name}: red externa`);
    await context.close();
  }
}, { port: 4211 });

assert.equal(state.historyContext.status, "ready");
console.log("Commercial activity OK: C11 agenda-first hierarchy, compact canonical rows, evidence disclosure, responsive and privacy verified.");
